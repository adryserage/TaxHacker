import { parseString } from "@fast-csv/parse"
import fs from "fs/promises"
import {
  CSVColumnMapping,
  CSVFormatInfo,
  ExtractedData,
  ExtractedTransaction,
  ParseResult,
} from "./types"
import {
  calculateSummary,
  generateTempId,
  generateTransactionHash,
  parseAmount,
  parseDate,
} from "../bank-statement-utils"

const COMMON_DELIMITERS = [",", ";", "\t", "|"]

/**
 * Detect the delimiter used in a CSV file by analyzing the first few lines.
 */
export function detectDelimiter(content: string): string {
  const lines = content.split("\n").slice(0, 10)
  const scores: Record<string, number> = {}

  for (const delimiter of COMMON_DELIMITERS) {
    const counts = lines.map((line) => line.split(delimiter).length)
    // A good delimiter should split each line into the same number of columns
    const isConsistent = counts.every((c) => c === counts[0] && c > 1)
    const avgColumns = counts.reduce((a, b) => a + b, 0) / counts.length

    if (isConsistent && avgColumns > 1) {
      scores[delimiter] = avgColumns
    }
  }

  // Return delimiter with highest consistent column count
  const entries = Object.entries(scores)
  if (entries.length === 0) return ","

  return entries.sort((a, b) => b[1] - a[1])[0][0]
}

/**
 * Analyze CSV format and return information about its structure.
 */
export async function analyzeCSVFormat(filePath: string): Promise<CSVFormatInfo> {
  const content = await fs.readFile(filePath, "utf-8")
  const delimiter = detectDelimiter(content)
  const lines = content.split("\n").filter((line) => line.trim())

  // Parse first few rows
  const rows: string[][] = []
  for (const line of lines.slice(0, 10)) {
    const row = await parseCSVLine(line, delimiter)
    if (row.length > 0) rows.push(row)
  }

  if (rows.length === 0) {
    return {
      delimiter,
      hasHeaders: false,
      columns: [],
      rowCount: 0,
      sampleRows: [],
    }
  }

  // Check if first row looks like headers (non-numeric, text values)
  const firstRow = rows[0]
  const hasHeaders = firstRow.every((cell) => {
    const trimmed = cell.trim()
    // Headers are usually non-numeric text
    return trimmed.length > 0 && isNaN(Number(trimmed.replace(/[,\.]/g, "")))
  })

  const columns = hasHeaders ? firstRow : firstRow.map((_, i) => `Column ${i + 1}`)
  const sampleRows = hasHeaders ? rows.slice(1, 6) : rows.slice(0, 5)

  return {
    delimiter,
    hasHeaders,
    columns,
    rowCount: lines.length - (hasHeaders ? 1 : 0),
    sampleRows,
  }
}

/**
 * Parse a single CSV line.
 */
async function parseCSVLine(line: string, delimiter: string): Promise<string[]> {
  return new Promise((resolve) => {
    const result: string[] = []
    parseString(line, { delimiter })
      .on("data", (row: string[]) => result.push(...row))
      .on("end", () => resolve(result))
      .on("error", () => resolve([]))
  })
}

/**
 * Auto-detect column mapping from header names.
 * Looks for common patterns like "date", "amount", "description", etc.
 */
export function autoDetectColumnMapping(headers: string[]): CSVColumnMapping | null {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim())

  let dateColumn: number | undefined
  let descriptionColumn: number | undefined
  let amountColumn: number | undefined
  let typeColumn: number | undefined
  let currencyColumn: number | undefined

  // Common date column names
  const datePatterns = ["date", "datum", "data", "transaction date", "value date", "booking date"]
  // Common description column names
  const descPatterns = [
    "description",
    "reference",
    "details",
    "narrative",
    "memo",
    "text",
    "libelle",
    "bezeichnung",
  ]
  // Common amount column names
  const amountPatterns = ["amount", "value", "sum", "total", "betrag", "montant"]
  // Common type column names (debit/credit indicator)
  const typePatterns = ["type", "debit/credit", "d/c", "direction", "side"]
  // Common currency column names
  const currencyPatterns = ["currency", "ccy", "curr", "wahrung", "devise"]

  lowerHeaders.forEach((header, index) => {
    if (dateColumn === undefined && datePatterns.some((p) => header.includes(p))) {
      dateColumn = index
    }
    if (descriptionColumn === undefined && descPatterns.some((p) => header.includes(p))) {
      descriptionColumn = index
    }
    if (amountColumn === undefined && amountPatterns.some((p) => header.includes(p))) {
      amountColumn = index
    }
    if (typeColumn === undefined && typePatterns.some((p) => header.includes(p))) {
      typeColumn = index
    }
    if (currencyColumn === undefined && currencyPatterns.some((p) => header.includes(p))) {
      currencyColumn = index
    }
  })

  // Also check for split debit/credit columns
  const debitIdx = lowerHeaders.findIndex((h) => h.includes("debit") || h.includes("withdrawal"))
  const creditIdx = lowerHeaders.findIndex((h) => h.includes("credit") || h.includes("deposit"))

  if (dateColumn === undefined || (amountColumn === undefined && debitIdx === -1)) {
    return null // Can't auto-detect required columns
  }

  // If no single amount column but have debit/credit columns
  if (amountColumn === undefined && debitIdx !== -1) {
    // Use debit column as amount, will need special handling
    amountColumn = debitIdx
  }

  return {
    dateColumn: dateColumn!, // Verified above: dateColumn !== undefined
    descriptionColumn: descriptionColumn ?? 1, // Default to second column
    amountColumn: amountColumn!, // Verified above: amountColumn !== undefined
    typeColumn,
    currencyColumn,
  }
}

/**
 * Parse a CSV bank statement file.
 *
 * @param filePath - Path to the CSV file
 * @param mapping - Optional column mapping (auto-detected if not provided)
 * @param defaultCurrency - Default currency code
 */
export async function parseCSV(
  filePath: string,
  mapping?: CSVColumnMapping,
  defaultCurrency: string = "EUR"
): Promise<ParseResult> {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    const delimiter = detectDelimiter(content)

    const rows: string[][] = []
    await new Promise<void>((resolve, reject) => {
      parseString(content, { delimiter, headers: false })
        .on("data", (row: string[]) => rows.push(row))
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
    })

    if (rows.length === 0) {
      return { success: false, error: "CSV file is empty" }
    }

    // Check if first row is headers
    const firstRow = rows[0]
    const hasHeaders = firstRow.every((cell) => {
      const trimmed = cell.trim()
      return trimmed.length > 0 && isNaN(Number(trimmed.replace(/[,\.]/g, "")))
    })

    const headers = hasHeaders ? firstRow : []
    const dataRows = hasHeaders ? rows.slice(1) : rows

    // Auto-detect mapping if not provided
    let columnMapping = mapping
    if (!columnMapping && hasHeaders) {
      columnMapping = autoDetectColumnMapping(headers) ?? undefined
    }

    if (!columnMapping) {
      return {
        success: false,
        error:
          "Unable to auto-detect column mapping. Please provide manual column configuration.",
      }
    }

    const transactions: ExtractedTransaction[] = []

    for (const row of dataRows) {
      if (row.every((cell) => !cell.trim())) continue // Skip empty rows

      try {
        const dateStr = getColumnValue(row, columnMapping.dateColumn)
        const description = getColumnValue(row, columnMapping.descriptionColumn)
        const amountStr = getColumnValue(row, columnMapping.amountColumn)
        const typeStr = columnMapping.typeColumn
          ? getColumnValue(row, columnMapping.typeColumn)
          : undefined
        const currency = columnMapping.currencyColumn
          ? getColumnValue(row, columnMapping.currencyColumn)
          : defaultCurrency

        if (!dateStr || !amountStr) continue // Skip rows without essential data

        const date = parseDate(dateStr)
        const { amount, type: parsedType } = parseAmount(amountStr)

        // Override type if explicitly specified
        let type: "debit" | "credit" = parsedType
        if (typeStr) {
          const lowerType = typeStr.toLowerCase()
          if (lowerType.includes("credit") || lowerType === "c" || lowerType === "cr") {
            type = "credit"
          } else if (lowerType.includes("debit") || lowerType === "d" || lowerType === "db") {
            type = "debit"
          }
        }

        const hash = generateTransactionHash(date, amount, description || "")

        transactions.push({
          id: generateTempId(),
          date,
          description: description || "",
          amount,
          type,
          currency: currency || defaultCurrency,
          confidence: 1.0, // CSV parsing is deterministic
          rawLine: row.join(delimiter),
          edited: false,
          selected: true,
          hash,
          isDuplicate: false,
        })
      } catch (err) {
        // Skip rows that can't be parsed
        console.warn("Failed to parse CSV row:", row, err)
      }
    }

    if (transactions.length === 0) {
      return {
        success: false,
        error: "No valid transactions found in CSV file",
      }
    }

    const extractedData: ExtractedData = {
      transactions,
      summary: calculateSummary(transactions),
      parsingMetadata: {
        format: "csv",
        detectedDelimiter: delimiter,
        columnMapping: columnMapping as unknown as Record<string, string | number>,
      },
    }

    return { success: true, data: extractedData }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse CSV file",
    }
  }
}

/**
 * Get value from a row by column index or header name.
 */
function getColumnValue(row: string[], column: string | number): string {
  if (typeof column === "number") {
    return row[column]?.trim() || ""
  }
  // If column is a string, it should have been converted to index already
  return ""
}

/**
 * Re-parse CSV with new column mapping.
 * Used when user manually adjusts column mapping.
 */
export async function reparseCSVWithMapping(
  filePath: string,
  mapping: CSVColumnMapping,
  defaultCurrency: string = "EUR"
): Promise<ParseResult> {
  return parseCSV(filePath, mapping, defaultCurrency)
}
