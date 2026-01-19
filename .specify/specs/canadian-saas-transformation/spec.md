# Feature Specification: Canadian SaaS Transformation

**Feature Branch**: `feat/canadian-saas-transformation`
**Created**: 2026-01-18
**Status**: Active
**Input**: Transform TaxHacker from self-hosted tool into private Canadian SaaS

## User Scenarios & Testing

### User Story 1 - Multi-Company Management (Priority: P1)

As a Canadian small business owner with multiple companies, I want to manage each company as a separate project with its own business details, tax configuration, and financial data, so that I can keep my businesses organized and compliant.

**Why this priority**: Core architectural change that enables all other features. Projects must become companies before any other Canadian-specific features can be built.

**Independent Test**: Can be fully tested by creating a new project, configuring business details and province, and verifying tax rates auto-populate.

**Acceptance Scenarios**:

1. **Given** a user with an account, **When** they create a new project, **Then** they can enter business name, address, logo, and bank details
2. **Given** a project being set up, **When** user selects a province, **Then** applicable tax rates (GST/HST/PST/QST) auto-populate
3. **Given** an Ontario company, **When** viewing tax configuration, **Then** HST rate of 13% is shown
4. **Given** a Quebec company, **When** viewing tax configuration, **Then** GST (5%) and QST (9.975%) rates are shown with QST number field

---

### User Story 2 - Dual-Mode Operation (Priority: P2)

As a user, I want the application to behave differently based on whether I'm using self-hosted or cloud mode, so that cloud users don't see unnecessary LLM configuration and benefit from centralized AI services.

**Why this priority**: Enables SaaS business model by hiding complexity from cloud users and enabling billing.

**Independent Test**: Can be tested by checking settings menu in both modes - LLM settings should appear in self-hosted mode and be hidden in cloud mode.

**Acceptance Scenarios**:

1. **Given** cloud mode is enabled, **When** user navigates to settings, **Then** LLM settings link is not visible
2. **Given** cloud mode is enabled, **When** user tries to access /settings/llm directly, **Then** they are redirected to /settings
3. **Given** self-hosted mode is enabled, **When** user navigates to settings, **Then** LLM settings link is visible and functional
4. **Given** cloud mode is enabled, **When** AI features are used, **Then** centralized API keys from environment are used

---

### User Story 3 - Canadian Tax Calculations (Priority: P2)

As a Canadian business owner, I want the system to correctly calculate GST/HST/PST/QST based on my company's province, so that my invoices and reports are tax-compliant.

**Why this priority**: Essential for Canadian compliance and core value proposition.

**Independent Test**: Can be tested by creating invoices for companies in different provinces and verifying tax breakdowns.

**Acceptance Scenarios**:

1. **Given** an Ontario company with $100 sale, **When** calculating taxes, **Then** $13 HST is added (total $113)
2. **Given** a Quebec company with $100 sale, **When** calculating taxes, **Then** $5 GST + $10.47 QST is added (QST calculated on GST-inclusive amount)
3. **Given** a BC company with $100 sale, **When** calculating taxes, **Then** $5 GST + $7 PST is added (total $112)
4. **Given** an Alberta company with $100 sale, **When** calculating taxes, **Then** only $5 GST is added (total $105)

---

### User Story 4 - Project Business Details UI (Priority: P3)

As a business owner, I want a dedicated settings page to manage each company's business details, so that I can update information when needed.

**Why this priority**: User-facing UI for the core data model changes.

**Independent Test**: Can be tested by navigating to project settings, filling in business details form, and verifying data persists.

**Acceptance Scenarios**:

1. **Given** a user on project settings, **When** they fill in business details form, **Then** all fields (name, address, logo, bank details) are saved
2. **Given** a project with saved details, **When** user revisits the page, **Then** all previously saved details are pre-filled
3. **Given** a project settings page, **When** user changes province, **Then** tax rates update accordingly

---

### User Story 5 - Stripe Billing (Priority: P4)

As a cloud user, I want to subscribe to a plan that matches my business needs, so that I can use the service with appropriate limits.

**Why this priority**: Revenue generation for SaaS model, but requires other features first.

**Independent Test**: Can be tested by going through subscription flow and verifying plan limits are enforced.

**Acceptance Scenarios**:

1. **Given** a new cloud user, **When** they sign up, **Then** they can choose between Starter ($15/mo) and Professional ($49/mo) plans
2. **Given** a Starter plan user, **When** they reach 3 projects, **Then** they cannot create more projects without upgrading
3. **Given** a Professional plan user, **When** checking limits, **Then** they have unlimited projects and higher AI usage

---

### Edge Cases

- What happens when a user migrates existing data from self-hosted to cloud?
- How does the system handle province changes mid-fiscal-year?
- What happens when a Quebec company sells to an Ontario customer (place of supply rules)?
- How are historical transactions displayed if tax rates change?

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow Projects to store business details (name, address, bank details, logo)
- **FR-002**: System MUST support all 13 Canadian provinces/territories with correct tax rates
- **FR-003**: System MUST calculate taxes correctly for each province's tax system (HST, GST+PST, GST+QST, GST-only)
- **FR-004**: System MUST hide LLM settings in cloud mode
- **FR-005**: System MUST use centralized API keys for AI features in cloud mode
- **FR-006**: System MUST allow per-project currency configuration (default CAD)
- **FR-007**: System MUST support GST/HST number and QST number storage
- **FR-008**: System MUST provide migration path for existing business data from User to Project

### Key Entities

- **Project**: Represents a company with business details, tax configuration, currency, and fiscal settings
- **Province**: Reference data for Canadian provinces with tax rates and tax system type
- **Setting**: Key-value store supporting both global and project-scoped settings

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can create and configure a Canadian company project in under 5 minutes
- **SC-002**: Tax calculations match CRA requirements for all 13 provinces/territories
- **SC-003**: Cloud users see simplified interface without LLM configuration
- **SC-004**: All existing business data is successfully migrated to project level
- **SC-005**: Lint, typecheck, and build pass with zero errors
