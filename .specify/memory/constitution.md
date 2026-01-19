# TaxHacker Constitution

## Core Principles

### I. Canadian-First Design
- CAD as primary currency, USD as optional
- Provincial tax system support (GST/HST/PST/QST)
- Bilingual support (English/French) for Quebec compliance
- CRA-compatible export formats and reporting
- 7-year record retention per Canadian requirements

### II. Multi-Tenant Architecture
- One account supports multiple companies (Projects = Companies)
- Complete data isolation between projects
- Project-level business details, tax configuration, and settings
- Shared authentication with project-scoped access
- Per-project invoice numbering and templates

### III. Dual-Mode Operation
- Self-hosted mode: User provides own LLM API keys, full control
- Cloud mode: Centralized AI keys, Stripe billing, managed infrastructure
- Feature parity between modes where possible
- Clear visual distinction of current mode
- Mode-specific settings visibility (LLM settings hidden in cloud mode)

### IV. Privacy & Compliance
- PIPEDA/LPRPDE compliance for Canadian personal information
- Financial data encrypted at rest and in transit
- Audit trail for all financial document operations
- User-controlled data export and deletion
- No third-party data sharing without explicit consent

### V. Simplicity
- Small business focus (sole proprietors to small teams)
- Guided setup with province selection wizard
- Auto-populated tax rates based on province
- Sensible defaults that work for most Canadian businesses
- Progressive disclosure of advanced features

## Technical Standards

### Data Model
- Business details belong to Project, not User
- Transactions always associated with a project
- Settings support both global (user) and project-level scopes
- Currency stored with original amount and converted CAD amount

### API Design
- Server Actions for forms and CRUD operations
- Type safety with Zod validation
- Parameterized queries for security
- Rate limiting on public endpoints

### Code Quality
- TypeScript strict mode, ES Modules only
- Biome for linting and formatting
- Conventional commits required
- Feature-based folder structure

## Governance

- Constitution principles guide all design decisions
- Privacy and compliance requirements are non-negotiable
- Simplicity over feature richness
- Canadian regulatory requirements take precedence

**Version**: 1.0.0 | **Ratified**: 2026-01-18 | **Last Amended**: 2026-01-18
