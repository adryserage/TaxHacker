# API Contracts: Bank Statement Import

**Feature**: 001-bank-statement-import
**Date**: 2026-01-18

## Server Actions

All actions are implemented as Next.js Server Actions in `app/(app)/bank-statements/actions.ts`.

---

### uploadBankStatement

Upload a bank statement file and start processing.

**Input**:
```typescript
interface UploadBankStatementInput {
  file: File                    // PDF or CSV file
}
```

**Output**:
```typescript
interface UploadBankStatementResult {
  success: boolean
  data?: {
    statementId: string         // BankStatement.id
    status: 'processing'
  }
  error?: string
}
```

**Validation**:
- File mimetype must be `application/pdf` or `text/csv`
- File size must be ≤ 10MB
- User must be authenticated

---

### getBankStatementStatus

Poll processing status of an uploaded statement.

**Input**:
```typescript
interface GetBankStatementStatusInput {
  statementId: string
}
```

**Output**:
```typescript
interface GetBankStatementStatusResult {
  success: boolean
  data?: {
    status: 'pending' | 'processing' | 'ready' | 'imported' | 'failed'
    progress?: number           // 0-100 for processing
    transactionCount?: number   // When ready
    errorMessage?: string       // When failed
  }
  error?: string
}
```

---

### getExtractedTransactions

Get extracted transactions for preview/editing.

**Input**:
```typescript
interface GetExtractedTransactionsInput {
  statementId: string
}
```

**Output**:
```typescript
interface GetExtractedTransactionsResult {
  success: boolean
  data?: ExtractedData          // See data-model.md
  error?: string
}
```

---

### updateExtractedTransaction

Update a single transaction during preview.

**Input**:
```typescript
interface UpdateExtractedTransactionInput {
  statementId: string
  transactionId: string         // Temporary ID within extracted data
  updates: {
    date?: string
    description?: string
    amount?: number             // In cents
    type?: 'debit' | 'credit'
    currency?: string
    selected?: boolean
  }
}
```

**Output**:
```typescript
interface UpdateExtractedTransactionResult {
  success: boolean
  data?: ExtractedTransaction   // Updated transaction
  error?: string
}
```

---

### mapCSVColumns

Set column mapping for CSV file (when auto-detection fails).

**Input**:
```typescript
interface MapCSVColumnsInput {
  statementId: string
  mapping: {
    dateColumn: string | number
    descriptionColumn: string | number
    amountColumn: string | number
    typeColumn?: string | number          // Optional, can be inferred from amount sign
    currencyColumn?: string | number      // Optional, uses default
  }
}
```

**Output**:
```typescript
interface MapCSVColumnsResult {
  success: boolean
  data?: {
    transactionCount: number
  }
  error?: string
}
```

---

### importBankTransactions

Import selected transactions into the system.

**Input**:
```typescript
interface ImportBankTransactionsInput {
  statementId: string
  transactionIds?: string[]     // If omitted, imports all selected
  options?: {
    skipDuplicates?: boolean    // Default: true
    defaultCategory?: string    // Category code
    defaultProject?: string     // Project code
  }
}
```

**Output**:
```typescript
interface ImportBankTransactionsResult {
  success: boolean
  data?: {
    importedCount: number
    skippedDuplicates: number
    transactionIds: string[]    // Created Transaction IDs
  }
  error?: string
}
```

---

### deleteBankStatement

Delete an uploaded statement (and its extracted data, not imported transactions).

**Input**:
```typescript
interface DeleteBankStatementInput {
  statementId: string
}
```

**Output**:
```typescript
interface DeleteBankStatementResult {
  success: boolean
  error?: string
}
```

---

### linkTransactionToInvoice

Link a bank transaction to an existing invoice/transaction.

**Input**:
```typescript
interface LinkTransactionToInvoiceInput {
  bankTransactionId: string     // Transaction.id (with sourceType='bank-import')
  invoiceTransactionId: string  // Transaction.id (with sourceType='invoice')
}
```

**Output**:
```typescript
interface LinkTransactionToInvoiceResult {
  success: boolean
  error?: string
}
```

---

## Page Routes

| Route | Description |
|-------|-------------|
| `/bank-statements` | List all uploaded statements |
| `/bank-statements/upload` | Upload new statement |
| `/bank-statements/[statementId]` | Preview & import extracted transactions |

## Navigation Integration

Add to sidebar navigation in `components/layout/sidebar.tsx`:

```typescript
{
  href: "/bank-statements",
  label: "Bank Statements",
  icon: Building2,  // From lucide-react
}
```
