# Implementation Plan: Canadian SaaS Transformation

**Branch**: `feat/canadian-saas-transformation` | **Date**: 2026-01-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/canadian-saas-transformation/spec.md`

## Summary

Transform TaxHacker from a self-hosted tool into a private Canadian SaaS with:
- Projects = Companies (multi-company per account)
- Canadian provincial tax system (GST/HST/PST/QST)
- Dual-mode: Self-hosted vs Cloud (centralized AI keys + billing)

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: Next.js 15, React 19, Prisma 6.x, Better Auth, Stripe
**Storage**: PostgreSQL via Prisma ORM
**Testing**: Vitest (unit), Playwright (e2e)
**Target Platform**: Web application, Vercel deployment
**Project Type**: Next.js App Router monolith
**Performance Goals**: Standard web app performance (<3s initial load)
**Constraints**: Canadian data residency preferred, PIPEDA compliance
**Scale/Scope**: Small business users, 1-10 companies per account

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] I. Canadian-First Design - Primary objective of transformation
- [x] II. Multi-Tenant Architecture - Projects become companies
- [x] III. Dual-Mode Operation - Cloud vs self-hosted behavior split
- [x] IV. Privacy & Compliance - No new privacy risks introduced
- [x] V. Simplicity - Province selector auto-populates taxes, minimal user input

## Project Structure

### Source Code (existing Next.js structure)

```text
src/
├── app/                    # Next.js App Router routes
│   └── (app)/
│       └── settings/
│           └── projects/
│               └── [code]/
│                   └── page.tsx  # NEW: Project business details
├── components/
│   └── settings/
│       └── project-business-details-form.tsx  # NEW
├── lib/
│   ├── canadian-taxes.ts   # NEW: Tax rates and calculations
│   ├── config.ts           # MODIFY: Already has selfHosted config
│   └── stripe.ts           # MODIFY: Plan definitions
├── models/
│   └── settings.ts         # MODIFY: getLLMSettings cloud fallback
├── forms/
│   └── settings.ts         # MODIFY: Add project form schema
└── scripts/
    └── migrate-business-to-projects.ts  # NEW: Migration script

prisma/
└── schema.prisma           # MODIFY: Project model business fields
```

## Implementation Phases

### Phase 1: Database Schema Changes (Foundation)

1. Add business detail fields to Project model in Prisma schema
2. Add Canadian tax configuration fields (province, taxNumber, qstNumber)
3. Add currency and fiscal settings
4. Run migration

**Files Modified**:
- `prisma/schema.prisma`

### Phase 2: Canadian Tax Utilities

1. Create `lib/canadian-taxes.ts` with province data and tax calculations
2. Export province list, tax rates, calculation functions
3. Handle Quebec's special QST calculation (GST-inclusive base)

**Files Created**:
- `lib/canadian-taxes.ts`

### Phase 3: LLM Settings Conditional Display

1. Update `getLLMSettings` to use centralized keys in cloud mode
2. Hide LLM settings link in settings layout for cloud mode
3. Add redirect guard on LLM settings page

**Files Modified**:
- `models/settings.ts`
- `app/(app)/settings/layout.tsx`
- `app/(app)/settings/llm/page.tsx`

### Phase 4: Project Business Details UI

1. Create project settings page with business details form
2. Add province selector with auto-populated tax rates
3. Add form schema for project business details

**Files Created**:
- `app/(app)/settings/projects/[code]/page.tsx`
- `components/settings/project-business-details-form.tsx`

**Files Modified**:
- `forms/settings.ts`

### Phase 5: Data Migration Script

1. Create script to migrate User business fields to Project
2. Handle users with no projects (create default)
3. Preserve existing data

**Files Created**:
- `scripts/migrate-business-to-projects.ts`

### Phase 6: Stripe Billing Activation

1. Define Canadian-focused plans (Starter, Professional)
2. Set up usage tracking for billing limits

**Files Modified**:
- `lib/stripe.ts`

### Phase 7: Documentation Update

1. Update CLAUDE.md with Canadian SaaS context
2. Document deployment modes
3. Update project structure notes

**Files Modified**:
- `CLAUDE.md`

## Complexity Tracking

| Area | Complexity | Notes |
|------|------------|-------|
| Schema changes | Medium | Adding fields to existing model |
| Tax calculations | Low | Static data, simple math (except Quebec) |
| LLM conditional | Low | Config checks already exist |
| UI forms | Medium | New page and form component |
| Migration | Medium | Data transformation script |

## Risk Mitigation

1. **Data Migration**: Run migration script in staging first, backup before production
2. **Tax Accuracy**: Verify rates against CRA documentation
3. **Backward Compatibility**: Existing self-hosted users should not be affected
