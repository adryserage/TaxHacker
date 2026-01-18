# Tasks: Bank Statement Import & Analysis

**Input**: Design documents from `/specs/001-bank-statement-import/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: No automated tests requested. Manual testing via quickstart.md checklist.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: Next.js App Router structure
- Routes: `app/(app)/bank-statements/`
- Components: `components/bank-statements/`
- Models: `models/`
- Utilities: `lib/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, database schema, and core utilities

- [ ] T001 Add BankStatement model to `prisma/schema.prisma` with all fields from data-model.md
- [ ] T002 Add BankStatement model to `prisma/schema.sqlite.prisma` (SQLite variant)
- [ ] T003 Add sourceType, sourceId, transactionHash, linkedTransactionId fields to Transaction model in `prisma/schema.prisma`
- [ ] T004 Add sourceType, sourceId, transactionHash, linkedTransactionId fields to Transaction model in `prisma/schema.sqlite.prisma`
- [ ] T005 Add User.bankStatements relation in both schema files
- [ ] T006 Run `npm run db:push` to apply schema changes
- [ ] T007 Create `models/bank-statements.ts` with CRUD operations (getBankStatements, getBankStatementById, createBankStatement, updateBankStatement, deleteBankStatement)

**Checkpoint**: Database schema ready, basic model operations available

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core parsers and utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T008 [P] Create `lib/parsers/csv-parser.ts` with delimiter detection and column mapping
- [ ] T009 [P] Create `lib/parsers/pdf-parser.ts` with LangChain integration for bank statement extraction
- [ ] T010 [P] Create `lib/bank-statement-utils.ts` with generateTransactionHash function
- [ ] T011 Add duplicate detection function to `lib/bank-statement-utils.ts`
- [ ] T012 Create base types in `lib/parsers/types.ts` for ExtractedTransaction and ExtractedData interfaces
- [ ] T013 [P] Create `app/(app)/bank-statements/actions.ts` with basic action structure

**Checkpoint**: Foundation ready - parsers and utilities available for user stories

---

## Phase 3: User Story 1 - Upload Bank Statement File (Priority: P1) 🎯 MVP

**Goal**: Users can upload PDF/CSV bank statements with validation

**Independent Test**: Upload a PDF or CSV file and see it accepted with processing indicator

### Implementation for User Story 1

- [ ] T014 [P] [US1] Create `app/(app)/bank-statements/page.tsx` - main list page showing uploaded statements
- [ ] T015 [P] [US1] Create `components/bank-statements/upload-form.tsx` - file upload component with drag-and-drop
- [ ] T016 [US1] Create `app/(app)/bank-statements/upload/page.tsx` - upload page using upload-form component
- [ ] T017 [US1] Implement uploadBankStatement action in `app/(app)/bank-statements/actions.ts`
- [ ] T018 [US1] Add file validation (mimetype: PDF/CSV, size: ≤10MB) in upload action
- [ ] T019 [US1] Add file storage to `/app/data/uploads/bank-statements/` directory
- [ ] T020 [US1] Add processing status indicator in `components/bank-statements/statement-status.tsx`
- [ ] T021 [US1] Add getBankStatementStatus action for polling in `app/(app)/bank-statements/actions.ts`
- [ ] T022 [US1] Add Bank Statements link to sidebar navigation in `components/layout/sidebar.tsx`

**Checkpoint**: User Story 1 complete - users can upload files and see status

---

## Phase 4: User Story 2 - Parse and Extract Transactions (Priority: P1)

**Goal**: System automatically extracts transactions from uploaded statements

**Independent Test**: Upload a bank statement and see list of extracted transactions

### Implementation for User Story 2

- [ ] T023 [US2] Implement CSV parsing logic in `lib/parsers/csv-parser.ts` - parseCSV function
- [ ] T024 [US2] Add column auto-detection to CSV parser (date, description, amount, type columns)
- [ ] T025 [US2] Implement PDF parsing logic in `lib/parsers/pdf-parser.ts` - parsePDF function with LLM prompt
- [ ] T026 [US2] Create LLM prompt for bank statement extraction in `lib/parsers/pdf-parser.ts`
- [ ] T027 [US2] Add processing background job - trigger parsing after upload in `app/(app)/bank-statements/actions.ts`
- [ ] T028 [US2] Store extracted data in BankStatement.extractedData field
- [ ] T029 [US2] Update BankStatement status after parsing (ready/failed)
- [ ] T030 [US2] Add error handling with user-friendly messages for parsing failures

**Checkpoint**: User Story 2 complete - uploaded files are parsed automatically

---

## Phase 5: User Story 3 - Review and Validate Extracted Transactions (Priority: P2)

**Goal**: Users can review, edit, and validate extracted transactions before import

**Independent Test**: View extracted transactions, edit one, see changes reflected

### Implementation for User Story 3

- [ ] T031 [P] [US3] Create `app/(app)/bank-statements/[statementId]/page.tsx` - detail page
- [ ] T032 [P] [US3] Create `components/bank-statements/transaction-preview.tsx` - preview table
- [ ] T033 [P] [US3] Create `components/bank-statements/transaction-row.tsx` - editable row component
- [ ] T034 [P] [US3] Create `components/bank-statements/import-summary.tsx` - totals summary
- [ ] T035 [US3] Implement getExtractedTransactions action in `app/(app)/bank-statements/actions.ts`
- [ ] T036 [US3] Implement updateExtractedTransaction action for inline editing
- [ ] T037 [US3] Add select/deselect functionality for individual transactions
- [ ] T038 [US3] Add "Reset" button to revert edits to original extracted values
- [ ] T039 [P] [US3] Create `components/bank-statements/column-mapper.tsx` - CSV column mapping UI
- [ ] T040 [US3] Implement mapCSVColumns action for manual column mapping

**Checkpoint**: User Story 3 complete - users can review and edit before import

---

## Phase 6: User Story 4 - Import Validated Transactions (Priority: P2)

**Goal**: Users can import validated transactions into the main transaction system

**Independent Test**: Import transactions and see them appear in main Transactions list

### Implementation for User Story 4

- [ ] T041 [US4] Implement importBankTransactions action in `app/(app)/bank-statements/actions.ts`
- [ ] T042 [US4] Create Transaction records with sourceType='bank-import' and sourceId=statementId
- [ ] T043 [US4] Generate and store transactionHash for each imported transaction
- [ ] T044 [US4] Implement atomic import with rollback on failure (Prisma transaction)
- [ ] T045 [US4] Add "Import All" button to preview page
- [ ] T046 [US4] Add "Import Selected" button for selective import
- [ ] T047 [P] [US4] Create `components/bank-statements/duplicate-warning.tsx` - duplicate alert
- [ ] T048 [US4] Add duplicate detection before import using transactionHash
- [ ] T049 [US4] Update BankStatement status to 'imported' after successful import
- [ ] T050 [US4] Show success message with count of imported transactions

**Checkpoint**: User Story 4 complete - full import flow working

---

## Phase 7: User Story 5 - Reconcile with Existing Invoices (Priority: P3)

**Goal**: System suggests matches between bank transactions and existing invoices

**Independent Test**: Import bank transactions, see match suggestions for transactions with similar amounts

### Implementation for User Story 5

- [ ] T051 [US5] Add matching algorithm to `lib/bank-statement-utils.ts` - findMatchingInvoices function
- [ ] T052 [US5] Implement amount matching (exact, in cents)
- [ ] T053 [US5] Implement date proximity matching (±7 days)
- [ ] T054 [US5] Add merchant name similarity scoring (optional boost)
- [ ] T055 [US5] Generate match suggestions during extraction and store in ExtractedTransaction
- [ ] T056 [P] [US5] Create `components/bank-statements/match-suggestion.tsx` - match suggestion UI
- [ ] T057 [US5] Add match suggestions display in transaction preview
- [ ] T058 [US5] Implement linkTransactionToInvoice action in `app/(app)/bank-statements/actions.ts`
- [ ] T059 [US5] Update Transaction.linkedTransactionId when link confirmed
- [ ] T060 [US5] Add linked transaction indicator in Transactions list and detail views

**Checkpoint**: User Story 5 complete - reconciliation feature available

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T061 [P] Add loading states and spinners to all async operations
- [ ] T062 [P] Add empty state UI for bank statements list
- [ ] T063 [P] Add responsive design adjustments for mobile views
- [ ] T064 Add keyboard navigation support in transaction preview table
- [ ] T065 Add toast notifications for success/error states using sonner
- [ ] T066 [P] Implement deleteBankStatement action with file cleanup
- [ ] T067 Add "Delete Statement" button with confirmation dialog
- [ ] T068 Run quickstart.md validation checklist
- [ ] T069 Update any affected existing components for consistency

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 and can proceed in parallel
  - US3 and US4 are both P2 and depend on US1+US2 being complete
  - US5 is P3 and depends on US4 being complete (needs imported transactions)
- **Polish (Phase 8)**: Can start after US4 is complete

### User Story Dependencies

```
US1 (Upload) ─────┬───► US3 (Review) ───► US4 (Import) ───► US5 (Reconcile)
                  │
US2 (Parse) ──────┘
```

- **User Story 1 (P1)**: After Foundational - No story dependencies
- **User Story 2 (P1)**: After Foundational - No story dependencies (parallel with US1)
- **User Story 3 (P2)**: Requires US1 + US2 (need uploaded and parsed statements)
- **User Story 4 (P2)**: Requires US3 (need reviewed transactions to import)
- **User Story 5 (P3)**: Requires US4 (need imported transactions to reconcile)

### Parallel Opportunities

- T001-T007 (Setup): T001-T005 schema changes can be done together
- T008-T013 (Foundational): T008, T009, T010, T013 can run in parallel
- US1: T014, T015 can run in parallel
- US3: T031-T034, T039 can run in parallel
- US4: T047 can run parallel with other US4 tasks
- US5: T056 can run parallel with other US5 tasks
- Polish: T061, T062, T063, T066 can run in parallel

---

## Parallel Example: User Story 3

```bash
# Launch all UI components together:
Task: "Create app/(app)/bank-statements/[statementId]/page.tsx - detail page"
Task: "Create components/bank-statements/transaction-preview.tsx - preview table"
Task: "Create components/bank-statements/transaction-row.tsx - editable row"
Task: "Create components/bank-statements/import-summary.tsx - totals summary"
Task: "Create components/bank-statements/column-mapper.tsx - CSV column mapping"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (schema changes)
2. Complete Phase 2: Foundational (parsers, utilities)
3. Complete Phase 3: User Story 1 (upload)
4. Complete Phase 4: User Story 2 (parsing)
5. **STOP and VALIDATE**: Test upload + parsing flow
6. Demo: Users can upload and see extracted transactions

### Core Feature (Add US3 + US4)

1. Complete MVP above
2. Complete Phase 5: User Story 3 (review/edit)
3. Complete Phase 6: User Story 4 (import)
4. **VALIDATE**: Full flow from upload to imported transactions
5. Deploy as complete bank import feature

### Full Feature (Add US5)

1. Complete Core Feature above
2. Complete Phase 7: User Story 5 (reconciliation)
3. Complete Phase 8: Polish
4. Full feature with reconciliation

---

## Task Summary

| Phase | Tasks | Parallelizable |
|-------|-------|----------------|
| Setup | 7 | 5 |
| Foundational | 6 | 4 |
| US1 (Upload) | 9 | 2 |
| US2 (Parse) | 8 | 0 |
| US3 (Review) | 10 | 5 |
| US4 (Import) | 10 | 1 |
| US5 (Reconcile) | 10 | 1 |
| Polish | 9 | 4 |
| **Total** | **69** | **22** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Use existing patterns from `/unsorted` and `/import/csv` pages
- Leverage existing LangChain infrastructure for PDF parsing
