# Phase 4 — Growth

**Goal:** Product virality, integrations, competitor analysis.
**Duration:** 4–8 weeks (parallel tracks, prioritize by demand)
**Depends on:** Phase 2 live with paying customers

---

## Features promoted to Phase 2 (already done)

- [x] **AI-powered action plans** (Track C) → ✅ Done in Phase 2
- [x] **SEO + Accessibility score integration** (Track D) → ✅ Done in Phase 2
- [x] **CrUX History API** (Track E) → ✅ Done in Phase 2

---

## Track A — Virality & Distribution

### 1. `/check` Public URL Analyzer

`/check` — a public-facing URL analyzer:
1. Enter URL → runs PSI audit (no account required)
2. Shows preview results (score + grades)
3. Gate: "Sign up free to see the full action plan"

Top-of-funnel acquisition tool. Drive traffic from blog posts, social media, and SEO ("test website performance free").

### 2. Public Performance Badge

```
GET /api/badge/{projectId}  →  returns SVG with current score
```

Embeddable `<img>` showing current score. Clicking links back to PerfAlly. Powers product virality.

### 3. Refer-a-Friend

Simple referral system:
- User gets a referral link (`/r/[code]`)
- Referred user signs up + subscribes → referrer gets 1 month free
- Track via `referrals` table: `referrer_id`, `referred_id`, `credited_at`

---

## Track B — Integrations

### 4. Slack Alerts

```typescript
// In project settings: enter Slack Webhook URL
// When alert fires, also POST to Slack if configured

const slackWebhook = new IncomingWebhook(project.slackWebhookUrl)
await slackWebhook.send({
  text: `⚠️ Performance degradada em ${project.name}`,
  blocks: [
    {
      type: "section",
      text: { type: "mrkdwn", text: `*LCP:* 4,2s (antes: 2,1s)\n*CLS:* 0,31 (antes: 0,09)` }
    },
    {
      type: "actions",
      elements: [{ type: "button", text: { text: "Ver Relatório" }, url: auditUrl }]
    }
  ]
})
```

Already in `PLAN_LIMITS.slackAlerts` for Studio+ — just needs the UI and delivery code.

### 5. Webhook Notifications

```typescript
// project settings: add webhook URLs
export const projectWebhooks = pgTable("project_webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id),
  url: text("url").notNull(),
  events: text("events").array().default(["audit.completed", "alert.triggered"]),
  secret: text("secret"),  // HMAC signing
})
```

POST to all webhooks on audit complete. Sign payload with HMAC-SHA256.

---

## Track C — Analytics & Competitive Intelligence

### 6. Competitor Comparison

Compare your site vs competitor URL side-by-side:
- Run PSI audit on both URLs
- Display scores in a two-column layout
- Available on Studio+

### 7. Performance Budget

```typescript
// project settings: set targets per metric
export const performanceBudgets = pgTable("performance_budgets", {
  projectId: uuid("project_id").primaryKey().references(() => projects.id),
  perfScoreMin: real("perf_score_min").default(70),
  lcpMax: real("lcp_max").default(2500),
  clsMax: real("cls_max").default(0.1),
  inpMax: real("inp_max").default(200),
})
```

After each audit, check against budget. Show "FORA DO ORÇAMENTO" badge in project list. Alert when budget breached.

---

## Track D — Retention

### 8. Onboarding Improvements

- Interactive first-run experience
- Demo project (pre-loaded with example data from a real slow site)
- Onboarding checklist: "Add your first project → Run audit → Set up monitoring"

---

## Definition of Done

Prioritize by what users are actually asking for. Don't build all of this — pick 2–3 items from each track based on feedback.

**Minimum for Phase 4 ship:**
- [ ] `/check` public URL analyzer live (top conversion driver)
- [ ] Slack alerts working (high demand from Studio users)
- [ ] Performance badge embeddable

**Stretch:**
- [ ] Competitor comparison
- [ ] Referral system
- [ ] Webhook notifications
