# Quickstart: Bank Statement Import

**Feature**: 001-bank-statement-import
**Date**: 2026-01-18

## Prerequisites

- Node.js 20+
- Running TaxHacker instance with database configured
- LLM API key configured (for PDF parsing)

## Development Setup

```bash
# Ensure on feature branch
git checkout 001-bank-statement-import

# Install dependencies (no new deps required)
npm install

# Generate Prisma client with new schema
npm run db:setup

# Apply database migrations
npm run db:push

# Start development server
npm run dev
```

## File Structure to Create

```bash
# Create directories
mkdir -p app/\(app\)/bank-statements/upload
mkdir -p app/\(app\)/bank-statements/\[statementId\]
mkdir -p components/bank-statements
mkdir -p lib/parsers

# Create files (implementation order)
touch app/\(app\)/bank-statements/page.tsx
touch app/\(app\)/bank-statements/actions.ts
touch app/\(app\)/bank-statements/upload/page.tsx
touch app/\(app\)/bank-statements/\[statementId\]/page.tsx
touch components/bank-statements/upload-form.tsx
touch components/bank-statements/transaction-preview.tsx
touch components/bank-statements/transaction-row.tsx
touch components/bank-statements/import-summary.tsx
touch components/bank-statements/column-mapper.tsx
touch lib/parsers/csv-parser.ts
touch lib/parsers/pdf-parser.ts
touch lib/bank-statement-utils.ts
touch models/bank-statements.ts
```

## Implementation Order

### Phase 1: Database & Model (Day 1)

1. Add `BankStatement` model to Prisma schema
2. Add `sourceType`, `sourceId`, `transactionHash` to Transaction model
3. Run migrations
4. Create `models/bank-statements.ts` with CRUD operations

### Phase 2: CSV Parser (Day 1-2)

1. Create `lib/parsers/csv-parser.ts`
2. Implement delimiter detection
3. Implement column mapping
4. Implement transaction extraction

### Phase 3: PDF Parser (Day 2-3)

1. Create `lib/parsers/pdf-parser.ts`
2. Create LLM prompt for bank statement extraction
3. Integrate with existing LLM infrastructure
4. Handle multi-page PDFs

### Phase 4: Upload Flow (Day 3-4)

1. Create upload page and form
2. Implement `uploadBankStatement` action
3. Add file validation
4. Start async processing

### Phase 5: Preview & Edit (Day 4-5)

1. Create statement detail page
2. Implement transaction preview table
3. Add inline editing
4. Show summary totals

### Phase 6: Import Flow (Day 5-6)

1. Implement `importBankTransactions` action
2. Add duplicate detection
3. Create Transaction records
4. Handle errors with rollback

### Phase 7: Navigation & Polish (Day 6)

1. Add Bank Statements to sidebar
2. Add status indicators
3. Error handling improvements
4. UI polish

### Phase 8: Reconciliation (Day 7 - Optional)

1. Implement matching algorithm
2. Add match suggestions to preview
3. Implement link/unlink actions

## Testing Checklist

- [ ] Upload CSV with comma delimiter
- [ ] Upload CSV with semicolon delimiter
- [ ] Upload PDF bank statement
- [ ] Edit transaction before import
- [ ] Delete transaction from import
- [ ] Import selected transactions
- [ ] Verify duplicate detection
- [ ] Verify transactions appear in main list
- [ ] Test file size limit (>10MB rejected)
- [ ] Test invalid file type rejected

## Sample Test Files

Place in `test-fixtures/bank-statements/` (not committed):

1. `simple.csv` - Basic CSV with date, description, amount
2. `european.csv` - CSV with semicolon delimiter, DD/MM/YYYY dates
3. `sample-statement.pdf` - PDF bank statement

## Common Issues

### CSV Parsing

- **Issue**: Dates not parsing correctly
- **Solution**: Check date format detection in `csv-parser.ts`

### PDF Parsing

- **Issue**: LLM returns incomplete data
- **Solution**: Adjust prompt in `pdf-parser.ts`, increase max tokens

### Duplicate Detection

- **Issue**: False positives on similar transactions
- **Solution**: Tighten hash algorithm, add date tolerance
