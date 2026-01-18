# Research: Bank Statement Import & Analysis

**Feature**: 001-bank-statement-import
**Date**: 2026-01-18

## CSV Parsing Strategy

### Decision
Use `@fast-csv/parse` (already in dependencies) with auto-detection of delimiters and headers.

### Rationale
- Already a project dependency
- Supports streaming for large files
- Handles comma, semicolon, tab delimiters
- Provides header detection and column mapping

### Alternatives Considered
- **Papa Parse**: Popular but would add new dependency
- **csv-parse**: Good but @fast-csv already available
- **Manual parsing**: Too error-prone for edge cases

## PDF Parsing Strategy

### Decision
Use existing LangChain + Gemini/OpenAI infrastructure with a specialized prompt for bank statement extraction.

### Rationale
- Leverages existing AI infrastructure (lib/llm.ts)
- Same pattern as invoice parsing
- Handles varied bank statement formats
- Can extract structured data from unstructured PDFs

### Alternatives Considered
- **pdf-parse + regex**: Fragile, bank formats vary significantly
- **Tabula-js**: Good for tables but requires Java runtime
- **AWS Textract**: External service, cost per call

## Duplicate Detection

### Decision
Generate hash from: `date + amount + description_normalized` and check against existing transactions.

### Rationale
- Simple and reliable for exact duplicates
- Normalized description handles minor variations
- Fast lookup with database index

### Implementation
```typescript
function generateTransactionHash(date: Date, amount: number, description: string): string {
  const normalized = description.toLowerCase().replace(/\s+/g, ' ').trim()
  return crypto.createHash('md5').update(`${date.toISOString()}|${amount}|${normalized}`).digest('hex')
}
```

## Invoice Reconciliation

### Decision
Match by: amount (exact) + date proximity (±7 days) + optional merchant name similarity.

### Rationale
- Amount must match exactly (in cents)
- Bank transactions often post 1-5 days after invoice date
- Merchant name helps filter false positives

### Matching Algorithm
1. Find transactions with exact amount match
2. Filter by date within ±7 day window
3. Rank by date proximity + merchant similarity
4. Present top 3 suggestions to user

## Data Model Extension

### Decision
- Add new `BankStatement` model for uploaded files
- Extend `Transaction` with `sourceType` and `sourceId` fields
- Store extracted transactions temporarily in `BankStatement.extractedData` JSON

### Rationale
- Minimal schema changes
- Preserves existing Transaction structure
- Allows preview/edit before final import
- Supports rollback by deleting BankStatement

## File Storage

### Decision
Store bank statement files in existing file upload infrastructure (`/app/data/uploads/bank-statements/`).

### Rationale
- Consistent with existing file handling
- Reuses upload path configuration
- Files can be re-processed if needed

## UI/UX Patterns

### Decision
Follow existing patterns from:
- `/unsorted` - File preview and processing workflow
- `/import/csv` - Table-based import UI
- `/transactions/[id]` - Edit form pattern

### Rationale
- Consistent user experience
- Reuses existing components (Card, Table, Form inputs)
- Familiar patterns for existing users
