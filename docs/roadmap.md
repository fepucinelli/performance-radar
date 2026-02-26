# Roadmap

Each phase is independently shippable and designed to generate value. Ship Phase 1 to validate demand before building Phase 2.

---

## Phase Overview

```
Phase 0 — Foundation ✅     (Week 1–2)    Infrastructure, scaffold, CI/CD
Phase 1 — MVP ✅            (Week 3–5)    Core product, free tier live
Phase 2 — Pro ✅            (Week 6–8)    Paid plans, alerts, history, SEO audits, AI
Phase 3 — Agency            (Week 9–12)   PDF reports, teams, white-label
Phase 4 — Growth            (Month 4–6)   Integrations, virality, competitor analysis
Phase 5 — Scale             (Month 6+)    API, plugins, advanced auditing
```

---

## Phase 0 — Foundation

**Goal:** Working Next.js app deployed to Vercel, with auth, DB, and CI/CD in place. No product features yet.

**Checklist:**
- [x] Init Next.js 16.1.6 with TypeScript, Tailwind, shadcn/ui
- [x] Configure Clerk (auth middleware, sign-in/sign-up pages)
- [x] Set up Neon PostgreSQL + Drizzle ORM
- [x] Create initial DB schema (users, projects, audit_results)
- [x] Deploy to Vercel (production + preview envs)
- [x] Set up Sentry for error tracking
- [x] `.env.example` with all required variables documented
- [x] Basic landing page (can be placeholder)
- [x] Protected dashboard skeleton (just the layout, no data)

**Deliverable:** A deployed app where you can sign up, sign in, and see an empty dashboard.

See [`phase-0-foundation.md`](./phase-0-foundation.md) for detailed steps.

---

## Phase 1 — MVP

**Goal:** A developer or agency can plug in a URL, run a Lighthouse audit, and get a plain-English report. Free tier: 1 project, 5 manual runs/month.

**Checklist:**
- [x] URL input form with validation
- [x] PSI API integration (mobile + desktop strategy) — all 4 Lighthouse categories
- [x] Parse and store audit results in DB
- [x] Metric cards: LCP, INP, CLS, FCP, TTFB with color grading
- [x] Plain-English explanation for each metric
- [x] Action Plan section: top 5 prioritized issues from audit
- [x] Lighthouse audit list (collapsible, full detail available)
- [x] CrUX field data display (with fallback if not available)
- [x] Project list page
- [x] Single project view with latest audit
- [x] Free plan enforcement (1 project, 5 runs/month)
- [x] "Share" link for public audit results (no auth required to view)
- [x] Mobile vs Desktop toggle

**Deliverable:** A publicly accessible product. Post on X/HN/Indie Hackers. Start collecting waitlist emails.

**Success metric:** 100 free accounts created within first month.

See [`phase-1-mvp.md`](./phase-1-mvp.md) for detailed steps.

---

## Phase 2 — Pro

**Goal:** Monetize. Scheduled monitoring, email alerts, historical trend charts, AI-powered action plans, SEO + accessibility audits, and CrUX History data justify the subscription price.

**Checklist:**
- [x] Stripe integration (Freelancer R$89/mês, Studio R$199/mês, Agência R$449/mês)
- [x] Stripe Customer Portal (self-service subscription management)
- [x] Upgrade/downgrade flow from dashboard
- [x] Plan enforcement gates on dashboard (upgrade prompts)
- [x] Scheduled audits via Vercel Cron + QStash
  - [x] Projects have `schedule` field (manual | daily | hourly)
  - [x] Cron trigger runs every hour, fans out to QStash jobs
  - [x] Each job: calls PSI, stores result, checks alert conditions
- [x] Email alerts (via Resend) when metrics degrade past threshold
  - [x] Per-metric thresholds configurable per project
  - [x] Alert history in dashboard
- [x] Historical trend charts
  - [x] Line chart: performance score over time
  - [x] Line chart: each CWV over time (LCP, FCP, CLS, INP)
  - [x] Regression detection (score dropped indicator)
- [x] Multi-project dashboard (card grid overview)
- [x] AI-powered action plans (Claude Haiku)
  - [x] Tiered limits: Freelancer=5/mo, Studio=30/mo, Agency=unlimited
  - [x] Stack auto-detection via Lighthouse stackPacks
  - [x] All 5 CWV metrics + SEO/A11y scores in context
  - [x] PT-BR output for developers and agencies
  - [x] Cached in `audit_results.ai_action_plan` (no regeneration cost)
  - [x] Graceful fallback to static plan if API key missing or limit reached
- [x] SEO + Accessibility audits — promoted from Phase 4
  - [x] PSI API requests all 4 Lighthouse categories (performance, seo, accessibility, best-practices)
  - [x] `seo_score`, `accessibility_score`, `best_practices_score` columns in DB
  - [x] SiteHealthCard: composite score (perf×0.4 + seo×0.3 + a11y×0.3) in 2×2 grid
  - [x] SEOAuditList: failing SEO + accessibility items with PT-BR labels
- [x] CrUX History API — promoted from Phase 4
  - [x] 25 weeks of weekly P75 real-user data per metric
  - [x] Stored in `audit_results.crux_history_raw` (JSONB)
  - [x] "Usuários reais · 25 sem." view in history chart (LCP, FCP, CLS, INP)
  - [x] Falls back gracefully if URL not in CrUX dataset

**Deliverable:** First paying customers. Goal: 10 paying customers by end of Phase 2.

**Success metric:** MRR > R$900 after launch.

See [`phase-2-pro.md`](./phase-2-pro.md) for detailed steps.

---

## Phase 3 — Agency

**Goal:** Unlock the agency use case — the highest-value customers who pay R$449/mês and manage multiple client sites.

**Checklist:**
- [ ] PDF report generation (@react-pdf/renderer)
  - [ ] Executive summary (score, grade, key findings)
  - [ ] Per-metric section with explanation + recommendations
  - [ ] Action plan table
- [ ] White-label PDF reports (Agency plan)
  - [ ] Custom logo upload (Vercel Blob)
  - [ ] Custom accent color
  - [ ] Custom footer text (agency name, contact info)
- [ ] Multi-user teams via Clerk Organizations
  - [ ] Invite team members
  - [ ] Role: Owner, Member
  - [ ] Billing tied to Organization, not individual
- [ ] Project tags/grouping (group by client)
- [ ] Bulk audit: trigger all projects at once
- [ ] Scheduled weekly digest email (summary of all projects)

**Deliverable:** Product-market fit for the agency segment. Unlock referrals via white-label.

**Success metric:** 3 agency plan customers.

See [`phase-3-agency.md`](./phase-3-agency.md) for detailed steps.

---

## Phase 4 — Growth

**Goal:** Grow via integrations, content, and product-led virality.

**Checklist:**
- [ ] `/check` public URL analyzer (top-of-funnel, no auth)
- [ ] Slack alerts (in addition to email)
- [ ] Webhook notifications (custom HTTP endpoint)
- [ ] Public performance badge (embeddable `<img>` showing current score)
- [ ] Competitor comparison (Pro+)
- [ ] Refer-a-friend system
- [x] AI-powered action plans → ✅ Promoted to Phase 2
- [x] SEO + Accessibility score integration → ✅ Promoted to Phase 2
- [x] CrUX History API (25 weeks) → ✅ Promoted to Phase 2
- [ ] Performance Budget feature (set score targets per project, alert if exceeded)
- [ ] Interactive onboarding + demo project

**Deliverable:** Meaningful organic growth. Product advocates.

See [`phase-4-growth.md`](./phase-4-growth.md) for detailed steps.

---

## Phase 5 — Scale

**Goal:** Build the ecosystem around PerfAlly. Developer-friendly features and platform integrations.

**Checklist:**
- [ ] Public REST API (API key management, POST /v1/audits, GET /v1/projects)
- [ ] GitHub Action (`perf-ally/audit-action` — posts score diff on PR)
- [ ] WordPress plugin (auto-register site, dashboard widget)
- [ ] Zapier / Make integration
- [ ] Custom Lighthouse configuration (requires dedicated worker — Fly.io)
- [ ] Multi-region scheduling (US, EU, APAC latency variance)

**Deliverable:** Developer-friendly platform. Referrals from GitHub stars.

See [`phase-5-scale.md`](./phase-5-scale.md) for detailed steps.

---

## Complementary Ideas to Explore

These are adjacent ideas worth evaluating once core revenue is stable:

### "One-time audit" product (Phase 3+)
A R$49 one-time purchase for a full report PDF with custom AI recommendations. No subscription. Targets consultants who need a deliverable for a client.

### Performance regression as a service (Phase 5)
"Did your last deploy break performance?" Integrates with Vercel, Netlify, GitHub deploy hooks. When a new deploy happens, auto-trigger an audit and compare with previous.

### Managed CrUX insights newsletter (Phase 4)
Weekly email: "Here's how your site changed vs last week." Personalized, automated. Converts free users who don't log in.

---

## Pricing

| DB key | Display name | Price | Projects | History |
|--------|-------------|-------|----------|---------|
| `free` | Grátis | R$0 | 1 | 7 days |
| `starter` | Freelancer | R$89/mês | 5 | 30 days |
| `pro` | Studio | R$199/mês | 20 | 90 days |
| `agency` | Agência | R$449/mês | 100 | 1 year |

**Note:** DB enum values (`starter`, `pro`, `agency`) are fixed. Display names can change without migration.

**Future pricing levers:**
- Annual pricing (2 months free = 17% discount)
- Usage-based add-ons (extra projects)
- LTD (lifetime deal) on AppSumo for growth spike

---

## Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| PSI API rate limits | Use API key, cache results, Upstash rate limiter |
| CrUX data unavailable for small sites | Lab-only mode with clear UI explanation |
| Chrome UX Report API not enabled | CrUX History feature silently degrades to null |
| PSI API goes down | Retry with exponential backoff in QStash |
| Lighthouse scores fluctuate between runs | Show moving average, document methodology |
| Churn due to "set and forget" | Weekly digest email keeps users engaged |
