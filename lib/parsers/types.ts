/**
 * Types for bank statement parsing and extraction
 */

/**
 * Represents a single transaction extracted from a bank statement
 */
export interface ExtractedTransaction {
  /** Temporary UUID for UI identification */
  id: string
  /** ISO date string (YYYY-MM-DD) */
  date: string
  /** Raw description from statement */
  description: string
  /** Amount in cents (always positive) */
  amount: number
  /** Transaction type */
  type: "debit" | "credit"
  /** Currency code (e.g., 'EUR', 'USD') */
  currency: string

  // Parsing metadata
  /** Confidence score for AI-extracted data (0-1) */
  confidence: number
  /** Original line from statement */
  rawLine?: string

  // User edits
  /** True if user modified this transaction */
  edited: boolean
  /** True if selected for import (default true) */
  selected: boolean

  // Duplicate detection
  /** Generated hash for duplicate detection */
  hash: string
  /** True if matches existing transaction */
  isDuplicate: boolean
  /** ID of matching transaction if duplicate */
  duplicateOf?: string

  // Reconciliation suggestions
  /** Suggested matches from existing transactions */
  matchSuggestions?: MatchSuggestion[]
}

/**
 * A suggested match between a bank transaction and an existing invoice/transaction
 */
export interface MatchSuggestion {
  /** Existing transaction ID */
  transactionId: string
  /** Name/description for display */
  transactionName: string
  /** Match confidence (0-1) */
  confidence: number
}

/**
 * Summary statistics for extracted transactions
 */
export interface ExtractedSummary {
  /** Sum of debits in cents */
  totalDebits: number
  /** Sum of credits in cents */
  totalCredits: number
  /** Credits - debits in cents */
  netAmount: number
  /** Total number of transactions */
  transactionCount: number
  /** Date range of transactions */
  dateRange: {
    start: string
    end: string
  }
}

/**
 * Metadata about how the statement was parsed
 */
export interface ParsingMetadata {
  /** Source format */
  format: "pdf" | "csv"
  /** Detected delimiter for CSV */
  detectedDelimiter?: string
  /** Detected date format */
  detectedDateFormat?: string
  /** Column mapping for CSV */
  columnMapping?: Record<string, string | number>
}

/**
 * Complete extracted data stored in BankStatement.extractedData
 */
export interface ExtractedData {
  /** List of extracted transactions */
  transactions: ExtractedTransaction[]
  /** Summary statistics */
  summary: ExtractedSummary
  /** Parsing metadata */
  parsingMetadata: ParsingMetadata
}

/**
 * Column mapping configuration for CSV parsing
 */
export interface CSVColumnMapping {
  /** Column containing transaction date */
  dateColumn: string | number
  /** Column containing description/reference */
  descriptionColumn: string | number
  /** Column containing amount */
  amountColumn: string | number
  /** Column containing transaction type (optional - can be inferred from amount sign) */
  typeColumn?: string | number
  /** Column containing currency (optional - uses default) */
  currencyColumn?: string | number
}

/**
 * Raw transaction data from CSV before normalization
 */
export interface RawCSVTransaction {
  date: string
  description: string
  amount: string
  type?: string
  currency?: string
  rawLine?: string
}

/**
 * Result of parsing a bank statement file
 */
export interface ParseResult {
  success: boolean
  data?: ExtractedData
  error?: string
}

/**
 * Detected CSV format information
 */
export interface CSVFormatInfo {
  /** Detected delimiter character */
  delimiter: string
  /** Whether first row contains headers */
  hasHeaders: boolean
  /** Detected column headers or indices */
  columns: string[]
  /** Number of data rows */
  rowCount: number
  /** Sample rows for preview */
  sampleRows: string[][]
}
