# Feature Specification: Bank Statement Import & Analysis

**Feature Branch**: `001-bank-statement-import`
**Created**: 2026-01-18
**Status**: Draft
**Input**: Ajouter un nouvel onglet pour analyser les relevés bancaires (bank statements) à partir de fichiers PDF ou CSV. Extraire automatiquement l'historique des transactions bancaires et les importer dans le système.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload Bank Statement File (Priority: P1)

As a user, I want to upload a bank statement file (PDF or CSV) so that I can import my bank transactions into the system without manual data entry.

**Why this priority**: This is the entry point for the entire feature. Without file upload, no other functionality can work. It provides immediate value by accepting user's bank documents.

**Independent Test**: Can be fully tested by uploading a PDF or CSV file and seeing it accepted by the system with a success message.

**Acceptance Scenarios**:

1. **Given** I am on the Bank Statements tab, **When** I upload a valid PDF bank statement, **Then** the system accepts the file and shows a processing indicator
2. **Given** I am on the Bank Statements tab, **When** I upload a valid CSV bank statement, **Then** the system accepts the file and shows a processing indicator
3. **Given** I am on the Bank Statements tab, **When** I upload an unsupported file type (e.g., .doc), **Then** the system displays an error message indicating only PDF and CSV are supported
4. **Given** I am on the Bank Statements tab, **When** I upload a file larger than 10MB, **Then** the system displays an error message about file size limit

---

### User Story 2 - Parse and Extract Transactions (Priority: P1)

As a user, I want the system to automatically extract transaction data from my uploaded bank statement so that I don't have to manually enter each transaction.

**Why this priority**: Core value proposition - automatic extraction saves users significant time. Without parsing, the feature is just a file storage system.

**Independent Test**: Can be tested by uploading a bank statement and verifying that transactions are extracted and displayed in a preview list.

**Acceptance Scenarios**:

1. **Given** I have uploaded a PDF bank statement, **When** the system finishes processing, **Then** I see a list of extracted transactions with date, description, and amount
2. **Given** I have uploaded a CSV bank statement, **When** the system finishes processing, **Then** I see a list of extracted transactions mapped from the CSV columns
3. **Given** the system cannot parse a file, **When** extraction fails, **Then** I see a clear error message with suggestions (e.g., "Try a different file format" or "Manual entry available")
4. **Given** a transaction has ambiguous data, **When** displayed in preview, **Then** the transaction is flagged for user review

---

### User Story 3 - Review and Validate Extracted Transactions (Priority: P2)

As a user, I want to review and edit extracted transactions before importing so that I can correct any parsing errors and ensure data accuracy.

**Why this priority**: Users need control over their data before it enters the system. This builds trust and ensures data quality.

**Independent Test**: Can be tested by viewing extracted transactions, editing a transaction, and seeing the changes reflected before import.

**Acceptance Scenarios**:

1. **Given** I see a list of extracted transactions, **When** I click on a transaction, **Then** I can edit the date, description, amount, and type (debit/credit)
2. **Given** I see a list of extracted transactions, **When** I select multiple transactions, **Then** I can delete them from the import batch
3. **Given** I see a list of extracted transactions, **When** I review the total, **Then** I see a summary showing total debits, total credits, and net amount
4. **Given** I have made edits to transactions, **When** I click "Reset", **Then** the transactions revert to their originally extracted values

---

### User Story 4 - Import Validated Transactions (Priority: P2)

As a user, I want to import validated transactions into the system so that they appear in my transaction history alongside invoice-based transactions.

**Why this priority**: This completes the import flow and delivers the core value of having bank transactions in the system.

**Independent Test**: Can be tested by confirming import of validated transactions and seeing them appear in the main transactions list.

**Acceptance Scenarios**:

1. **Given** I have reviewed my extracted transactions, **When** I click "Import All", **Then** all transactions are saved to the system
2. **Given** I have selected specific transactions, **When** I click "Import Selected", **Then** only selected transactions are saved
3. **Given** import is in progress, **When** an error occurs, **Then** no partial data is saved and I see a clear error message
4. **Given** import completes successfully, **When** I navigate to Transactions, **Then** I see my imported bank transactions with a "Bank Import" source indicator

---

### User Story 5 - Reconcile with Existing Invoices (Priority: P3)

As a user, I want the system to suggest matches between bank transactions and existing invoices so that I can reconcile my records.

**Why this priority**: Advanced feature that adds significant value but requires the basic import flow to work first. Can be shipped as an enhancement.

**Independent Test**: Can be tested by importing bank transactions and seeing match suggestions appear next to transactions that closely match existing invoices.

**Acceptance Scenarios**:

1. **Given** I have imported bank transactions, **When** a transaction amount matches an invoice total, **Then** the system suggests the invoice as a potential match
2. **Given** I see a suggested match, **When** I confirm the match, **Then** the transaction is linked to the invoice
3. **Given** I see a suggested match, **When** I reject the match, **Then** the suggestion is dismissed and the transaction remains unlinked
4. **Given** I have a linked transaction-invoice pair, **When** I view either record, **Then** I can see the linked counterpart

---

### Edge Cases

- What happens when the PDF is password-protected? → Display error asking user to provide an unprotected file
- What happens when the CSV has non-standard column headers? → Allow user to manually map columns to expected fields
- How does the system handle duplicate transactions from the same statement uploaded twice? → Detect duplicates by date+amount+description hash and warn user before import
- What happens when the bank statement contains transactions in a foreign currency? → Extract as-is and allow user to set the currency during review
- How does the system handle multi-page PDF statements? → Process all pages and combine transactions into a single list
- What happens when the statement period overlaps with previously imported statements? → Show warning about potential duplicates and highlight matching transactions

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept PDF and CSV file uploads on the Bank Statements tab
- **FR-002**: System MUST limit file uploads to 10MB maximum size
- **FR-003**: System MUST extract transaction date, description, amount, and type (debit/credit) from uploaded files
- **FR-004**: System MUST display extracted transactions in a preview table before import
- **FR-005**: System MUST allow users to edit transaction fields (date, description, amount, type) before import
- **FR-006**: System MUST allow users to select/deselect individual transactions for import
- **FR-007**: System MUST show a summary of total debits, credits, and net amount for the batch
- **FR-008**: System MUST save imported transactions to the existing transaction storage
- **FR-009**: System MUST mark imported transactions with a source indicator ("Bank Import")
- **FR-010**: System MUST detect potential duplicate transactions based on date, amount, and description
- **FR-011**: System SHOULD suggest invoice matches based on amount and date proximity
- **FR-012**: System MUST allow users to link bank transactions to existing invoices/transactions
- **FR-013**: System MUST display clear error messages when file parsing fails
- **FR-014**: System MUST support CSV files with common delimiters (comma, semicolon, tab)
- **FR-015**: System MUST handle bank statements with transactions in the user's configured currencies

### Key Entities

- **BankStatement**: Represents an uploaded bank statement file. Contains: file reference, upload date, bank name (if detectable), statement period (start/end dates), processing status, transaction count
- **BankTransaction**: Represents a single extracted transaction before import. Contains: date, description, amount, currency, type (debit/credit), source statement reference, import status, confidence score (for AI-extracted data)
- **Transaction** (existing): The current transaction entity will be extended to support: source type (invoice/bank-import), linked transaction reference (for reconciliation)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can upload a bank statement and see extracted transactions within 30 seconds for files under 5MB
- **SC-002**: 80% of transactions from standard bank PDFs are correctly extracted without manual correction
- **SC-003**: Users can complete the full import flow (upload → review → import) in under 5 minutes for a typical monthly statement (50-100 transactions)
- **SC-004**: Duplicate detection correctly identifies 95% of re-uploaded transactions
- **SC-005**: 70% of matching invoice suggestions are confirmed by users as correct matches
- **SC-006**: Zero data loss during import - all validated transactions are saved completely or the operation is fully rolled back

## Assumptions

- Bank statements follow common formats used by major banks (standard date formats, clear debit/credit indicators)
- Users have access to unencrypted/unprotected PDF files or can export CSV from their banking portal
- The existing transaction system can accommodate a new source type without major restructuring
- LLM/AI parsing can be leveraged for PDF extraction similar to existing invoice parsing functionality
- CSV files will have headers or a consistent column structure that can be detected or mapped
- The new Bank Statements tab will be added to the existing navigation alongside the current tabs
