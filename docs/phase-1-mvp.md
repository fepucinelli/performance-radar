# Phase 1 — MVP

**Goal:** URL → run → plain-English performance + SEO report. Free tier live. Post and get first users.
**Status:** ✅ Complete
**Depends on:** Phase 0 complete

---

## Core User Flow

```
1. User signs up
2. Creates a project (name + URL)
3. Clicks "Run Audit"
4. Sees loading state (~5–8s while PSI runs)
5. Gets report:
   - Site Health card: composite score + 2×2 grid (Performance, SEO, Accessibility, Best Practices)
   - CWV metric cards (LCP, INP, CLS, FCP, TTFB) with field data
   - Plain-English explanation per metric
   - Action Plan: top issues prioritized
   - Full Lighthouse audit list (collapsed)
   - SEO + Accessibility audit list (failing items only)
6. Can share report via public link (/share/[token])
```

---

## Steps

### 1. PSI API Client

Requests all 4 Lighthouse categories in one call. Multiple `.append("category", ...)` calls are required — a spread object doesn't duplicate keys in URLSearchParams.

```typescript
// src/lib/api/pagespeed.ts
const params = new URLSearchParams({ url, strategy })
params.append("category", "performance")
params.append("category", "seo")
params.append("category", "accessibility")
params.append("category", "best-practices")
if (env.GOOGLE_API_KEY) params.append("key", env.GOOGLE_API_KEY)
```

Return shape includes:
```typescript
{
  perfScore, lcp, cls, inp, fcp, ttfb, tbt, speedIndex,  // lab data
  cruxLcp, cruxCls, cruxInp, cruxFcp,                    // CrUX P75 field data
  seoScore, accessibilityScore, bestPracticesScore,       // additional category scores
  lighthouseRaw, psiApiVersion,
}
```

**CrUX API shape gotchas:**
- P75 values are at `metrics.METRIC_NAME.percentile` (flat integer), not `percentiles.p75`
- `CUMULATIVE_LAYOUT_SHIFT_SCORE` is stored ×100 (e.g. `10` = CLS `0.10`) — divide by 100 before display
- Always fall back to `originLoadingExperience` when `loadingExperience.metrics` is absent

### 2. Metric Grading Utilities

```typescript
// src/lib/utils/metrics.ts
export const THRESHOLDS = {
  lcp:  { good: 2500,  poor: 4000 },  // ms
  cls:  { good: 0.1,   poor: 0.25 },
  inp:  { good: 200,   poor: 500 },   // ms
  fcp:  { good: 1800,  poor: 3000 },  // ms
  ttfb: { good: 800,   poor: 1800 },  // ms
}

export function gradeMetric(metric, value): Grade  // "good" | "needs-improvement" | "poor"
export function gradeScore(score: number): Grade   // for 0–100 category scores
export const GRADE_STYLES: Record<Grade, { badge, dot, text }>
export const GRADE_LABELS: Record<Grade, string>   // PT-BR: "Bom" | "Atenção" | "Ruim"
```

### 3. Site Health Composite Score

```typescript
// Displayed in SiteHealthCard — shown at the top of every project/share page
const siteHealth = Math.round(
  perfScore    * 0.4 +
  seoScore     * 0.3 +
  a11yScore    * 0.3
)
```

Best Practices is shown in the 2×2 grid but excluded from the composite — it's informational.

### 4. API Route: Run Audit

All audit logic is in `src/lib/audit-runner.ts` (shared between manual and cron routes):

```typescript
// src/app/api/projects/[id]/audit/route.ts
export async function POST(req, { params }) {
  const { userId } = auth()
  // ownership check + plan limit check
  const auditId = await runAuditForProject(params.id, "manual")
  return Response.json({ auditId })
}
```

`runAuditForProject` handles:
1. PSI API call
2. DB insert (all scores including seo/a11y/best-practices)
3. Update `projects.lastAuditAt`
4. Fire alerts if thresholds breached
5. CrUX History fetch (fire-and-forget)
6. AI action plan generation (fire-and-forget, plan-gated)

### 5. Key Components

```
components/metrics/
├── SiteHealthCard.tsx     — composite 2×2 grid at page top
├── MetricCard.tsx         — individual CWV card with lab + field data
├── ScoreGauge.tsx         — circular SVG gauge 0–100
├── ActionPlan.tsx         — static + AI action plan display
├── AuditList.tsx          — collapsible full Lighthouse performance audit list
├── SEOAuditList.tsx       — collapsible failing SEO + accessibility items
├── ScoreHistoryChart.tsx  — tabbed line chart (Pontuação/LCP/FCP/CLS/INP + CrUX History view)
└── RunAuditButton.tsx     — button with loading state + run counter for free users
```

### 6. Pages

**`/dashboard`** — project list with latest scores per project

**`/projects/[id]`** — project detail:
- SiteHealthCard (composite + 2×2 grid)
- CWV metric cards
- Run history dots + history chart with CrUX 25-week view
- Action Plan (AI if available, static fallback)
- Full Lighthouse audit list
- SEO + Accessibility audit list
- Monitoring schedule selector
- Alert threshold configuration

**`/share/[token]`** — public read-only report (no auth required):
- Same SiteHealthCard header
- CWV metric cards
- Action Plan
- Full Lighthouse + SEO audit lists
- "Analyze your site free" CTA

### 7. Free Plan Limits

```typescript
// src/lib/utils/plan-limits.ts
free: {
  maxProjects: 1,
  manualRunsPerMonth: 5,   // stronger upgrade signal than 10
  scheduledRuns: false,
  hourlyRuns: false,
  emailAlerts: false,
  pdfReports: false,
  slackAlerts: false,
  historyDays: 7,
  aiActionPlansPerMonth: 0,
}
```

### 8. Landing Page

**Headline:** "Auditorias profissionais de performance e SEO para desenvolvedores que vendem consultoria"

**Value prop:** "Monitore os sites dos seus clientes. Gere relatórios impressionantes. Cobre como especialista."

**Sub-line:** "Você paga R$89/mês. Seus clientes te pagam R$300–1.000/mês por monitoramento."

Sections:
1. Hero with mock metric preview
2. Features grid (4 items)
3. "O que são Core Web Vitals?"
4. Pricing cards (all 4 plans)
5. Final CTA

---

## Definition of Done

- [x] Can add a project and run an audit end-to-end
- [x] SiteHealthCard shows composite score + all 4 Lighthouse categories
- [x] Metric cards display with correct grades and colors
- [x] SEO + Accessibility audits shown (failing items only)
- [x] Plain-Portuguese explanation shown for each metric
- [x] Action plan shows top issues with fix guidance
- [x] Share link works without auth (`/share/[token]`)
- [x] Free plan limit enforced (1 project, 5 runs/month)
- [x] Landing page live with new consultancy positioning
