"use server"

import { loadFileAsBase64 } from "@/ai/attachments"
import { requestLLM, LLMSettings } from "@/ai/providers/llmProvider"
import { generateFilePreviews } from "@/lib/previews/generate"
import { ExtractedData, ExtractedTransaction, ParseResult } from "./types"
import {
  calculateSummary,
  generateTempId,
  generateTransactionHash,
} from "../bank-statement-utils"

const MAX_PAGES_TO_ANALYZE = 10 // Bank statements can be longer than invoices

/**
 * JSON schema for LLM structured output.
 * Defines the expected format for extracted bank statement data.
 */
const BANK_STATEMENT_SCHEMA = {
  type: "object",
  properties: {
    bankName: {
      type: "string",
      description: "Name of the bank",
    },
    accountNumber: {
      type: "string",
      description: "Account number (last 4 digits only for privacy)",
    },
    statementPeriod: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
        endDate: { type: "string", description: "End date in YYYY-MM-DD format" },
      },
    },
    currency: {
      type: "string",
      description: "Primary currency code (e.g., EUR, USD)",
    },
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Transaction date in YYYY-MM-DD format",
          },
          description: {
            type: "string",
            description: "Transaction description or reference",
          },
          amount: {
            type: "number",
            description: "Transaction amount (positive value)",
          },
          type: {
            type: "string",
            enum: ["debit", "credit"],
            description: "Transaction type: debit (money out) or credit (money in)",
          },
        },
        required: ["date", "description", "amount", "type"],
      },
    },
  },
  required: ["transactions"],
}

/**
 * Prompt for the LLM to extract bank statement data.
 */
const EXTRACTION_PROMPT = `You are an expert at extracting transaction data from bank statements.

Analyze the provided bank statement image(s) and extract ALL transactions.

For each transaction, extract:
1. Date: The transaction date in YYYY-MM-DD format
2. Description: The full transaction description/reference
3. Amount: The numeric amount (always positive, without currency symbols)
4. Type: "debit" if money was withdrawn/spent, "credit" if money was received/deposited

Important rules:
- Extract EVERY transaction visible in the statement
- Convert all dates to YYYY-MM-DD format
- Amounts should be positive numbers (the type field indicates debit/credit)
- Do NOT skip any transactions
- If you can identify the bank name, account number (last 4 digits only), or statement period, include them

If there are multiple pages, process ALL of them and combine the results.

Return the data in the specified JSON format.`

/**
 * Parse a PDF bank statement using LLM vision.
 *
 * @param filePath - Path to the PDF file
 * @param llmSettings - LLM configuration from user settings
 * @param defaultCurrency - Default currency code
 */
export async function parsePDF(
  filePath: string,
  llmSettings: LLMSettings,
  defaultCurrency: string = "EUR"
): Promise<ParseResult> {
  try {
    // Generate image previews of PDF pages
    const { contentType, previews } = await generateFilePreviews(
      null as any, // User context not needed for preview generation
      filePath,
      "application/pdf"
    )

    if (previews.length === 0) {
      return { success: false, error: "Unable to generate previews from PDF" }
    }

    // Load pages as base64 images
    const attachments = await Promise.all(
      previews.slice(0, MAX_PAGES_TO_ANALYZE).map(async (previewPath) => ({
        filename: "bank-statement.png",
        contentType,
        base64: await loadFileAsBase64(previewPath),
      }))
    )

    // Request extraction from LLM
    const response = await requestLLM(llmSettings, {
      prompt: EXTRACTION_PROMPT,
      schema: BANK_STATEMENT_SCHEMA,
      attachments,
    })

    if (response.error) {
      return { success: false, error: response.error }
    }

    const output = response.output as {
      bankName?: string
      accountNumber?: string
      statementPeriod?: { startDate?: string; endDate?: string }
      currency?: string
      transactions?: Array<{
        date: string
        description: string
        amount: number
        type: "debit" | "credit"
      }>
    }

    if (!output.transactions || output.transactions.length === 0) {
      return {
        success: false,
        error: "No transactions found in the bank statement",
      }
    }

    const currency = output.currency || defaultCurrency

    // Convert LLM output to ExtractedTransaction format
    const transactions: ExtractedTransaction[] = output.transactions.map((tx) => {
      // Amount from LLM might be in dollars/euros, convert to cents
      const amountInCents = Math.round(tx.amount * 100)
      const hash = generateTransactionHash(tx.date, amountInCents, tx.description)

      return {
        id: generateTempId(),
        date: tx.date,
        description: tx.description,
        amount: amountInCents,
        type: tx.type,
        currency,
        confidence: 0.9, // PDF/LLM extraction has inherent uncertainty
        edited: false,
        selected: true,
        hash,
        isDuplicate: false,
      }
    })

    const extractedData: ExtractedData = {
      transactions,
      summary: calculateSummary(transactions),
      parsingMetadata: {
        format: "pdf",
        detectedDateFormat: "YYYY-MM-DD",
      },
    }

    // Include bank metadata if extracted
    if (output.bankName || output.accountNumber || output.statementPeriod) {
      // This metadata can be stored in BankStatement model
      ;(extractedData as any).metadata = {
        bankName: output.bankName,
        accountNumber: output.accountNumber,
        periodStart: output.statementPeriod?.startDate,
        periodEnd: output.statementPeriod?.endDate,
      }
    }

    return { success: true, data: extractedData }
  } catch (error) {
    console.error("PDF parsing error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse PDF bank statement",
    }
  }
}

/**
 * Validate that LLM settings are configured for PDF parsing.
 */
export function validateLLMSettings(llmSettings: LLMSettings): { valid: boolean; error?: string } {
  const configuredProviders = llmSettings.providers.filter((p) => p.apiKey && p.model)

  if (configuredProviders.length === 0) {
    return {
      valid: false,
      error:
        "No LLM provider configured. Please configure an AI provider in Settings to parse PDF bank statements.",
    }
  }

  return { valid: true }
}
