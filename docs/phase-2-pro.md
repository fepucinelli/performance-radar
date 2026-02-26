# Phase 2 — Pro

**Goal:** Monetize. First paying customers. Scheduled monitoring, alerts, historical data, AI action plans, SEO audits, and CrUX History.
**Status:** ✅ Complete (code done — needs env vars wired in production)

---

## New Features

1. Stripe subscriptions (Freelancer R$89/mês, Studio R$199/mês, Agência R$449/mês)
2. Scheduled audits (daily / hourly) via Vercel Cron + QStash
3. Email alerts when metrics degrade
4. Historical trend charts with CrUX 25-week real-user view
5. AI-powered action plans (Claude Haiku) — promoted from Phase 4
6. SEO + Accessibility audits — promoted from Phase 4
7. CrUX History API integration — promoted from Phase 4

---

## Track A — Stripe Subscriptions

### Products to create in Stripe

```
Product: "PerfAlly Freelancer" — R$89/month  → STRIPE_STARTER_PRICE_ID
Product: "PerfAlly Studio"     — R$199/month → STRIPE_PRO_PRICE_ID
Product: "PerfAlly Agência"    — R$449/month → STRIPE_AGENCY_PRICE_ID
```

**Important:** DB enum values stay as `starter`, `pro`, `agency`. Display names (Freelancer, Studio, Agência) are UI-only — no DB migration needed when renaming tiers.

**Checkout flow** — `src/app/actions/billing.ts`:
- `createCheckoutSession(planKey)` → Stripe Checkout redirect
- `createBillingPortalSession()` → Stripe Customer Portal

**Webhook handler** — `src/app/api/webhooks/stripe/route.ts`:
- `checkout.session.completed` → set `users.stripeCustomerId` + `users.plan`
- `customer.subscription.updated` → update plan
- `customer.subscription.deleted` → reset to `"free"`

**Store plan in DB, not Stripe.** Check `users.plan` from DB on every request — never hit Stripe API for auth checks.

---

## Track B — Scheduled Audits

**Flow:**
```
Vercel Cron (hourly) → POST /api/cron/trigger-audits
  → finds projects with nextAuditAt ≤ now
  → enqueues one QStash job per project
    → POST /api/jobs/run-audit?projectId=xxx
      → runAuditForProject(projectId, "cron")
```

**Schema fields used:**
```typescript
projects.schedule     // "manual" | "daily" | "hourly"
projects.nextAuditAt  // when next scheduled run is due
projects.lastAuditAt  // timestamp of last completed run
```

Daily audits fire at 15:00 UTC (noon BRT). Hourly runs are locked to Studio+ via `PLAN_LIMITS[plan].hourlyRuns`.

**`vercel.json`:**
```json
{
  "crons": [
    { "path": "/api/cron/trigger-audits", "schedule": "0 * * * *" }
  ]
}
```

---

## Track C — Email Alerts

**Setup:**
```
RESEND_API_KEY=re_xxx
```

Update `from` address in `src/lib/alerts.ts` to your verified Resend domain.

**Alert check logic** (`src/lib/alerts.ts`):
- Fires if `result.lcp > project.alertLcp` (same for CLS, INP)
- De-duped: won't re-alert same project within 1 hour
- Logs to `alerts` table for audit trail

**Email template:** `src/emails/alert-email.tsx` (React Email)

**Alert threshold UI:** `src/components/projects/AlertThresholds.tsx` — per-project settings, plan-gated (email alerts require Freelancer+).

---

## Track D — Historical Trend Charts

**Audits view** — `src/components/metrics/ScoreHistoryChart.tsx`:
- Tabs: Pontuação, LCP, FCP, CLS, INP
- Two lines per metric tab: blue solid (lab) + violet dashed (CrUX P75 per audit)
- Reference lines at good/poor thresholds
- Minimum 2 audits to render

**CrUX History view** (toggle "Usuários reais · 25 sem."):
- Shows when `latestAudit.cruxHistoryRaw` is available
- Weekly P75 trend over 25 weeks from CrUX History API
- Tabs: LCP, FCP, CLS, INP (no Performance tab — CrUX doesn't report it)
- Gaps shown where traffic was insufficient for that week

History window is plan-gated via `planLimits.historyDays` (7/30/90/365).

---

## Track E — AI-Powered Action Plans

**Model:** `claude-haiku-4-5-20251001` — fast and cheap (~R$0.005/call).

**How it works:**
1. After each audit is saved, `maybeGenerateAIActionPlan()` checks user's monthly quota
2. If under quota, `generateAIActionPlan()` calls Claude Haiku
3. Plan stored in `audit_results.ai_action_plan` (JSONB) — never regenerated for same audit
4. UI renders AI plan with "✨ Gerado por IA" badge; falls back to static plan if null

**Tiered limits:**

| Plan | Display name | AI Plans/Month |
|------|-------------|----------------|
| `free` | Grátis | 0 (static plan only) |
| `starter` | Freelancer | 5 |
| `pro` | Studio | 30 |
| `agency` | Agência | Unlimited |

**Prompt context includes:**
- URL + detected stack (from `lighthouseRaw.stackPacks`)
- Performance score, SEO score, Accessibility score
- All 5 CWV metrics (LCP, INP via CrUX, CLS, FCP, TTFB)
- Top failing performance audit IDs
- Top failing SEO audit IDs (when seoScore < 90)

**Output:** PT-BR, 3–6 items, max 60 words each, JSON with `title`, `action`, `why`, `difficulty`, `stackTip`.

**Error handling:** Any failure silently falls back to static plan. Missing `ANTHROPIC_API_KEY` disables AI generation entirely.

---

## Track F — SEO + Accessibility Audits

Promoted from Phase 4. PSI already returns SEO + accessibility data in the same free call — it just needed the additional category parameters.

**How it works:**
- `pagespeed.ts` appends all 4 categories: `performance`, `seo`, `accessibility`, `best-practices`
- `audit_results` stores `seo_score`, `accessibility_score`, `best_practices_score` (REAL columns)
- `SiteHealthCard` replaces the old ScoreGauge header — shows composite score + 2×2 category grid
- `SEOAuditList` reads `lighthouseRaw.categories.seo.auditRefs` + `accessibility.auditRefs` and renders only failing items with PT-BR labels

**Site Health composite formula:**
```typescript
const siteHealth = Math.round(perfScore * 0.4 + seoScore * 0.3 + accessibilityScore * 0.3)
```

**SEO audit label map** — 12 most impactful IDs with PT-BR descriptions (e.g. "Meta descrição ausente", "Página bloqueada para indexação").

---

## Track G — CrUX History API

Promoted from Phase 4. 25 weeks of weekly P75 real-user data.

**API:** `POST https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord`
- Same `GOOGLE_API_KEY` — requires "Chrome UX Report API" enabled in Google Cloud Console
- Tries page-level URL first, falls back to origin-level
- Returns null silently when URL isn't in CrUX dataset (low-traffic sites)

**Client:** `src/lib/api/crux-history.ts`

**Storage:** `audit_results.crux_history_raw` (JSONB) — snapshot at time of audit.

**Fire-and-forget:** fetched after audit insert, never blocks the audit result. If API fails, `cruxHistoryRaw` stays null and the CrUX History chart toggle simply won't appear.

---

## Env Vars Required for Phase 2

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_STARTER_PRICE_ID=price_xxx   # Freelancer R$89
STRIPE_PRO_PRICE_ID=price_xxx       # Studio R$199
STRIPE_AGENCY_PRICE_ID=price_xxx    # Agência R$449

# Email
RESEND_API_KEY=re_xxx

# AI
ANTHROPIC_API_KEY=sk-ant-xxx

# Clerk webhook (sync users to DB)
CLERK_WEBHOOK_SECRET=whsec_xxx
```

---

## Definition of Done

- [x] Stripe Checkout working end-to-end (test mode)
- [x] Subscription status persisted in DB
- [x] Downgrade flow tested (subscription cancelled → plan reverts to free)
- [x] Cron job running on Vercel and triggering QStash jobs
- [x] Audit jobs running automatically for scheduled projects
- [x] Alert emails sending when thresholds exceeded
- [x] Historical chart rendering with real data
- [x] CrUX History 25-week view shown when data available
- [x] Upgrade prompts shown when limits hit
- [x] AI action plans generating for paid users (with fallback)
- [x] SiteHealthCard with composite score + SEO/A11y grid
- [x] SEOAuditList showing failing items with PT-BR labels
- [x] New pricing live: Freelancer R$89 / Studio R$199 / Agência R$449
