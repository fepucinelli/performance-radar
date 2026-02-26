# PerfAlly

> **Auditorias profissionais de performance e SEO para desenvolvedores que vendem consultoria.**
> Monitore os sites dos seus clientes. Gere relatórios impressionantes. Cobre como especialista.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Neon](https://img.shields.io/badge/Neon-PostgreSQL-green?style=flat-square)](https://neon.tech)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)

---

## What It Does

PerfAlly runs PageSpeed Insights audits on your clients' sites and turns raw Lighthouse data into something you can actually deliver to a client — a Site Health score, failing SEO/accessibility items labeled in plain Portuguese, AI-generated action plans, and 25 weeks of real-user trend data.

You pay R$89–449/mês. You bill your clients R$300–1.000/mês for monitoring. The margin is the product.

---

## Current Status

**Phase 0 + Phase 1 + Phase 2 complete.**

| Phase | What | Status |
|-------|------|--------|
| 0 — Foundation | Auth, DB, Vercel deploy, CI | ✅ Done |
| 1 — MVP | URL → audit → report, free tier | ✅ Done |
| 2 — Pro | Stripe billing, scheduled monitoring, email alerts, history charts, AI action plans, SEO/A11y audits, CrUX 25-week data | ✅ Done (needs env vars in prod) |
| 3 — Agency | PDF reports, white-label, multi-user teams | Planned |
| 4 — Growth | `/check` public analyzer, Slack alerts, embeddable badge | Planned |

---

## Features

### Free (R$0)
- 1 project, 5 manual audits/month
- Site Health score (perf + SEO + accessibility composite)
- Core Web Vitals: LCP, INP, CLS, FCP, TTFB with field data (CrUX P75)
- SEO + Accessibility failing items with PT-BR labels
- Static action plan
- Public share link (`/share/[token]`)
- 7-day history

### Freelancer (R$89/mês)
- 5 projects
- Daily scheduled monitoring
- Email alerts when metrics degrade (configurable per-metric thresholds)
- AI-powered action plans (5/month) — stack-aware, PT-BR
- 30-day history

### Studio (R$199/mês)
- 20 projects
- Hourly scheduled monitoring
- 30 AI action plans/month
- 90-day history
- Slack alerts (coming Phase 4)

### Agência (R$449/mês)
- 100 projects
- Unlimited AI action plans
- 1-year history
- PDF reports + white-label branding (Phase 3)
- Multi-user teams via Clerk Organizations (Phase 3)

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16.1.6 + React 19, App Router | App Router for server components + Server Actions |
| Styling | Tailwind CSS v4 + shadcn/ui (new-york) | CSS-based config (`@import "tailwindcss"`) |
| Database | Neon (serverless PostgreSQL) + Drizzle ORM | Auto-suspend, Vercel native integration, DB branching |
| Auth | Clerk v6 | Built-in orgs for Phase 3 teams, webhook sync |
| Payments | Stripe | Subscriptions + Customer Portal |
| Email | Resend + React Email | Alert emails, digest emails |
| Jobs | Upstash QStash + Vercel Cron | Fan-out scheduled audit jobs |
| Cache | Upstash Redis | Rate limiting, dedup |
| Storage | Vercel Blob | PDF reports, logos (Phase 3) |
| AI | Claude Haiku (`claude-haiku-4-5-20251001`) | Action plan generation — ~R$0.005/call |
| Charts | Recharts | Score history + CrUX 25-week view |
| Data | PageSpeed Insights API v5 + CrUX History API | Lighthouse lab data + real-user field data in one call |
| Monitoring | Sentry | Error tracking |
| Deployment | Vercel | Serverless, cron, blob storage |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                    # Sign-in / sign-up pages (Clerk)
│   ├── (dashboard)/               # Protected app routes
│   │   ├── dashboard/             # Project list
│   │   ├── projects/[id]/         # Project detail + audit history
│   │   └── settings/              # Billing, alert thresholds
│   ├── (marketing)/               # Landing page (/)
│   ├── share/[token]/             # Public read-only audit report
│   └── api/
│       ├── webhooks/stripe/       # Subscription lifecycle
│       ├── webhooks/clerk/        # User sync to DB
│       ├── projects/[id]/audit/   # Manual audit trigger
│       ├── cron/trigger-audits/   # Vercel Cron → QStash fan-out
│       └── jobs/run-audit/        # QStash job handler
├── components/
│   ├── metrics/
│   │   ├── SiteHealthCard.tsx     # 2×2 composite score grid (header)
│   │   ├── MetricCard.tsx         # Individual CWV card (lab + field)
│   │   ├── ScoreGauge.tsx         # Circular SVG gauge 0–100
│   │   ├── ActionPlan.tsx         # AI + static action plan display
│   │   ├── AuditList.tsx          # Collapsible full Lighthouse audit list
│   │   ├── SEOAuditList.tsx       # Failing SEO + a11y items (PT-BR)
│   │   ├── ScoreHistoryChart.tsx  # Line chart + CrUX 25-week toggle
│   │   └── RunAuditButton.tsx     # Button with free-tier run counter
│   └── projects/
│       └── AlertThresholds.tsx    # Per-project alert config
├── lib/
│   ├── api/
│   │   ├── pagespeed.ts           # PSI API client (all 4 Lighthouse categories)
│   │   └── crux-history.ts        # CrUX History API (25-week P75)
│   ├── ai/
│   │   └── action-plan.ts         # Claude Haiku action plan generation
│   ├── db/
│   │   ├── index.ts               # Drizzle + Neon client
│   │   └── schema.ts              # Single source of truth for all tables
│   ├── utils/
│   │   ├── metrics.ts             # CWV thresholds, gradeMetric, GRADE_STYLES
│   │   ├── plan-limits.ts         # PLAN_LIMITS per tier
│   │   ├── explanations.ts        # Static action plan fallback
│   │   └── schedule.ts            # nextNoonBRT, tomorrowNoonBRT
│   ├── alerts.ts                  # checkAndFireAlerts (Resend)
│   ├── audit-runner.ts            # runAuditForProject (shared between manual + cron)
│   └── stripe.ts                  # Stripe client
├── actions/
│   ├── projects.ts                # createProjectAction, deleteProjectAction
│   ├── billing.ts                 # createCheckoutSession, createBillingPortalSession
│   └── alerts.ts                  # updateAlertThresholdsAction
├── emails/
│   └── alert-email.tsx            # React Email alert template
├── types/
│   └── index.ts                   # PSIAuditData, LighthouseResult, AIActionItem, etc.
├── env.ts                         # Typed env validation (@t3-oss/env-nextjs + zod)
└── proxy.ts                       # Clerk middleware (Next.js 16: proxy.ts, not middleware.ts)
```

---

## Local Development

### Prerequisites

- Node.js 20+ and pnpm
- Accounts: [Neon](https://neon.tech), [Clerk](https://clerk.com), [Google Cloud](https://console.cloud.google.com) (for PSI API key)

### 1. Clone & Install

```bash
git clone https://github.com/fepucinelli/perf-ally.git
cd perf-ally
pnpm install
```

### 2. Environment Variables

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
CLERK_WEBHOOK_SECRET=whsec_...

# Google PSI + CrUX APIs
GOOGLE_API_KEY=AIza...

# AI (optional — falls back to static plan if missing)
ANTHROPIC_API_KEY=sk-ant-...
```

Phase 2 features (Stripe, email alerts) also need:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_STARTER_PRICE_ID=price_...   # Freelancer R$89
STRIPE_PRO_PRICE_ID=price_...       # Studio R$199
STRIPE_AGENCY_PRICE_ID=price_...    # Agência R$449
RESEND_API_KEY=re_...
```

### 3. Database Setup

```bash
# Push schema to your Neon database
pnpm exec drizzle-kit push --force

# Inspect data visually
pnpm db:studio
```

> **Note:** `pnpm db:push` may fail due to double-dash arg parsing — use `pnpm exec drizzle-kit push --force` directly.

### 4. Start Dev Server

```bash
pnpm dev
```

Visit `http://localhost:3000`.

Sign up → create a project → run audit → see the full report.

### 5. Local Stripe Webhooks (optional)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the whsec_... to STRIPE_WEBHOOK_SECRET in .env.local
```

### Common Commands

```bash
pnpm dev                              # Start dev server
pnpm build                            # Production build
pnpm lint                             # ESLint
pnpm exec tsc --noEmit               # Type check
pnpm exec drizzle-kit push --force   # Push schema changes to DB
pnpm db:studio                        # Drizzle Studio (DB explorer)
```

---

## How Audits Work

```
User clicks "Run Audit"
  → POST /api/projects/[id]/audit
    → PSI API call (all 4 Lighthouse categories: performance, seo, accessibility, best-practices)
    → DB insert (perf scores + SEO/a11y scores + lighthouse JSON + CrUX P75 field data)
    → Check alert thresholds → send email if exceeded (Resend)
    → Fire-and-forget: fetch CrUX History (25 weeks) → update row
    → Fire-and-forget: generate AI action plan (Claude Haiku) → update row

Vercel Cron (hourly)
  → POST /api/cron/trigger-audits
    → find projects where nextAuditAt ≤ now
    → enqueue one QStash job per project
      → POST /api/jobs/run-audit?projectId=xxx
        → same runAuditForProject() as manual flow
```

---

## Key Gotchas

- **`proxy.ts` not `middleware.ts`** — Next.js 16 Clerk middleware lives in `src/proxy.ts`
- **`timestamptz` not exported** — Drizzle ORM v0.45 doesn't export it; use `const timestamptz = (name: string) => timestamp(name, { withTimezone: true })`
- **drizzle-kit doesn't load `.env.local`** — `drizzle.config.ts` calls `config({ path: ".env.local" })` from dotenv manually
- **PSI multiple categories** — URLSearchParams can't duplicate keys via spread; use multiple `.append("category", ...)` calls
- **CrUX CLS is ×100** — `CUMULATIVE_LAYOUT_SHIFT_SCORE` from CrUX is stored as e.g. `10` meaning `0.10`; divide by 100
- **INP lab data is always null** — Lighthouse can't measure INP; use `cruxInp` (CrUX P75) as the only source
- **`noUncheckedIndexedAccess: true`** — `array[0]` returns `T | undefined`; use optional chaining throughout
- **Tailwind v4** — CSS-based config (`@import "tailwindcss"` in globals.css); no `tailwind.config.ts`
- **Dashboard pages need `force-dynamic`** — `export const dynamic = "force-dynamic"` on every page that reads Clerk session

---

## Deployment

Deployed to Vercel. Connect Neon via the Vercel Neon integration for automatic `DATABASE_URL` per environment (production + preview branches).

Set all env vars in the Vercel dashboard. Wire:
1. **Clerk webhook** → `https://your-domain.com/api/webhooks/clerk` (events: `user.created`, `user.deleted`)
2. **Stripe webhook** → `https://your-domain.com/api/webhooks/stripe` (events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`)
3. **CrUX History API** → enable "Chrome UX Report API" in Google Cloud Console (same API key as PSI)

---

## Docs

- [Architecture decisions](./docs/architecture.md) — every major tech choice explained
- [Roadmap](./docs/roadmap.md) — all phases overview
- [Phase 1 — MVP](./docs/phase-1-mvp.md)
- [Phase 2 — Pro](./docs/phase-2-pro.md)
- [Phase 3 — Agency](./docs/phase-3-agency.md)
- [Phase 4 — Growth](./docs/phase-4-growth.md)
