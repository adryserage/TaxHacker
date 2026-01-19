# Tasks: Canadian SaaS Transformation

**Input**: Design documents from `/specs/canadian-saas-transformation/`
**Prerequisites**: plan.md (required), spec.md (required)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)

---

## Phase 1: Database Schema (Foundation)

**Purpose**: Add business and tax fields to Project model - BLOCKS all user stories

- [ ] T001 [US1] Add business detail fields to Project model in `prisma/schema.prisma`
- [ ] T002 [US1] Add Canadian tax configuration fields to Project model in `prisma/schema.prisma`
- [ ] T003 [US1] Add currency and fiscal settings to Project model in `prisma/schema.prisma`
- [ ] T004 [US1] Run `bunx prisma db push` to apply schema changes

**Checkpoint**: Database schema updated with all new Project fields

---

## Phase 2: Canadian Tax Utilities

**Purpose**: Create tax calculation library for all provinces

- [ ] T005 [P] [US3] Create `lib/canadian-taxes.ts` with province constants
- [ ] T006 [US3] Add tax rate data for all 13 provinces/territories
- [ ] T007 [US3] Implement `calculateTaxes` function with Quebec special handling
- [ ] T008 [US3] Export helper functions for province lookup and validation

**Checkpoint**: Tax utilities ready for use in forms and calculations

---

## Phase 3: User Story 1 - Multi-Company Management (Priority: P1)

**Goal**: Projects can store business details and tax configuration

### Implementation

- [ ] T009 [US1] Create project form schema in `forms/settings.ts`
- [ ] T010 [US1] Create `components/settings/project-business-details-form.tsx`
- [ ] T011 [US1] Create `app/(app)/settings/projects/[code]/page.tsx`
- [ ] T012 [US1] Add province selector with auto-populated tax rates
- [ ] T013 [US1] Add GST/HST number input field
- [ ] T014 [US1] Add QST number field (shown only for Quebec)
- [ ] T015 [US1] Create server action for saving project business details

**Checkpoint**: Users can create/edit projects with business details and tax config

---

## Phase 4: User Story 2 - Dual-Mode Operation (Priority: P2)

**Goal**: Cloud mode hides LLM settings and uses centralized keys

### Implementation

- [ ] T016 [US2] Update `getLLMSettings` in `models/settings.ts` for cloud mode fallback
- [ ] T017 [US2] Update `app/(app)/settings/layout.tsx` to conditionally show LLM link
- [ ] T018 [US2] Add redirect guard in `app/(app)/settings/llm/page.tsx`
- [ ] T019 [US2] Verify cloud mode uses centralized API keys from environment

**Checkpoint**: Cloud users see simplified settings, self-hosted users unchanged

---

## Phase 5: User Story 3 - Canadian Tax Calculations (Priority: P2)

**Goal**: Correct tax calculations for all provinces

**Note**: Utilities created in Phase 2, this phase focuses on integration

- [ ] T020 [US3] Add tax calculation to invoice generation (if applicable)
- [ ] T021 [US3] Add tax breakdown display in transaction views
- [ ] T022 [US3] Verify Quebec QST calculation (GST-inclusive base)

**Checkpoint**: Tax calculations work correctly for all provinces

---

## Phase 6: User Story 4 - Project Business Details UI (Priority: P3)

**Goal**: Polished UI for managing company details

**Note**: Most implementation done in Phase 3, this focuses on polish

- [ ] T023 [US4] Add logo upload functionality to business details form
- [ ] T024 [US4] Add fiscal year start selector
- [ ] T025 [US4] Add form validation with user-friendly error messages
- [ ] T026 [US4] Add success/error toast notifications

**Checkpoint**: Complete business details management experience

---

## Phase 7: Data Migration

**Purpose**: Migrate existing business data from User to Project

- [ ] T027 Create `scripts/migrate-business-to-projects.ts`
- [ ] T028 Handle users with no projects (create default project)
- [ ] T029 Copy User business fields to first/default Project
- [ ] T030 Add dry-run mode for testing migration

**Checkpoint**: Migration script ready for production use

---

## Phase 8: User Story 5 - Stripe Billing (Priority: P4)

**Goal**: Subscription plans with Canadian pricing

- [ ] T031 [US5] Update `lib/stripe.ts` with Starter/Professional plans
- [ ] T032 [US5] Define plan limits (storage, AI usage, projects)
- [ ] T033 [P] [US5] Create `lib/usage-tracking.ts` for billing metrics
- [ ] T034 [US5] Add plan limit enforcement checks

**Checkpoint**: Billing infrastructure ready (Stripe webhook integration separate)

---

## Phase 9: Documentation & Polish

- [ ] T035 [P] Update `CLAUDE.md` with Canadian SaaS context
- [ ] T036 [P] Update project README with new features
- [ ] T037 Run `bun run lint` and fix any issues
- [ ] T038 Run `bun run typecheck` and fix any issues
- [ ] T039 Run `bun run build` and verify success

**Checkpoint**: All validation passes, documentation updated

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Phase 1 (Schema)**: No dependencies - start first, BLOCKS all others
2. **Phase 2 (Tax Utils)**: Can start after Phase 1
3. **Phase 3 (US1 - Multi-Company)**: Depends on Phase 1 + 2
4. **Phase 4 (US2 - Dual Mode)**: Depends on Phase 1
5. **Phase 5 (US3 - Tax Calcs)**: Depends on Phase 2 + 3
6. **Phase 6 (US4 - UI Polish)**: Depends on Phase 3
7. **Phase 7 (Migration)**: Depends on Phase 1
8. **Phase 8 (US5 - Billing)**: Depends on Phase 1
9. **Phase 9 (Polish)**: After all implementation complete

### Parallel Opportunities

- T005-T008 (tax utils) can run parallel to T009-T015 (US1 implementation)
- T016-T019 (dual mode) can run parallel to T020-T022 (tax integration)
- T027-T030 (migration) can run parallel to T031-T034 (billing)
- All [P] marked tasks can run in parallel

---

## Implementation Strategy

### MVP First (User Stories 1-2)

1. Complete Phase 1: Schema changes
2. Complete Phase 2: Tax utilities
3. Complete Phase 3: US1 - Multi-company
4. Complete Phase 4: US2 - Dual mode
5. **VALIDATE**: Test project creation and mode switching

### Full Implementation

Continue with Phases 5-9 after MVP validation.

---

## Notes

- Commit after each phase or logical task group
- Run lint/typecheck after each phase
- Quebec requires special handling (QST calculated on GST-inclusive amount)
- Self-hosted users should not notice any breaking changes
- Cloud mode changes are additive, not breaking
