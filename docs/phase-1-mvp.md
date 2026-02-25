# Phase 1 — MVP

**Goal:** URL → run → plain-English performance report. Free tier live. Post and get first users.
**Duration:** 1–2 weeks
**Depends on:** Phase 0 complete

---

## Core User Flow

```
1. User signs up
2. Creates a project (name + URL)
3. Clicks "Run Audit"
4. Sees loading state (~5–8s while PSI runs)
5. Gets report:
   - Performance score (0–100)
   - CWV metric cards (LCP, INP, CLS, FCP, TTFB)
   - Plain-English explanation per metric
   - Action Plan: top issues prioritized
   - Full Lighthouse audit list (collapsed)
6. Can share report via public link
```

---

## Steps

### 1. PSI API Client

```typescript
// src/lib/api/pagespeed.ts

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"

export type PSIStrategy = "mobile" | "desktop"

export interface AuditData {
  perfScore: number
  lcp: number | null
  cls: number | null
  inp: number | null
  fcp: number | null
  ttfb: number | null
  tbt: number | null
  speedIndex: number | null
  // CrUX field data (null if origin not in CrUX)
  cruxLcp: number | null
  cruxCls: number | null
  cruxInp: number | null
  cruxFcp: number | null
  // Full lighthouse response for action plans
  lighthouseRaw: unknown
  psiApiVersion: string
}

export async function runPSIAudit(url: string, strategy: PSIStrategy): Promise<AuditData> {
  const params = new URLSearchParams({
    url,
    strategy,
    key: process.env.GOOGLE_API_KEY!,
    // Request specific categories to limit response size
    "category": "performance",
  })

  const res = await fetch(`${PSI_ENDPOINT}?${params}`, {
    // Don't cache on Vercel CDN — always fresh audit
    cache: "no-store",
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(`PSI API error: ${error.error?.message ?? res.statusText}`)
  }

  const data = await res.json()

  const lhr = data.lighthouseResult
  const field = data.loadingExperience

  return {
    perfScore: Math.round(lhr.categories.performance.score * 100),
    lcp: getAuditNumericValue(lhr, "largest-contentful-paint"),
    cls: getAuditNumericValue(lhr, "cumulative-layout-shift"),
    inp: getAuditNumericValue(lhr, "interaction-to-next-paint"),
    fcp: getAuditNumericValue(lhr, "first-contentful-paint"),
    ttfb: getAuditNumericValue(lhr, "server-response-time"),
    tbt: getAuditNumericValue(lhr, "total-blocking-time"),
    speedIndex: getAuditNumericValue(lhr, "speed-index"),
    // CrUX field data
    cruxLcp: field?.metrics?.LARGEST_CONTENTFUL_PAINT_MS?.percentiles?.p75 ?? null,
    cruxCls: field?.metrics?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentiles?.p75 ?? null,
    cruxInp: field?.metrics?.INTERACTION_TO_NEXT_PAINT?.percentiles?.p75 ?? null,
    cruxFcp: field?.metrics?.FIRST_CONTENTFUL_PAINT_MS?.percentiles?.p75 ?? null,
    lighthouseRaw: lhr,
    psiApiVersion: lhr.lighthouseVersion,
  }
}

function getAuditNumericValue(lhr: any, auditId: string): number | null {
  return lhr.audits?.[auditId]?.numericValue ?? null
}
```

### 2. Metric Grading Utilities

```typescript
// src/lib/utils/metrics.ts

export type Grade = "good" | "needs-improvement" | "poor"

export const THRESHOLDS = {
  lcp:  { good: 2500,  poor: 4000 },   // ms
  cls:  { good: 0.1,   poor: 0.25 },
  inp:  { good: 200,   poor: 500 },    // ms
  fcp:  { good: 1800,  poor: 3000 },   // ms
  ttfb: { good: 800,   poor: 1800 },   // ms
} as const

export function gradeMetric(metric: keyof typeof THRESHOLDS, value: number): Grade {
  const t = THRESHOLDS[metric]
  if (value <= t.good) return "good"
  if (value <= t.poor) return "needs-improvement"
  return "poor"
}

export const GRADE_COLORS: Record<Grade, string> = {
  good: "text-green-600 bg-green-50",
  "needs-improvement": "text-amber-600 bg-amber-50",
  poor: "text-red-600 bg-red-50",
}

export function formatMetricValue(metric: string, value: number): string {
  if (metric === "cls") return value.toFixed(3)
  if (["lcp", "fcp", "ttfb", "inp"].includes(metric)) {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`
  }
  return String(value)
}
```

### 3. Plain-English Explanations

```typescript
// src/lib/utils/explanations.ts

export const METRIC_EXPLANATIONS = {
  lcp: {
    name: "Largest Contentful Paint",
    shortName: "LCP",
    what: "How long it takes for the main content of the page to load.",
    why: "Visitors experience LCP as 'when did the page feel ready?' Slow LCP means people think the page is broken.",
    unit: "seconds",
  },
  cls: {
    name: "Cumulative Layout Shift",
    shortName: "CLS",
    what: "How much the page jumps around while loading.",
    why: "Layout shifts cause misclicks — users click one button and a different one appears. Frustrating and can cause accidental purchases or missed links.",
    unit: "score (lower is better)",
  },
  inp: {
    name: "Interaction to Next Paint",
    shortName: "INP",
    what: "How quickly the page responds when you click, tap, or type.",
    why: "If a page takes > 200ms to respond to clicks, it feels frozen. INP measures this for all interactions.",
    unit: "milliseconds",
  },
  fcp: {
    name: "First Contentful Paint",
    shortName: "FCP",
    what: "When the first piece of content appears on screen.",
    why: "Tells visitors 'something is happening.' FCP > 2s and people assume the page failed to load.",
    unit: "seconds",
  },
  ttfb: {
    name: "Time to First Byte",
    shortName: "TTFB",
    what: "How fast your server sends back the first byte of the page.",
    why: "This is purely server-side. Slow TTFB means your hosting, database queries, or server-side code is slow. Everything else waits on this.",
    unit: "milliseconds",
  },
}

// Top-level action items based on failed Lighthouse audits
// Maps Lighthouse audit IDs to plain-English fixes
export const AUDIT_ACTIONS: Record<string, { title: string; fix: string; impact: "high" | "medium" | "low" }> = {
  "render-blocking-resources": {
    title: "Remove render-blocking resources",
    fix: "CSS and JS files are blocking the page from showing. Add `defer` or `async` to script tags, or inline critical CSS.",
    impact: "high",
  },
  "uses-optimized-images": {
    title: "Serve optimized images",
    fix: "Your images are too large. Use WebP format, compress them, and set proper dimensions. Tools: Squoosh, TinyPNG.",
    impact: "high",
  },
  "unused-javascript": {
    title: "Reduce unused JavaScript",
    fix: "JavaScript is being loaded but not used. Code-split your bundles, remove unused libraries, or lazy-load non-critical code.",
    impact: "high",
  },
  "uses-long-cache-ttl": {
    title: "Serve static assets with an efficient cache policy",
    fix: "Set longer cache headers (1 year) for images, fonts, and JS/CSS files that don't change often.",
    impact: "medium",
  },
  "uses-text-compression": {
    title: "Enable text compression",
    fix: "Enable Gzip or Brotli compression on your server. This reduces file transfer size by 60–80%.",
    impact: "medium",
  },
  "server-response-time": {
    title: "Reduce server response time",
    fix: "Your server is slow to respond. Check database queries, enable server-side caching, or upgrade your hosting tier.",
    impact: "high",
  },
  "uses-responsive-images": {
    title: "Properly size images",
    fix: "Images are larger than they're displayed. Add `srcset` to serve smaller images to mobile devices.",
    impact: "medium",
  },
  "offscreen-images": {
    title: "Defer offscreen images",
    fix: "Images below the fold are loaded immediately. Add `loading='lazy'` to images that aren't visible on load.",
    impact: "medium",
  },
  "unminified-javascript": {
    title: "Minify JavaScript",
    fix: "JS files aren't minified. If using a build tool, enable minification. For WordPress, use a caching plugin with JS minification.",
    impact: "low",
  },
  "unminified-css": {
    title: "Minify CSS",
    fix: "CSS files aren't minified. Enable CSS minification in your build tool or caching plugin.",
    impact: "low",
  },
}

export function getActionPlan(lighthouseRaw: any): Array<{
  auditId: string
  title: string
  fix: string
  impact: "high" | "medium" | "low"
  savings?: string
}> {
  const audits = lighthouseRaw?.audits ?? {}

  return Object.entries(AUDIT_ACTIONS)
    .filter(([auditId]) => {
      const audit = audits[auditId]
      return audit && audit.score !== null && audit.score < 0.9
    })
    .map(([auditId, action]) => ({
      auditId,
      ...action,
      savings: audits[auditId]?.displayValue ?? undefined,
    }))
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.impact] - order[b.impact]
    })
    .slice(0, 8) // Top 8 actions
}
```

### 4. API Route: Run Audit

```typescript
// src/app/api/projects/[id]/audit/route.ts
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { projects, auditResults } from "@/lib/db/schema"
import { runPSIAudit } from "@/lib/api/pagespeed"
import { gradeMetric } from "@/lib/utils/metrics"
import { eq, and } from "drizzle-orm"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = auth()
  if (!userId) return new Response("Unauthorized", { status: 401 })

  // Verify project belongs to user
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, params.id), eq(projects.userId, userId)),
  })
  if (!project) return new Response("Not found", { status: 404 })

  // TODO Phase 2: Check plan limits here

  const auditData = await runPSIAudit(project.url, project.strategy as "mobile" | "desktop")

  const [result] = await db.insert(auditResults).values({
    projectId: project.id,
    strategy: project.strategy ?? "mobile",
    ...auditData,
    lcpGrade: auditData.lcp ? gradeMetric("lcp", auditData.lcp) : null,
    clsGrade: auditData.cls ? gradeMetric("cls", auditData.cls) : null,
    inpGrade: auditData.inp ? gradeMetric("inp", auditData.inp) : null,
  }).returning()

  return Response.json(result)
}
```

### 5. UI Components

**MetricCard** — the core display unit:

```
┌──────────────────────────────┐
│  LCP                         │
│  Largest Contentful Paint    │
│                              │
│  2.1s          ● Good        │
│  ─────────────────────────   │
│  Field data: 2.4s            │
│                              │
│  How long the main content   │
│  takes to appear.            │
└──────────────────────────────┘
```

Key components to build:
- `components/metrics/MetricCard.tsx`
- `components/metrics/ScoreGauge.tsx` — circular gauge 0–100
- `components/metrics/ActionPlan.tsx` — prioritized list of fixes
- `components/metrics/AuditList.tsx` — full Lighthouse audit table (collapsible)
- `components/dashboard/ProjectCard.tsx` — card in project list
- `components/dashboard/RunButton.tsx` — button + loading state

### 6. Pages

**`/dashboard`** — project list
- Empty state: "Add your first project" CTA
- Project cards showing latest score + CWV grades
- Quick "Run now" action per card

**`/projects/new`** — add project form
- Fields: Name (optional, auto-fills from URL), URL, Strategy (mobile/desktop)
- URL validation (must be https://, no localhost)

**`/projects/[id]`** — project detail
- Latest audit result
- Metric cards
- Action Plan section
- Full audit list (collapsed by default)
- "Run Again" button
- Share link generation

**`/audits/[id]` (public)** — shareable report
- No auth required
- Read-only view of a single audit result
- "Check your site free" CTA at bottom

### 7. URL Validation

```typescript
// src/lib/utils/validate-url.ts
export function validateAuditUrl(rawUrl: string): { valid: boolean; error?: string } {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { valid: false, error: "Please enter a valid URL (e.g. https://yoursite.com)" }
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { valid: false, error: "URL must start with https://" }
  }

  const privateRanges = ["localhost", "127.", "192.168.", "10.", "172.16."]
  if (privateRanges.some(r => url.hostname.startsWith(r))) {
    return { valid: false, error: "Cannot audit local or private network URLs" }
  }

  return { valid: true }
}
```

### 8. Share Link Feature

Generate a public token when an audit is created. Store in `audit_results.share_token`.

```
GET /audits/[shareToken] → public read-only audit view
```

Add `share_token` column:
```sql
ALTER TABLE audit_results ADD COLUMN share_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT;
```

---

## Free Plan Limits (enforced in Phase 1)

```typescript
// src/lib/utils/plan-limits.ts
export const PLAN_LIMITS = {
  free: {
    maxProjects: 1,
    manualRunsPerMonth: 10,
    scheduledRuns: false,
    pdfReports: false,
  },
  starter: {
    maxProjects: 5,
    manualRunsPerMonth: -1, // unlimited
    scheduledRuns: true,
    pdfReports: false,
  },
  pro: {
    maxProjects: 20,
    manualRunsPerMonth: -1,
    scheduledRuns: true,
    pdfReports: true,
  },
  agency: {
    maxProjects: 100,
    manualRunsPerMonth: -1,
    scheduledRuns: true,
    pdfReports: true,
  },
}
```

Phase 1 only enforces `maxProjects: 1` for free users. Run limits come in Phase 2.

---

## Landing Page (Minimal)

Must ship with MVP to capture signups:

**Above the fold:**
- Headline: "Core Web Vitals for founders, not engineers."
- Sub: "Paste your URL. Get a plain-English performance report with a prioritized action plan."
- [Input: your URL] [Analyze free →]

**Sections:**
1. "What are Core Web Vitals?" — brief, human explanation
2. Product screenshot (real screenshot from your own audit)
3. Pricing table (Free + teaser for paid)
4. Sign-up CTA

**No need to build marketing pages yet.** Ship a single `app/(marketing)/page.tsx`.

---

## Definition of Done

- [ ] Can add a project and run an audit end-to-end
- [ ] Metric cards display with correct grades and colors
- [ ] Plain-English explanation shown for each metric
- [ ] Action plan shows top issues with fix guidance
- [ ] Share link works without auth
- [ ] Free plan limit enforced (1 project)
- [ ] Landing page live with email capture
- [ ] Deployed to production
- [ ] Post on Indie Hackers / X / relevant subreddits
