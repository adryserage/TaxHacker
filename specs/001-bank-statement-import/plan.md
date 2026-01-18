# Implementation Plan: Bank Statement Import & Analysis

**Branch**: `001-bank-statement-import` | **Date**: 2026-01-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-bank-statement-import/spec.md`

## Summary

Add a new Bank Statements tab to import and analyze bank transaction history from PDF and CSV files. The feature will leverage existing LangChain AI infrastructure for PDF parsing, extend the Transaction model to support bank import source tracking, and implement a preview/validation workflow before final import.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: Next.js 15, React 19, Prisma 6.x, LangChain, @fast-csv/parse, pdf2pic
**Storage**: PostgreSQL/SQLite via Prisma (dual-database support)
**Testing**: Manual testing (no test framework currently configured)
**Target Platform**: Web application (desktop/mobile responsive)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Process bank statements (<5MB) in under 30 seconds
**Constraints**: File size limit 10MB, support common CSV delimiters and date formats
**Scale/Scope**: Single user per tenant, typical statement 50-200 transactions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Existing Patterns | PASS | Follows existing page/model/component structure |
| Data Integrity | PASS | Atomic import with rollback on failure |
| User Control | PASS | Preview/edit before import |
| Minimal Complexity | PASS | Reuses existing Transaction model, adds one new model |

## Project Structure

### Documentation (this feature)

```text
specs/001-bank-statement-import/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # API contracts
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
app/(app)/
├── bank-statements/
│   ├── page.tsx                    # Main bank statements list
│   ├── upload/
│   │   └── page.tsx                # Upload new statement
│   ├── [statementId]/
│   │   └── page.tsx                # Review/edit extracted transactions
│   └── actions.ts                  # Server actions

components/
├── bank-statements/
│   ├── upload-form.tsx             # File upload component
│   ├── transaction-preview.tsx     # Preview table with edit capability
│   ├── transaction-row.tsx         # Editable row component
│   ├── import-summary.tsx          # Totals summary
│   ├── column-mapper.tsx           # CSV column mapping UI
│   └── duplicate-warning.tsx       # Duplicate detection alert

models/
├── bank-statements.ts              # BankStatement CRUD operations
└── transactions.ts                 # Extended with source tracking

lib/
├── parsers/
│   ├── csv-parser.ts               # CSV parsing with column detection
│   └── pdf-parser.ts               # PDF parsing via LangChain
└── bank-statement-utils.ts         # Duplicate detection, matching

prisma/
├── schema.prisma                   # Add BankStatement model
└── schema.sqlite.prisma            # SQLite variant
```

**Structure Decision**: Follows existing app structure with new route group for bank-statements, dedicated components folder, and parser utilities in lib.

## Complexity Tracking

No violations requiring justification. Feature fits within existing architecture patterns.
