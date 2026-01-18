import crypto from "crypto"
import { prisma } from "@/lib/db"
import { ExtractedTransaction, MatchSuggestion } from "./parsers/types"

/**
 * Generate a unique hash for a bank transaction for duplicate detection.
 * Hash is based on: date + amount + normalized description
 *
 * @param date - Transaction date (ISO string or Date)
 * @param amount - Amount in cents
 * @param description - Transaction description
 * @returns MD5 hash string
 */
export function generateTransactionHash(
  date: Date | string,
  amount: number,
  description: string
): string {
  const dateStr = typeof date === "string" ? date.split("T")[0] : date.toISOString().split("T")[0]
  const normalized = normalizeDescription(description)
  const input = `${dateStr}|${amount}|${normalized}`
  return crypto.createHash("md5").update(input).digest("hex")
}

/**
 * Normalize a transaction description for comparison.
 * Lowercases, removes extra whitespace, and trims.
 */
export function normalizeDescription(description: string): string {
  return description.toLowerCase().replace(/\s+/g, " ").trim()
}

/**
 * Check if a transaction hash already exists for a user.
 * Used during import to detect duplicates.
 *
 * @param userId - User ID
 * @param hash - Transaction hash to check
 * @returns The existing transaction ID if duplicate found, null otherwise
 */
export async function findDuplicateTransaction(
  userId: string,
  hash: string
): Promise<string | null> {
  const existing = await prisma.transaction.findFirst({
    where: {
      userId,
      transactionHash: hash,
    },
    select: { id: true },
  })

  return existing?.id || null
}

/**
 * Check multiple hashes for duplicates in batch.
 * More efficient than individual checks for large imports.
 *
 * @param userId - User ID
 * @param hashes - Array of transaction hashes to check
 * @returns Map of hash -> existing transaction ID for duplicates
 */
export async function findDuplicateTransactions(
  userId: string,
  hashes: string[]
): Promise<Map<string, string>> {
  const existingTransactions = await prisma.transaction.findMany({
    where: {
      userId,
      transactionHash: { in: hashes },
    },
    select: {
      id: true,
      transactionHash: true,
    },
  })

  const duplicateMap = new Map<string, string>()
  for (const tx of existingTransactions) {
    if (tx.transactionHash) {
      duplicateMap.set(tx.transactionHash, tx.id)
    }
  }

  return duplicateMap
}

/**
 * Mark extracted transactions with duplicate status.
 * Adds isDuplicate and duplicateOf fields.
 *
 * @param userId - User ID
 * @param transactions - Array of extracted transactions
 * @returns Updated transactions with duplicate info
 */
export async function markDuplicates(
  userId: string,
  transactions: ExtractedTransaction[]
): Promise<ExtractedTransaction[]> {
  const hashes = transactions.map((tx) => tx.hash)
  const duplicates = await findDuplicateTransactions(userId, hashes)

  return transactions.map((tx) => {
    const duplicateOf = duplicates.get(tx.hash)
    return {
      ...tx,
      isDuplicate: !!duplicateOf,
      duplicateOf,
    }
  })
}

/**
 * Find potential matches between a bank transaction and existing invoices.
 * Matching algorithm:
 * 1. Exact amount match (required)
 * 2. Date within ±7 days (required)
 * 3. Merchant name similarity (optional boost)
 *
 * @param userId - User ID
 * @param transaction - Extracted transaction to match
 * @param maxSuggestions - Maximum suggestions to return (default 3)
 * @returns Array of match suggestions
 */
export async function findMatchingInvoices(
  userId: string,
  transaction: ExtractedTransaction,
  maxSuggestions: number = 3
): Promise<MatchSuggestion[]> {
  const transactionDate = new Date(transaction.date)
  const dateWindow = 7 // days

  // Calculate date range for matching
  const minDate = new Date(transactionDate)
  minDate.setDate(minDate.getDate() - dateWindow)
  const maxDate = new Date(transactionDate)
  maxDate.setDate(maxDate.getDate() + dateWindow)

  // Find transactions with exact amount match within date range
  // Only match with invoice-sourced transactions (or those without a source)
  const candidates = await prisma.transaction.findMany({
    where: {
      userId,
      total: transaction.amount,
      issuedAt: {
        gte: minDate,
        lte: maxDate,
      },
      // Exclude already-linked transactions
      linkedTransactionId: null,
      // Prefer invoice sources or manual entries
      OR: [
        { sourceType: "invoice" },
        { sourceType: "manual" },
        { sourceType: null },
      ],
    },
    select: {
      id: true,
      name: true,
      merchant: true,
      issuedAt: true,
    },
    take: maxSuggestions * 2, // Get more candidates for ranking
  })

  // Calculate confidence scores and rank
  const suggestions: MatchSuggestion[] = candidates
    .map((candidate) => {
      let confidence = 0.5 // Base confidence for amount + date match

      // Boost confidence for closer dates
      if (candidate.issuedAt) {
        const daysDiff = Math.abs(
          (transactionDate.getTime() - candidate.issuedAt.getTime()) / (1000 * 60 * 60 * 24)
        )
        confidence += (7 - daysDiff) * 0.05 // Up to 0.35 boost
      }

      // Boost confidence for merchant name similarity
      if (candidate.merchant && transaction.description) {
        const merchantNorm = normalizeDescription(candidate.merchant)
        const descNorm = normalizeDescription(transaction.description)
        if (descNorm.includes(merchantNorm) || merchantNorm.includes(descNorm)) {
          confidence += 0.15
        }
      }

      return {
        transactionId: candidate.id,
        transactionName: candidate.name || candidate.merchant || "Unnamed transaction",
        confidence: Math.min(confidence, 1), // Cap at 1.0
      }
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxSuggestions)

  return suggestions
}

/**
 * Calculate summary statistics for extracted transactions.
 */
export function calculateSummary(transactions: ExtractedTransaction[]) {
  let totalDebits = 0
  let totalCredits = 0
  let minDate = ""
  let maxDate = ""

  for (const tx of transactions) {
    if (tx.type === "debit") {
      totalDebits += tx.amount
    } else {
      totalCredits += tx.amount
    }

    if (!minDate || tx.date < minDate) minDate = tx.date
    if (!maxDate || tx.date > maxDate) maxDate = tx.date
  }

  return {
    totalDebits,
    totalCredits,
    netAmount: totalCredits - totalDebits,
    transactionCount: transactions.length,
    dateRange: {
      start: minDate,
      end: maxDate,
    },
  }
}

/**
 * Generate a temporary UUID for extracted transactions.
 */
export function generateTempId(): string {
  return crypto.randomUUID()
}

/**
 * Parse amount string to cents.
 * Handles various formats: "1,234.56", "1.234,56", "-50.00", etc.
 *
 * @param amountStr - Amount string
 * @param defaultType - Default type if amount is positive
 * @returns Object with amount in cents and type
 */
export function parseAmount(
  amountStr: string,
  defaultType: "debit" | "credit" = "debit"
): { amount: number; type: "debit" | "credit" } {
  // Remove currency symbols and whitespace
  let cleaned = amountStr.replace(/[€$£¥\s]/g, "").trim()

  // Detect negative
  const isNegative = cleaned.startsWith("-") || cleaned.startsWith("(")
  cleaned = cleaned.replace(/[()-]/g, "")

  // Handle European format (1.234,56) vs US format (1,234.56)
  // If there's a comma followed by exactly 2 digits at the end, it's European
  if (/,\d{2}$/.test(cleaned)) {
    // European: dots are thousands, comma is decimal
    cleaned = cleaned.replace(/\./g, "").replace(",", ".")
  } else {
    // US: commas are thousands, dot is decimal
    cleaned = cleaned.replace(/,/g, "")
  }

  const value = Math.round(parseFloat(cleaned) * 100)

  // Determine type based on sign
  // Negative usually means debit (money out), positive means credit (money in)
  let type: "debit" | "credit" = defaultType
  if (isNegative) {
    type = "debit"
  } else if (value > 0 && defaultType === "debit") {
    // If we have a positive value but default is debit, keep it
    type = "debit"
  }

  return {
    amount: Math.abs(value),
    type,
  }
}

/**
 * Parse a date string in various formats.
 * Returns ISO date string (YYYY-MM-DD).
 *
 * Supported formats:
 * - YYYY-MM-DD
 * - DD/MM/YYYY
 * - MM/DD/YYYY
 * - DD.MM.YYYY
 * - DD-MM-YYYY
 */
export function parseDate(dateStr: string, preferEuropean: boolean = true): string {
  const cleaned = dateStr.trim()

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    return cleaned.slice(0, 10)
  }

  // DD/MM/YYYY or MM/DD/YYYY
  const slashMatch = cleaned.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (slashMatch) {
    const [, first, second, year] = slashMatch
    const firstNum = parseInt(first, 10)
    const secondNum = parseInt(second, 10)

    // If first > 12, it must be day (European)
    // If second > 12, it must be day (US)
    // Otherwise use preference
    let month: number, day: number
    if (firstNum > 12) {
      day = firstNum
      month = secondNum
    } else if (secondNum > 12) {
      month = firstNum
      day = secondNum
    } else if (preferEuropean) {
      day = firstNum
      month = secondNum
    } else {
      month = firstNum
      day = secondNum
    }

    return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`
  }

  // DD.MM.YYYY (European)
  const dotMatch = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dotMatch) {
    const [, day, month, year] = dotMatch
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }

  // Fallback: try native Date parsing
  const date = new Date(cleaned)
  if (!isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10)
  }

  throw new Error(`Unable to parse date: ${dateStr}`)
}
