# PerfAlly

> Professional performance and SEO audits for developers who sell consulting.
> Monitor your clients' sites. Generate impressive reports. Charge like a
> specialist.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Neon](https://img.shields.io/badge/Neon-PostgreSQL-green?style=flat-square)](https://neon.tech)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)

---

## What it does

PerfAlly runs PageSpeed Insights audits on your clients' sites and turns raw
Lighthouse data into deliverable reports. Each report includes a Site Health
score, failing SEO and accessibility items labeled in plain Portuguese,
AI-generated action plans with concrete implementation steps, and 25 weeks of
real-user trend data.

Building a website is no longer the challenge — maintaining speed and
performance at scale is.

---

## Current status

Phases 0 through 3 are complete.

| Phase | Description | Status |
|-------|-------------|--------|
| 0 — Foundation | Auth, DB, Vercel deploy, CI | ✅ Done |
| 1 — MVP | URL → audit → report, free tier | ✅ Done |
| 2 — Pro | Stripe billing, scheduled monitoring, email alerts, history charts, AI action plans, SEO/accessibility audits, multi-page scanning, CrUX 25-week data | ✅ Done |
| 3 — Agency | PDF reports, white-label, multi-user teams | ✅ Done (requires `BLOB_READ_WRITE_TOKEN` + Clerk Organizations enabled in the dashboard) |
| 4 — Growth | `/check` public analyzer, Slack alerts, embeddable badge | Planned |

---

## Features

### Grátis (R$0)

- 1 project, 2 pages per project, 5 manual audits per month
- Site Health score — composite of perf×0.4 + SEO×0.3 + accessibility×0.3
- Core Web Vitals: LCP, INP, CLS, FCP, and TTFB with CrUX P75 real-user
  field data
- SEO and accessibility failing audit items with Portuguese labels
- Resource diagnostics: transfer size, render-blocking resources, image
  savings, and JS execution
- Static action plan (rule-based, from the Lighthouse audit list)
- Public share link (`/share/[token]`)
- 7-day history

### Freelancer (R$89/month)

- 5 projects, 10 pages per project
- Daily scheduled monitoring
- Email alerts when metrics degrade (configurable thresholds per metric per
  project)
- AI action plans: 5 per month — stack-aware, Portuguese output, powered by
  Claude Haiku
- 30-day history

### Studio (R$199/month)

- 20 projects, 50 pages per project
- Hourly scheduled monitoring
- AI action plans: 30 per month — powered by Claude Sonnet (higher quality
  than Freelancer)
- PDF reports
- 90-day history

### Agência (R$449/month)

- 100 projects, unlimited pages per project
- Unlimited AI action plans — Claude Sonnet
- White-label PDF reports (custom logo, color, and footer)
- Multi-user teams via Clerk Organizations
- 1-year history

---

## AI action plans

Each audit includes an AI-generated section with 4–6 prioritized
recommendations. The AI:

- Detects the tech stack from Lighthouse `stackPacks` (Next.js, Nuxt,
  WordPress, and others)
- References actual failing resources by name — no generic advice
- Provides concrete `steps[]` per recommendation, including terminal commands
  and code snippets
- Renders backtick-wrapped code as styled `<code>` blocks in the UI
- Outputs in Portuguese throughout
- Falls back to the static rule-based plan for free users, quota exhaustion,
  or API failure

| Plan | Model | Plans per month |
|------|-------|-----------------|
| Grátis | — | 0 (static only) |
| Freelancer | Claude Haiku | 5 |
| Studio | Claude Sonnet | 30 |
| Agência | Claude Sonnet | Unlimited |

---

## Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16.1.6 + React 19, App Router | Server Components + Server Actions |
| Styling | Tailwind CSS v4 + shadcn/ui (new-york) | CSS-based config (`@import "tailwindcss"`) |
| Database | Neon (serverless PostgreSQL) + Drizzle ORM | Auto-suspend, Vercel native integration, DB branching |
| Auth | Clerk v6 | Built-in orgs for Agency plan teams, webhook sync |
| Payments | Stripe | Subscriptions + Customer Portal |
| Email | Resend + React Email | Alert emails, weekly digests |
| Jobs | Upstash QStash + Vercel Cron | Fan-out scheduled audit jobs per project |
| Cache | Upstash Redis | Rate limiting, PSI response cache, deduplication |
| Storage | Vercel Blob | PDF reports, logos |
| AI | Claude Haiku / Sonnet (Anthropic) | Tiered by plan — Haiku for Freelancer, Sonnet for Studio and Agency |
| Charts | Recharts | Score history + CrUX 25-week field data view |
| Data | PageSpeed Insights API v5 + CrUX History API | Lighthouse lab + real-user data in one call |
| Monitoring | Sentry | Error tracking |
| Deployment | Vercel | Serverless functions, cron, blob storage |

---

## Project structure

```
src/
├── app/
│   ├── (auth)/                    # Sign-in / sign-up pages (Clerk)
│   ├── (dashboard)/               # Protected app routes
│   │   ├── dashboard/             # Project list
│   │   ├── projects/[id]/         # Project detail, per-page tabs, audit history
│   │   └── settings/              # Billing, alert thresholds
│   │       └── branding-section.tsx   # Agency logo, color, contact form
│   ├── (marketing)/               # Landing page (/)
│   ├── share/[token]/             # Public read-only audit report
│   └── api/
│       ├── webhooks/stripe/       # Subscription lifecycle
│       ├── webhooks/clerk/        # User sync to DB
│       ├── upload/logo/           # Logo upload → Vercel Blob (local dev fallback)
│       ├── projects/[id]/audit/   # Manual audit trigger
│       ├── projects/[id]/reports/ # PDF generation + Vercel Blob upload + history
│       ├── cron/trigger-audits/   # Vercel Cron → QStash fan-out
│       └── jobs/run-audit/        # QStash job handler
├── components/
│   ├── metrics/
│   │   ├── SiteHealthCard.tsx     # 2×2 composite score grid (headline)
│   │   ├── MetricCard.tsx         # Individual CWV card (lab + field values)
│   │   ├── ScoreGauge.tsx         # Circular SVG gauge 0–100
│   │   ├── ActionPlan.tsx         # AI + static action plan with inline code rendering
│   │   ├── AuditList.tsx          # Collapsible full Lighthouse audit list
│   │   ├── SEOAuditList.tsx       # Failing SEO + accessibility items (Portuguese)
│   │   ├── DiagnosticsGrid.tsx    # Resource breakdown: transfer size, blocking, savings
│   │   ├── ScoreHistoryChart.tsx  # Line chart + CrUX 25-week real-user toggle
│   │   └── RunAuditButton.tsx     # Button with free-tier run counter
│   ├── projects/
│   │   ├── PageTabs.tsx           # Sub-page navigation tabs
│   │   ├── ScheduleSelector.tsx   # Daily / hourly monitoring toggle
│   │   ├── AlertThresholds.tsx    # Per-project alert threshold config
│   │   ├── DownloadPDFButton.tsx  # PDF download (Studio + Agência)
│   │   └── ReportHistory.tsx      # Past PDF reports list with download links
│   └── layout/
│       └── org-switcher.tsx       # Clerk OrganizationSwitcher (Agency plan only)
├── lib/
│   ├── api/
│   │   ├── pagespeed.ts           # PSI API client (all 4 Lighthouse categories)
│   │   └── crux-history.ts        # CrUX History API (25-week P75 data)
│   ├── ai/
│   │   └── action-plan.ts         # AI action plan generation (tiered model per plan)
│   ├── db/
│   │   ├── index.ts               # Drizzle + Neon client
│   │   └── schema.ts              # Single source of truth for all tables
│   ├── utils/
│   │   ├── metrics.ts             # CWV thresholds, gradeMetric, GRADE_STYLES
│   │   ├── plan-limits.ts         # PLAN_LIMITS per tier
│   │   ├── explanations.ts        # Static action plan fallback
│   │   ├── schedule.ts            # nextNoonBRT, tomorrowNoonBRT
│   │   └── get-plan.ts            # Shared getUserPlan(userId) helper
│   ├── alerts.ts                  # checkAndFireAlerts (threshold check + Resend)
│   ├── audit-runner.ts            # runAuditForProject (shared: manual + cron)
│   └── stripe.ts                  # Stripe client singleton
├── app/actions/
│   ├── projects.ts                # createProjectAction, deleteProjectAction
│   ├── billing.ts                 # createCheckoutSession, createBillingPortalSession
│   ├── alerts.ts                  # updateAlertThresholdsAction
│   ├── schedule.ts                # updateScheduleAction
│   └── branding.ts                # updateBrandingAction (Agency plan)
├── emails/
│   └── alert-email.tsx            # React Email alert template
├── types/
│   └── index.ts                   # PSIAuditData, LighthouseResult, AIActionItem
├── env.ts                         # Typed env validation (@t3-oss/env-nextjs + Zod)
└── proxy.ts                       # Clerk middleware (Next.js 16: proxy.ts, not middleware.ts)
```

---

## Local development

### Prerequisites

- Node.js 20+ and pnpm
- Accounts: [Neon](https://neon.tech), [Clerk](https://clerk.com), and
  [Google Cloud](https://console.cloud.google.com) (for the PSI and CrUX API
  key)

### 1. Clone and install

```bash
git clone https://github.com/fepucinelli/perf-ally.git
cd perf-ally
pnpm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Minimum required to run locally:

```env
# Database (Neon)
DATABASE_URL=postgresql://...

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Google PSI + CrUX APIs
GOOGLE_API_KEY=AIza...

# AI — optional, falls back to static plan if missing
ANTHROPIC_API_KEY=sk-ant-...
```

Full Phase 2 features (billing and alerts) also require:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...   # Freelancer R$89
STRIPE_PRO_PRICE_ID=price_...       # Studio R$199
STRIPE_AGENCY_PRICE_ID=price_...    # Agência R$449
RESEND_API_KEY=re_...
```

Phase 3 features (PDF storage and white-label) also require:

```env
# Vercel Blob (PDF reports + logo uploads)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...   # Obtain via: vercel env pull
```

**Note:** Without `BLOB_READ_WRITE_TOKEN`, logo uploads fall back to
`public/uploads/` (local dev only), and PDFs stream as direct downloads
without being saved.

### 3. Database setup

```bash
# Push schema to your Neon database
pnpm exec drizzle-kit push --force

# Inspect data visually
pnpm db:studio
```

**Note:** Use `pnpm exec drizzle-kit push --force` directly — `pnpm db:push`
may fail due to double-dash argument parsing in pnpm scripts.

### 4. Start the dev server

```bash
pnpm dev
```

Visit `http://localhost:3000`. Sign up, create a project, add pages, run an
audit, and view the report.

### 5. Local Stripe webhooks (optional)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the printed whsec_... to STRIPE_WEBHOOK_SECRET in .env.local
```

### Common commands

```bash
pnpm dev                             # Start dev server
pnpm build                           # Production build
pnpm lint                            # ESLint
pnpm exec tsc --noEmit              # Type check
pnpm exec drizzle-kit push --force  # Push schema changes to DB
pnpm db:studio                       # Drizzle Studio (visual DB explorer)
```

---

## How audits work

```
User clicks "Run Audit"
  → POST /api/projects/[id]/audit  { pageId }
    → Verify project + page ownership
    → PSI API call (all 4 Lighthouse categories: performance, SEO,
        accessibility, best-practices)
    → DB insert — perf/SEO/accessibility scores + Lighthouse JSON +
        CrUX P75 field data
    → Check alert thresholds → send email via Resend if exceeded
    → Fire-and-forget: CrUX History API (25 weeks) → update row
    → Await: generate AI action plan (Claude, tiered by plan) → update row
    → Return new audit result → client calls router.refresh()

Vercel Cron (hourly)
  → POST /api/cron/trigger-audits
    → Query projects where nextAuditAt ≤ now
    → Enqueue one QStash job per project per page
      → POST /api/jobs/run-audit?projectId=xxx&pageId=yyy
          → Same runAuditForProject() as the manual flow above
```

---

## Known gotchas

- **`proxy.ts` not `middleware.ts`** — Next.js 16 Clerk middleware lives in
  `src/proxy.ts`.
- **`timestamptz` not exported** — Drizzle ORM v0.45 doesn't export it; use
  a local alias:
  `const timestamptz = (name: string) => timestamp(name, { withTimezone: true })`.
- **drizzle-kit doesn't load `.env.local`** — `drizzle.config.ts` manually
  calls `config({ path: ".env.local" })` from dotenv.
- **PSI multiple categories** — `URLSearchParams` can't duplicate keys via
  spread; use `.append("category", ...)` for each.
- **CrUX CLS is ×100** — `CUMULATIVE_LAYOUT_SHIFT_SCORE` returns, for
  example, `10` meaning `0.10`; divide by 100.
- **INP lab data is always null** — Lighthouse can't measure INP; use
  `cruxInp` (CrUX P75) as the only source.
- **AI `max_tokens: 4096`** — responses with `steps[]` content regularly
  exceed 2048 tokens; the higher limit is required.
- **`noUncheckedIndexedAccess: true`** — `array[0]` returns `T | undefined`;
  use optional chaining throughout.
- **Tailwind v4** — CSS-based config (`@import "tailwindcss"` in
  `globals.css`); no `tailwind.config.ts`.
- **Dashboard pages need `force-dynamic`** — Add
  `export const dynamic = "force-dynamic"` to every page that reads the Clerk
  session.
- **Logo URL must be absolute for PDF rendering** — `@react-pdf/renderer`
  fetches images server-side; relative `/uploads/…` URLs are converted to
  absolute using the request origin before being passed to `<AuditReportPDF>`.
- **Clerk Organizations must be enabled manually** — Go to **Clerk Dashboard →
  Settings → Organizations** and enable it; `OrganizationSwitcher` only
  appears for Agency plan users.

---

## Deployment

Deploy to Vercel. Connect Neon via the Vercel integration for automatic
`DATABASE_URL` per environment (production and preview branches).

Set all environment variables in the Vercel dashboard, then wire:

1. **Clerk webhook** → `https://your-domain.com/api/webhooks/clerk`
   (events: `user.created`, `user.deleted`)
2. **Stripe webhook** → `https://your-domain.com/api/webhooks/stripe`
   (events: `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`)
3. **CrUX History API** → Enable "Chrome UX Report API" in Google Cloud
   Console (same key as PSI).
4. **Vercel Blob** → Create a Blob store in your project's **Storage** tab;
   `BLOB_READ_WRITE_TOKEN` is added automatically.

---

## Docs

- [Architecture decisions](./docs/architecture.md) — every major tech choice
  and the reasoning behind it
- [Roadmap](./docs/roadmap.md) — all phases, feature breakdown, and pricing
