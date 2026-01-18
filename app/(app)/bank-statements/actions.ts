"use server"

import { ActionState } from "@/lib/actions"
import { getCurrentUser } from "@/lib/auth"
import { parseJsonField } from "@/lib/db-compat"
import {
  getUserUploadsDirectory,
  isEnoughStorageToUploadFile,
  safePathJoin,
} from "@/lib/files"
import {
  createBankStatement,
  deleteBankStatement,
  getBankStatementById,
  getBankStatements,
  storeExtractedData,
  updateBankStatement,
  updateBankStatementStatus,
  type BankStatementStatus,
} from "@/models/bank-statements"
import { getLLMSettings, getSettings } from "@/models/settings"
import { parseCSV } from "@/lib/parsers/csv-parser"
import { parsePDF, validateLLMSettings } from "@/lib/parsers/pdf-parser"
import { markDuplicates } from "@/lib/bank-statement-utils"
import { BankStatement } from "@/prisma/client"
import { CSVColumnMapping, ExtractedData, ExtractedTransaction } from "@/lib/parsers/types"
import { prisma } from "@/lib/db"
import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { revalidatePath } from "next/cache"

// File-like interface for form data uploads
interface UploadedFile {
  name: string
  size: number
  type: string
  arrayBuffer(): Promise<ArrayBuffer>
}

// ============================================================================
// Types
// ============================================================================

export interface UploadBankStatementResult {
  statementId: string
  status: BankStatementStatus
}

export interface GetBankStatementStatusResult {
  status: BankStatementStatus
  progress?: number
  transactionCount?: number
  errorMessage?: string
}

export interface ImportResult {
  importedCount: number
  skippedDuplicates: number
  transactionIds: string[]
}

// ============================================================================
// Upload & Processing Actions
// ============================================================================

/**
 * Upload a bank statement file and start processing.
 */
export async function uploadBankStatement(
  formData: FormData
): Promise<ActionState<UploadBankStatementResult>> {
  const user = await getCurrentUser()

  const file = formData.get("file") as UploadedFile
  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
    return { success: false, error: "No file provided" }
  }

  // Validate file type
  const validMimeTypes = ["application/pdf", "text/csv", "text/plain"]
  const isCSV = file.name.endsWith(".csv")
  if (!validMimeTypes.includes(file.type) && !isCSV) {
    return {
      success: false,
      error: "Invalid file type. Please upload a PDF or CSV file.",
    }
  }

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return {
      success: false,
      error: "File too large. Maximum size is 10MB.",
    }
  }

  // Check storage limits
  if (!isEnoughStorageToUploadFile(user, file.size)) {
    return { success: false, error: "Insufficient storage to upload this file" }
  }

  try {
    // Save file to disk
    const userUploadsDirectory = getUserUploadsDirectory(user)
    const fileUuid = randomUUID()
    const relativeFilePath = `bank-statements/${fileUuid}/${file.name}`
    const fullFilePath = safePathJoin(userUploadsDirectory, relativeFilePath)

    await mkdir(path.dirname(fullFilePath), { recursive: true })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    await writeFile(fullFilePath, buffer)

    // Determine mimetype
    const mimetype = file.type || (isCSV ? "text/csv" : "application/pdf")

    // Create bank statement record
    const statement = await createBankStatement(user.id, {
      filename: file.name,
      path: fullFilePath,
      mimetype,
      fileSize: file.size,
    })

    // Start async processing (don't await)
    processBankStatement(statement.id, user.id).catch((err) => {
      console.error("Background processing error:", err)
    })

    revalidatePath("/bank-statements")

    return {
      success: true,
      data: {
        statementId: statement.id,
        status: "processing",
      },
    }
  } catch (error) {
    console.error("Upload error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload file",
    }
  }
}

/**
 * Process a bank statement in the background.
 * Parses the file and extracts transactions.
 */
async function processBankStatement(statementId: string, userId: string): Promise<void> {
  try {
    // Update status to processing
    await updateBankStatementStatus(statementId, userId, "processing")

    const statement = await getBankStatementById(statementId, userId)
    if (!statement) {
      throw new Error("Statement not found")
    }

    // Get user for PDF preview generation
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new Error("User not found")
    }

    // Get user settings for default currency
    const settings = await getSettings(userId)
    const defaultCurrency = settings.default_currency || "EUR"

    let result
    if (statement.mimetype === "text/csv" || statement.path.endsWith(".csv")) {
      // Parse CSV with user's default currency
      result = await parseCSV(statement.path, undefined, defaultCurrency)
    } else {
      // Parse PDF with LLM
      const llmSettings = getLLMSettings(settings)

      const validation = await validateLLMSettings(llmSettings)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      result = await parsePDF(user, statement.path, llmSettings, defaultCurrency)
    }

    if (!result.success || !result.data) {
      throw new Error(result.error || "Parsing failed")
    }

    // Mark duplicates
    const transactionsWithDuplicates = await markDuplicates(userId, result.data.transactions)
    result.data.transactions = transactionsWithDuplicates
    result.data.summary.transactionCount = transactionsWithDuplicates.length

    // Update bank metadata if available (added by PDF parser)
    type ExtractedDataWithMetadata = ExtractedData & {
      metadata?: {
        bankName?: string
        accountNumber?: string
        periodStart?: string
        periodEnd?: string
      }
    }
    const metadata = (result.data as ExtractedDataWithMetadata).metadata
    if (metadata) {
      await updateBankStatement(statementId, userId, {
        bankName: metadata.bankName,
        accountNumber: metadata.accountNumber,
        periodStart: metadata.periodStart ? new Date(metadata.periodStart) : null,
        periodEnd: metadata.periodEnd ? new Date(metadata.periodEnd) : null,
      })
    }

    // Store extracted data
    await storeExtractedData(
      statementId,
      userId,
      result.data,
      result.data.transactions.length
    )
  } catch (error) {
    console.error("Processing error:", error)
    await updateBankStatementStatus(
      statementId,
      userId,
      "failed",
      error instanceof Error ? error.message : "Processing failed"
    )
  }
}

/**
 * Get the processing status of a bank statement.
 */
export async function getBankStatementStatus(
  statementId: string
): Promise<ActionState<GetBankStatementStatusResult>> {
  const user = await getCurrentUser()

  const statement = await getBankStatementById(statementId, user.id)
  if (!statement) {
    return { success: false, error: "Statement not found" }
  }

  return {
    success: true,
    data: {
      status: statement.status as BankStatementStatus,
      transactionCount: statement.transactionCount,
      errorMessage: statement.errorMessage || undefined,
    },
  }
}

// ============================================================================
// Transaction Preview Actions
// ============================================================================

/**
 * Get extracted transactions for preview/editing.
 */
export async function getExtractedTransactions(
  statementId: string
): Promise<ActionState<ExtractedData>> {
  const user = await getCurrentUser()

  const statement = await getBankStatementById(statementId, user.id)
  if (!statement) {
    return { success: false, error: "Statement not found" }
  }

  if (!statement.extractedData) {
    return { success: false, error: "No extracted data available" }
  }

  const extractedData = parseJsonField<ExtractedData | null>(statement.extractedData, null)
  if (!extractedData) {
    return { success: false, error: "Failed to parse extracted data" }
  }

  return { success: true, data: extractedData }
}

/**
 * Update a single extracted transaction during preview.
 */
export async function updateExtractedTransaction(
  statementId: string,
  transactionId: string,
  updates: Partial<ExtractedTransaction>
): Promise<ActionState<ExtractedTransaction>> {
  const user = await getCurrentUser()

  const statement = await getBankStatementById(statementId, user.id)
  if (!statement || !statement.extractedData) {
    return { success: false, error: "Statement not found" }
  }

  const extractedData = parseJsonField<ExtractedData | null>(statement.extractedData, null)
  if (!extractedData) {
    return { success: false, error: "Failed to parse extracted data" }
  }

  const txIndex = extractedData.transactions.findIndex((t) => t.id === transactionId)
  if (txIndex === -1) {
    return { success: false, error: "Transaction not found" }
  }

  // Update the transaction
  const updatedTx = {
    ...extractedData.transactions[txIndex],
    ...updates,
    edited: true,
  }
  extractedData.transactions[txIndex] = updatedTx

  // Recalculate summary
  extractedData.summary = {
    ...extractedData.summary,
    totalDebits: extractedData.transactions
      .filter((t) => t.type === "debit")
      .reduce((sum, t) => sum + t.amount, 0),
    totalCredits: extractedData.transactions
      .filter((t) => t.type === "credit")
      .reduce((sum, t) => sum + t.amount, 0),
  }
  extractedData.summary.netAmount =
    extractedData.summary.totalCredits - extractedData.summary.totalDebits

  // Save updated data
  await updateBankStatement(statementId, user.id, { extractedData })

  return { success: true, data: updatedTx }
}

/**
 * Set column mapping for CSV and re-parse.
 */
export async function mapCSVColumns(
  statementId: string,
  mapping: CSVColumnMapping
): Promise<ActionState<{ transactionCount: number }>> {
  const user = await getCurrentUser()

  const statement = await getBankStatementById(statementId, user.id)
  if (!statement) {
    return { success: false, error: "Statement not found" }
  }

  if (statement.mimetype !== "text/csv" && !statement.path.endsWith(".csv")) {
    return { success: false, error: "Column mapping only applies to CSV files" }
  }

  // Get user's default currency from settings
  const settings = await getSettings(user.id)
  const defaultCurrency = settings.default_currency || "EUR"

  // Re-parse with new mapping and user's default currency
  const result = await parseCSV(statement.path, mapping, defaultCurrency)
  if (!result.success || !result.data) {
    return { success: false, error: result.error || "Parsing failed" }
  }

  // Mark duplicates
  const transactionsWithDuplicates = await markDuplicates(user.id, result.data.transactions)
  result.data.transactions = transactionsWithDuplicates

  // Store updated data
  await storeExtractedData(statementId, user.id, result.data, result.data.transactions.length)

  return { success: true, data: { transactionCount: result.data.transactions.length } }
}

// ============================================================================
// Import Actions
// ============================================================================

/**
 * Import selected transactions into the main transaction system.
 */
export async function importBankTransactions(
  statementId: string,
  transactionIds?: string[],
  options?: {
    skipDuplicates?: boolean
    defaultCategory?: string
    defaultProject?: string
  }
): Promise<ActionState<ImportResult>> {
  const user = await getCurrentUser()

  const statement = await getBankStatementById(statementId, user.id)
  if (!statement || !statement.extractedData) {
    return { success: false, error: "Statement not found or not processed" }
  }

  const extractedData = parseJsonField<ExtractedData | null>(statement.extractedData, null)
  if (!extractedData) {
    return { success: false, error: "Failed to parse extracted data" }
  }

  // Filter transactions to import
  let toImport = extractedData.transactions.filter((t) => t.selected)
  if (transactionIds && transactionIds.length > 0) {
    toImport = toImport.filter((t) => transactionIds.includes(t.id))
  }

  const skipDuplicates = options?.skipDuplicates ?? true
  let skippedDuplicates = 0

  if (skipDuplicates) {
    const duplicates = toImport.filter((t) => t.isDuplicate)
    skippedDuplicates = duplicates.length
    toImport = toImport.filter((t) => !t.isDuplicate)
  }

  if (toImport.length === 0) {
    return {
      success: true,
      data: {
        importedCount: 0,
        skippedDuplicates,
        transactionIds: [],
      },
    }
  }

  // Import transactions atomically
  const createdIds: string[] = []
  try {
    await prisma.$transaction(async (tx) => {
      for (const extracted of toImport) {
        const transaction = await tx.transaction.create({
          data: {
            userId: user.id,
            name: extracted.description.slice(0, 100),
            description: extracted.description,
            total: extracted.type === "debit" ? -extracted.amount : extracted.amount,
            currencyCode: extracted.currency,
            type: extracted.type === "debit" ? "expense" : "income",
            issuedAt: new Date(extracted.date),
            sourceType: "bank-import",
            sourceId: statementId,
            transactionHash: extracted.hash,
            categoryCode: options?.defaultCategory,
            projectCode: options?.defaultProject,
          },
        })
        createdIds.push(transaction.id)
      }
    })

    // Update statement status to imported
    await updateBankStatementStatus(statementId, user.id, "imported")

    return {
      success: true,
      data: {
        importedCount: createdIds.length,
        skippedDuplicates,
        transactionIds: createdIds,
      },
    }
  } catch (error) {
    console.error("Import error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Import failed",
    }
  }
}

/**
 * Import all ready (non-imported) bank statements at once.
 * Skips statements that are already imported.
 */
export async function importAllBankStatements(
  options?: {
    skipDuplicates?: boolean
  }
): Promise<ActionState<{ totalImported: number; totalSkipped: number; statementCount: number }>> {
  const user = await getCurrentUser()

  // Get all statements that are ready but not yet imported
  const allStatements = await getBankStatements(user.id)
  const readyStatements = allStatements.filter((s) => s.status === "ready")

  if (readyStatements.length === 0) {
    return {
      success: true,
      data: {
        totalImported: 0,
        totalSkipped: 0,
        statementCount: 0,
      },
    }
  }

  let totalImported = 0
  let totalSkipped = 0
  let processedCount = 0

  // Process each statement sequentially
  for (const statement of readyStatements) {
    const result = await importBankTransactions(statement.id, undefined, {
      skipDuplicates: options?.skipDuplicates ?? true,
    })

    if (result.success && result.data) {
      totalImported += result.data.importedCount
      totalSkipped += result.data.skippedDuplicates
      processedCount++
    }
  }

  return {
    success: true,
    data: {
      totalImported,
      totalSkipped,
      statementCount: processedCount,
    },
  }
}

// ============================================================================
// Delete Action
// ============================================================================

/**
 * Delete a bank statement and its file.
 */
export async function deleteBankStatementAction(
  statementId: string
): Promise<ActionState<void>> {
  const user = await getCurrentUser()

  const result = await deleteBankStatement(statementId, user.id)
  if (!result) {
    return { success: false, error: "Statement not found" }
  }

  return { success: true, data: undefined }
}

// ============================================================================
// List Action
// ============================================================================

/**
 * Get all bank statements for the current user.
 */
export async function listBankStatements(
  status?: BankStatementStatus
): Promise<ActionState<BankStatement[]>> {
  const user = await getCurrentUser()

  const statements = await getBankStatements(user.id, status ? { status } : undefined)
  return { success: true, data: statements }
}
