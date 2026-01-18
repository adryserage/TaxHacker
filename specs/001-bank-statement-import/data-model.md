# Data Model: Bank Statement Import

**Feature**: 001-bank-statement-import
**Date**: 2026-01-18

## New Entity: BankStatement

Represents an uploaded bank statement file with its processing status and extracted transactions.

```prisma
model BankStatement {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @map("user_id") @db.Uuid
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // File information
  filename        String
  path            String
  mimetype        String                    // application/pdf or text/csv
  fileSize        Int      @map("file_size")

  // Statement metadata (extracted or user-provided)
  bankName        String?  @map("bank_name")
  accountNumber   String?  @map("account_number")  // Last 4 digits only
  periodStart     DateTime? @map("period_start")
  periodEnd       DateTime? @map("period_end")

  // Processing
  status          String   @default("pending")     // pending, processing, ready, imported, failed
  extractedData   Json?    @map("extracted_data")  // Temporary storage for preview
  transactionCount Int     @default(0) @map("transaction_count")
  errorMessage    String?  @map("error_message")

  // Timestamps
  createdAt       DateTime @default(now()) @map("created_at")
  processedAt     DateTime? @map("processed_at")
  importedAt      DateTime? @map("imported_at")

  @@index([userId])
  @@index([status])
  @@map("bank_statements")
}
```

## Extended Entity: Transaction

Add source tracking fields to the existing Transaction model.

```prisma
model Transaction {
  // ... existing fields ...

  // NEW: Source tracking for bank imports
  sourceType      String?  @map("source_type")     // 'invoice', 'bank-import', 'manual'
  sourceId        String?  @map("source_id")       // BankStatement.id for bank imports
  transactionHash String?  @map("transaction_hash") // For duplicate detection

  // NEW: Reconciliation
  linkedTransactionId String? @map("linked_transaction_id") @db.Uuid

  @@index([sourceType])
  @@index([transactionHash])
}
```

## Extended Entity: User

Add relation to BankStatement.

```prisma
model User {
  // ... existing fields ...
  bankStatements  BankStatement[]
}
```

## Extracted Transaction Structure (JSON)

Stored in `BankStatement.extractedData` during preview phase.

```typescript
interface ExtractedTransaction {
  id: string                    // Temporary UUID for UI
  date: string                  // ISO date string
  description: string           // Raw description from statement
  amount: number                // Amount in cents (positive)
  type: 'debit' | 'credit'      // Transaction type
  currency: string              // Currency code (e.g., 'EUR', 'USD')

  // Parsing metadata
  confidence: number            // 0-1 confidence score for AI-extracted data
  rawLine?: string              // Original line from statement

  // User edits
  edited: boolean               // True if user modified this transaction
  selected: boolean             // True if selected for import (default true)

  // Duplicate detection
  hash: string                  // Generated hash for duplicate detection
  isDuplicate: boolean          // True if matches existing transaction
  duplicateOf?: string          // ID of matching transaction

  // Reconciliation suggestions
  matchSuggestions?: {
    transactionId: string
    transactionName: string
    confidence: number
  }[]
}

interface ExtractedData {
  transactions: ExtractedTransaction[]
  summary: {
    totalDebits: number         // Sum of debits in cents
    totalCredits: number        // Sum of credits in cents
    netAmount: number           // Credits - debits
    transactionCount: number
    dateRange: {
      start: string
      end: string
    }
  }
  parsingMetadata: {
    format: 'pdf' | 'csv'
    detectedDelimiter?: string  // For CSV
    detectedDateFormat?: string
    columnMapping?: Record<string, string>  // For CSV
  }
}
```

## State Transitions

```
BankStatement.status:

  [pending] ──upload──> [processing] ──success──> [ready] ──import──> [imported]
                              │                      │
                              └──error──> [failed]   └──delete──> (deleted)
```

## Validation Rules

| Field | Rule |
|-------|------|
| `BankStatement.mimetype` | Must be 'application/pdf' or 'text/csv' |
| `BankStatement.fileSize` | Must be ≤ 10MB (10,485,760 bytes) |
| `ExtractedTransaction.amount` | Must be positive integer (cents) |
| `ExtractedTransaction.date` | Must be valid date, not in future |
| `ExtractedTransaction.type` | Must be 'debit' or 'credit' |
| `Transaction.transactionHash` | Unique per user when sourceType='bank-import' |

## Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `bank_statements` | `userId` | Filter by user |
| `bank_statements` | `status` | Filter pending/ready |
| `transactions` | `sourceType` | Filter bank imports |
| `transactions` | `transactionHash` | Duplicate detection |
