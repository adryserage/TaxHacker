# TaxHacker Development Guidelines

**Private Canadian SaaS** - AI-powered bookkeeping for Canadian small businesses.

Last updated: 2026-01-18

## Product Overview

TaxHacker is a private Canadian SaaS application for small business accounting:
- **Multi-company support**: Each Project represents a separate company
- **Canadian tax system**: GST/HST/PST/QST calculations for all provinces
- **Dual-mode operation**: Self-hosted (user API keys) vs Cloud (centralized billing)
- **AI-powered**: Document parsing, categorization, and analysis

## Deployment Modes

| Mode | Environment Variable | Description |
|------|---------------------|-------------|
| **Self-hosted** | `SELF_HOSTED_MODE=true` | User provides LLM API keys, full control |
| **Cloud** | `SELF_HOSTED_MODE=false` | Centralized AI keys, Stripe billing, managed |

### Mode Differences

| Feature | Self-hosted | Cloud |
|---------|-------------|-------|
| LLM Settings | Visible | Hidden |
| API Keys | User-provided | Centralized |
| Billing | None | Stripe subscription |
| Signup | Disabled | Enabled |

## Technologies

- **Framework**: Next.js 15 (App Router), React 19
- **Language**: TypeScript 5.x strict mode
- **Database**: PostgreSQL via Prisma 6.x
- **Auth**: Better Auth with OTP
- **AI**: LangChain, Google Gemini, OpenAI
- **Styling**: Tailwind CSS, shadcn/ui
- **Package Manager**: bun (mandatory)
- **Linting**: Biome

## Project Structure

```text
app/                    # Next.js App Router
├── (app)/              # Authenticated routes
│   └── settings/
│       └── projects/
│           └── [code]/ # Project business details
├── (auth)/             # Authentication routes
│   └── self-hosted/    # Self-hosted setup
components/
├── forms/              # Form components
├── settings/           # Settings forms
├── ui/                 # shadcn/ui components
lib/
├── canadian-taxes.ts   # Provincial tax calculations
├── config.ts           # Environment configuration
├── stripe.ts           # Billing plans
models/                 # Database access layer
forms/                  # Zod form schemas
prisma/
├── schema.prisma       # Database schema
└── client/             # Generated Prisma client
scripts/
└── migrate-business-to-projects.ts  # Migration utility
```

## Key Concepts

### Project = Company

Projects represent separate companies with:
- Business details (name, address, logo, bank details)
- Tax configuration (province, GST/HST number, QST number)
- Financial settings (currency, fiscal year)

### Canadian Tax System

```typescript
// lib/canadian-taxes.ts
import { calculateTaxes, getProvinceOptions } from "@/lib/canadian-taxes"

// Calculate taxes for Ontario
const taxes = calculateTaxes(10000, "ON") // $100.00 -> $113.00 (13% HST)

// Quebec special case: QST on GST-inclusive amount
const qcTaxes = calculateTaxes(10000, "QC") // $100.00 -> $114.98
```

## Commands

```bash
# Development
bun run dev

# Validation (run before commits)
bun run lint
bun run typecheck
bun run build

# Database
bunx prisma generate    # Generate client
bunx prisma db push     # Apply schema changes

# Migration scripts
DRY_RUN=true bunx tsx scripts/migrate-business-to-projects.ts
```

## Important Files

| File | Purpose |
|------|---------|
| `lib/config.ts` | Environment configuration, selfHosted mode |
| `lib/canadian-taxes.ts` | Provincial tax rates and calculations |
| `lib/stripe.ts` | Billing plans and limits |
| `models/settings.ts` | User/project settings, LLM configuration |
| `prisma/schema.prisma` | Database schema |

## Recent Changes

- Canadian SaaS transformation: Multi-company support, provincial taxes
- LLM settings hidden in cloud mode
- Project business details page
- Stripe billing plans (Starter $15/mo, Professional $49/mo)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
