# Architecture Decisions

This document explains every major technical decision and the reasoning behind it.

---

## Data Sources

### PageSpeed Insights API (primary)

All Lighthouse + CrUX data comes from the **PageSpeed Insights API v5** (a single endpoint from Google).

```
GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed
  ?url={url}
  &strategy={mobile|desktop}
  &category=performance
  &category=seo
  &category=accessibility
  &category=best-practices
  &key={GOOGLE_API_KEY}
```

**Important:** URLSearchParams won't duplicate keys via object spread — each category must be appended individually with `.append("category", ...)`.

One call returns:
- **`lighthouseResult`** — Lab data: LCP, CLS, INP, FCP, TTFB, TBT, Speed Index, full audit list + all 4 category scores (performance, SEO, accessibility, best-practices)
- **`loadingExperience`** — Page-level CrUX P75 values for LCP, CLS, INP, FCP. Falls back to **`originLoadingExperience`** (origin-level) when page metrics are absent.

**Why not run Lighthouse directly?**
Running Lighthouse CLI on Vercel is impractical (no headless Chrome, cold start time).
Running it on a dedicated server adds infra cost and maintenance.
PSI API is free (25,000 req/day with API key), gives both data sources in one call, and is always up to date with the latest Lighthouse version.

**Limitations to be aware of:**
- PSI API is rate-limited per IP without a key (400 req/day) — always use GOOGLE_API_KEY
- Results are cached by Google for ~30 seconds to 1 minute
- Some URLs aren't in CrUX (low-traffic sites) — handle gracefully with a lab-data-only fallback
- Does not support authenticated pages or SPAs that require interaction
- INP has no Lighthouse lab value — it requires real user interactions. `cruxInp` is the only source of INP data.

**CrUX API shape (important gotcha):**
- P75 values live at `metrics.METRIC_NAME.percentile` (flat integer) — NOT `percentiles.p75`
- `CUMULATIVE_LAYOUT_SHIFT_SCORE` is stored ×100 (e.g. `10` = CLS `0.10`) — divide by 100 before grading/display
- Always read `originLoadingExperience` as fallback when `loadingExperience.metrics` is empty

**Future consideration (Phase 5):** Run actual Lighthouse via a long-running worker (Fly.io, Railway) for custom audits, authentication support, and multi-step flows.

### CrUX History API

For 25 weeks of historical real-user field data, the **Chrome UX Report History API** provides weekly P75 snapshots. This is used for the "Usuários reais · 25 sem." toggle in the history chart.

```
POST https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord
```

- Same `GOOGLE_API_KEY` — requires **"Chrome UX Report API"** enabled separately in Google Cloud Console
- Tries page-level URL first, falls back to origin-level
- Returns null silently when URL isn't in CrUX dataset (low-traffic sites)
- Fetched fire-and-forget after each audit insert — never blocks the audit result
- Stored as JSONB snapshot in `audit_results.crux_history_raw`

The chart toggle only appears when `cruxHistoryRaw` is non-null, so the feature degrades gracefully.

---

## Site Health Score

A composite score displayed at the top of every project and share page:

```typescript
const siteHealth = Math.round(perfScore * 0.4 + seoScore * 0.3 + accessibilityScore * 0.3)
```

Best Practices is shown in the 2×2 grid but excluded from the composite — it's informational. This score gives agencies a single headline number to report to clients.

---

## Database: Neon (Serverless PostgreSQL)

**Why Neon over Supabase, PlanetScale, or Railway?**
- Native Vercel integration (connect in Vercel dashboard)
- Branching support (create DB branch per Vercel preview deployment)
- Auto-suspend scales cost to zero when idle (good for early-stage)
- Full PostgreSQL — no MySQL syntax, no proxy layer

**Why Drizzle over Prisma?**
- Drizzle generates plain SQL — easier to debug and reason about
- Smaller bundle size (important for Vercel Functions)
- Better TypeScript inference on queries
- Migrations are just SQL files — no engine process needed

**Drizzle gotchas:**
- `timestamptz` is NOT exported from `drizzle-orm/pg-core` v0.45 — use a local alias: `const timestamptz = (name: string) => timestamp(name, { withTimezone: true })`
- `drizzle-kit` doesn't auto-load `.env.local` — call `config({ path: ".env.local" })` from `dotenv` at top of `drizzle.config.ts`
- Schema push: always use `pnpm exec drizzle-kit push --force` (not `pnpm db:push` due to double-dash flag issue)

---

## Authentication: Clerk

**Why Clerk over NextAuth / Auth.js / Lucia?**

For a SaaS project:
- Clerk handles email verification, 2FA, social logins out of the box
- User management UI at no extra development cost
- Webhook events for `user.created` / `user.deleted` to sync with your DB
- Organizations (teams) built-in — needed for Phase 3 (agency multi-user)
- Billing-friendly: first 10,000 MAUs are free

**Clerk setup pattern (Next.js 16):**
```
ClerkProvider (root layout)
  → proxy.ts (NOT middleware.ts — Next.js 16 convention) protects (dashboard) routes
  → webhook /api/webhooks/clerk syncs user to DB
```

**Note:** Next.js 16 uses `proxy.ts` as the Clerk middleware file, not `middleware.ts`. The Clerk middleware is exported as `clerkMiddleware` from `@clerk/nextjs/server`.

---

## Background Jobs: Upstash QStash

Scheduled audit runs can't happen in a Vercel Function (max 60s timeout on hobby, 300s on pro). The flow is:

```
Vercel Cron (hourly)
  → POST /api/cron/trigger-audits
    → QStash: enqueue one job per project due (nextAuditAt ≤ now)
      → QStash delivers to /api/jobs/run-audit?projectId=xxx
        → Calls PSI API (all 4 Lighthouse categories)
        → Saves AuditResult to DB (including seo/a11y/best-practices scores)
        → Evaluates alert conditions
        → Sends email if degraded
        → Fire-and-forget: CrUX History fetch + AI action plan generation
```

**Why QStash over Vercel Cron alone?**
- Vercel Cron only fires on schedule, doesn't scale per-project
- QStash handles retries, delivery guarantees, and fan-out
- Free tier: 500 messages/day

**Why Upstash Redis for caching?**
- Cache PSI API responses (same URL, same strategy) for 5 minutes
- Prevent duplicate cron runs
- Rate limiting (plan limits per user)
- Edge-compatible (Vercel Edge Middleware can read it)

---

## AI: Claude API (Anthropic)

**Model:** `claude-haiku-4-5-20251001` — fast and cost-effective for action plan generation.

**What it does:**
- Generates 3–6 personalized, PT-BR action plan items per audit
- Detects tech stack from Lighthouse's built-in `stackPacks` (Next.js, WordPress, Vue, etc.)
- Includes all 5 CWV metrics as context: LCP, INP (CrUX P75), CLS, FCP, TTFB
- Includes SEO and Accessibility scores — highlights failing SEO audit IDs when seoScore < 90
- Output cached in `audit_results.ai_action_plan` (JSONB) — never regenerated for same audit
- Output format: JSON array with `title`, `action`, `why`, `difficulty`, `stackTip` per item

**Tiered access:**
| Plan | Display name | AI Plans/Month |
|------|-------------|----------------|
| `free` | Grátis | 0 (static plan only) |
| `starter` | Freelancer | 5 |
| `pro` | Studio | 30 |
| `agency` | Agência | Unlimited |

**Cost estimate:** Each call uses ~500–800 tokens total. At Haiku pricing (~$0.001/call), 1,000 AI plans/month ≈ $1. Negligible.

**Error handling:** `ANTHROPIC_API_KEY` optional — if missing or any error occurs, falls back to static plan. AI generation never blocks audit save (fire-and-forget).

---

## PDF Generation: @react-pdf/renderer

**Why not Puppeteer/Playwright?**
Puppeteer requires a full Chromium install. Vercel Functions don't support that (binary size + memory). Workarounds (puppeteer-core + @sparticuz/chromium) are fragile and slow.

`@react-pdf/renderer` generates PDFs using React components compiled to PDF primitives — no browser needed. Runs fine in a serverless function.

**Pattern:**
```tsx
// src/lib/pdf/AuditReport.tsx
import { Document, Page, Text, View } from '@react-pdf/renderer'

export function AuditReportPDF({ audit, branding }: Props) {
  return (
    <Document>
      <Page>...</Page>
    </Document>
  )
}
```

Generated PDF is uploaded to Vercel Blob storage; a URL is saved in the `reports` table and returned to the user.

---

## Email: Resend

- React Email for templates (same DX as building UI components)
- Resend has a generous free tier (3,000 emails/month)
- Excellent deliverability

**Email types in the system:**
- Alert: metric degraded below threshold (Phase 2)
- Weekly digest: performance summary across all projects (Phase 3)
- Report ready: PDF link (Phase 3)
- Billing: payment failed, subscription changed

---

## Payments: Stripe

**Subscription model:**
- One product per tier (Freelancer R$89, Studio R$199, Agência R$449)
- DB `plan` enum values are fixed: `"starter"`, `"pro"`, `"agency"` — display names are UI-only
- Metered billing NOT used — flat monthly subscription
- Stripe Customer Portal for self-service plan changes/cancellations
- Webhooks to sync subscription status with DB

**Important:** Store Stripe Customer ID and plan on the user record. Check `users.plan` from DB (not Stripe API) on every request to avoid latency.

---

## Vercel Deployment Strategy

```
main branch → production (perf-ally.com)
preview branches → preview URLs (auto, per PR)
```

**Environment variables per environment:**
- Production: real Stripe keys, Neon production branch
- Preview: Stripe test mode, Neon dev branch (use Neon branching)

**Vercel Cron jobs** (defined in `vercel.json`):
```json
{
  "crons": [
    { "path": "/api/cron/trigger-audits", "schedule": "0 * * * *" }
  ]
}
```
Runs hourly; the handler determines which projects are due based on their `nextAuditAt` field. Daily audits fire at 15:00 UTC (noon BRT).

---

## Core Web Vitals: Thresholds & Grading

Google's official thresholds (as of 2025):

| Metric | Good     | Needs Improvement | Poor    |
|--------|----------|-------------------|---------|
| LCP    | ≤ 2.5s   | 2.5s – 4.0s       | > 4.0s  |
| INP    | ≤ 200ms  | 200ms – 500ms     | > 500ms |
| CLS    | ≤ 0.1    | 0.1 – 0.25        | > 0.25  |
| FCP    | ≤ 1.8s   | 1.8s – 3.0s       | > 3.0s  |
| TTFB   | ≤ 800ms  | 800ms – 1800ms    | > 1800ms|

**Note:** INP replaces FID as a Core Web Vital. Lighthouse lab data cannot produce an INP value — only CrUX field data provides it.

**Performance Score mapping** (Lighthouse composite):
- 90–100: Good (green)
- 50–89: Needs Improvement (orange)
- 0–49: Poor (red)

Store raw values + computed grade in DB. Never rely on re-computing grades from raw values in UI — grades may change as Google updates thresholds.

---

## Database Schema (Core Tables)

```sql
-- users (synced from Clerk webhooks)
users (
  id              TEXT PRIMARY KEY,       -- Clerk user ID (e.g. "user_2abc...")
  email           TEXT NOT NULL,
  name            TEXT,
  stripe_customer_id TEXT UNIQUE,
  plan            TEXT DEFAULT 'free',    -- free | starter | pro | agency
  plan_expires_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
)

-- projects (a URL to monitor)
projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  url             TEXT NOT NULL,
  strategy        TEXT DEFAULT 'mobile',  -- mobile | desktop
  schedule        TEXT DEFAULT 'manual',  -- manual | daily | hourly
  next_audit_at   TIMESTAMPTZ,
  last_audit_at   TIMESTAMPTZ,
  alert_lcp       REAL,           -- ms threshold, null = no alert
  alert_cls       REAL,           -- ratio threshold
  alert_inp       REAL,           -- ms threshold
  org_id          TEXT,           -- Clerk org ID for team projects (Phase 3)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
)

-- audit_results (one row per Lighthouse run, immutable once written)
audit_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  strategy        TEXT NOT NULL,          -- mobile | desktop

  -- Lighthouse lab data
  perf_score      REAL,                   -- 0–100
  lcp             REAL,                   -- ms
  cls             REAL,                   -- unitless ratio
  inp             REAL,                   -- ms (lab; usually null — use crux_inp)
  fcp             REAL,                   -- ms
  ttfb            REAL,                   -- ms
  tbt             REAL,                   -- ms
  speed_index     REAL,                   -- ms

  -- CrUX field data (P75 real-user values; null for low-traffic sites)
  crux_lcp        REAL,
  crux_cls        REAL,
  crux_inp        REAL,
  crux_fcp        REAL,

  -- Pre-computed grades (stored to survive threshold changes)
  lcp_grade       TEXT,                   -- good | needs-improvement | poor
  cls_grade       TEXT,
  inp_grade       TEXT,

  -- Additional Lighthouse category scores
  seo_score           REAL,              -- 0–100
  accessibility_score REAL,              -- 0–100
  best_practices_score REAL,             -- 0–100

  -- Full Lighthouse JSON (for action plans + full audit list rendering)
  lighthouse_raw  JSONB,

  -- AI-generated action plan (cached; null = not yet generated or limit reached)
  ai_action_plan  JSONB,

  -- CrUX History API snapshot (25 weeks weekly P75; null = not in CrUX)
  crux_history_raw JSONB,

  -- Public share link token
  share_token     TEXT NOT NULL DEFAULT gen_random_uuid()::text,

  -- Metadata
  psi_api_version TEXT,
  triggered_by    TEXT DEFAULT 'manual',  -- manual | cron | api

  created_at      TIMESTAMPTZ DEFAULT NOW()
)

-- alerts (alert history — de-duped: max 1 alert per project per hour)
alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  audit_id    UUID REFERENCES audit_results(id) ON DELETE CASCADE,
  metric      TEXT NOT NULL,   -- lcp | cls | inp
  value       REAL NOT NULL,
  threshold   REAL NOT NULL,
  email_sent  BOOLEAN DEFAULT FALSE,
  slack_sent  BOOLEAN DEFAULT FALSE,
  sent_at     TIMESTAMPTZ DEFAULT NOW()
)

-- reports (PDF reports stored in Vercel Blob — Phase 3)
reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  audit_id    UUID REFERENCES audit_results(id) ON DELETE CASCADE,
  blob_url    TEXT NOT NULL,
  created_by  TEXT REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
)
```

---

## Plain-English Explanations

A core differentiator. Every metric needs:
1. **What it is** (one sentence)
2. **Why it matters** (user impact)
3. **Your score** (contextual)
4. **Top 3 actions** (specific to their audit result)

Explanations are generated from the Lighthouse audit list. Each failed audit maps to an action item. This static lookup (`getActionPlan()` in `src/lib/utils/explanations.ts`) is the fallback for free users and when AI generation fails.

**Phase 2+:** Paid users get AI-powered plans from Claude Haiku (tiered limits). The static plan is always the fallback. See [AI: Claude API](#ai-claude-api-anthropic) section above.

---

## Rate Limiting & Plan Enforcement

Plan limits are defined in `src/lib/utils/plan-limits.ts` as a `PLAN_LIMITS` constant keyed by plan string.

Key limits enforced:
- `maxProjects` — enforced in `createProjectAction`
- `manualRunsPerMonth` — enforced in audit route via `getMonthlyRunCount`
- `historyDays` — enforced via date filter on history queries (not row count)
- `aiActionPlansPerMonth` — enforced in `maybeGenerateAIActionPlan`
- `scheduledRuns` / `hourlyRuns` — enforced in schedule selector UI and cron trigger

Upstash Redis available for sliding-window rate limits on high-frequency endpoints.

---

## Security Considerations

- All PSI calls happen server-side — GOOGLE_API_KEY never exposed to client
- Clerk middleware protects all `/dashboard` routes via `proxy.ts`
- Project ownership verified on every API call (`WHERE user_id = currentUser.id`)
- Stripe webhooks verified with `stripe.webhooks.constructEvent`
- No user-provided HTML rendered unsanitized
- URL validation before PSI call (reject localhost, private IPs, non-HTTP)
- Share tokens are UUIDs — not guessable, not tied to sequential IDs
