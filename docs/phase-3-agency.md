# Phase 3 — Agency

**Goal:** PDF reports, team accounts, white-label. Unlock Agência tier (R$449/mês) full potential.
**Duration:** 2–3 weeks
**Depends on:** Phase 2 with paying customers

---

## New Features

1. PDF report generation with @react-pdf/renderer
2. White-label: custom logo, color, footer
3. Multi-user teams via Clerk Organizations
4. Project tagging / grouping by client
5. Weekly digest email for all projects

---

## Steps

### 1. PDF Report Generation

```bash
pnpm add @react-pdf/renderer
```

**Why @react-pdf/renderer:** Works in Vercel Functions without Chromium. Build PDF layouts with React components. Trade-off: limited CSS, no web fonts by default, needs font registration.

**PDF Architecture:**
```
POST /api/projects/[id]/reports
  → Fetch latest audit result from DB
  → Generate PDF via renderToBuffer()
  → Upload to Vercel Blob
  → Save report record to DB (blob URL)
  → Return signed download URL
```

**PDF Component structure:**
```tsx
// src/lib/pdf/AuditReport.tsx
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer"

Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/..." },
    { src: "...", fontWeight: 700 },
  ],
})

export function AuditReportPDF({ project, audit, actionPlan, branding }: ReportProps) {
  const accent = branding?.accentColor ?? "#2563eb"
  return (
    <Document title={`Relatório de Performance — ${project.name}`}>
      <Page size="A4"><CoverPage ... /></Page>
      <Page size="A4"><ExecutiveSummary ... /></Page>
      <Page size="A4"><ActionPlanSection ... /></Page>
    </Document>
  )
}
```

**PDF Report Content:**
- **Page 1 — Cover:** Agency logo, site name + URL, audit date, overall grade
- **Page 2 — Resumo Executivo:** Site Health score, CWV at a glance, Key Finding, Quick Win
- **Page 3 — Métricas:** Each CWV with value, grade, explanation, field vs lab comparison
- **Page 4 — Plano de Ação:** Numbered action items (AI-generated or static)
- **Page 5 — SEO e Acessibilidade:** Failing SEO/A11y items with PT-BR labels

**Generate and store:**
```typescript
// src/app/api/projects/[id]/reports/route.ts
const pdfBuffer = await renderToBuffer(<AuditReportPDF ... />)
const { url } = await put(`reports/${project.id}/${audit.id}.pdf`, pdfBuffer, {
  access: "public",
  contentType: "application/pdf",
})
await db.insert(reports).values({ projectId, auditId, blobUrl: url, createdBy: userId })
return Response.json({ url })
```

`reports` table already exists in schema. Plan-gated: Studio+ can generate reports; white-label (custom branding) requires Agência.

### 2. White-Label Branding

```typescript
// New table: project_branding
export const projectBranding = pgTable("project_branding", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  logoUrl: text("logo_url"),           // Vercel Blob URL
  accentColor: text("accent_color").default("#2563eb"),
  agencyName: text("agency_name"),
  agencyContact: text("agency_contact"),
  createdAt: timestamptz("created_at").default(sql`NOW()`),
})
```

**Settings UI** (`/settings/branding`):
- Upload logo (max 2MB, PNG/SVG preferred)
- Color picker for accent color
- Agency name + contact info text fields
- PDF preview button (generates a sample PDF)

**Logo upload:** `POST /api/branding/logo` → `put()` to Vercel Blob → save URL to DB

### 3. Multi-User Teams (Clerk Organizations)

Enable Organizations in Clerk dashboard.

```typescript
// projects table already has orgId field
// Query: projects owned by user OR user's org
const userProjects = await db.query.projects.findMany({
  where: or(
    eq(projects.userId, userId),
    eq(projects.orgId, orgId)  // orgId from Clerk auth()
  )
})
```

**Team settings page** (`/settings/team`):
- Current members list
- Invite by email (triggers Clerk invitation)
- Remove member / transfer ownership

Agency plan only. Admin/Member roles are sufficient for Phase 3.

### 4. Project Tagging

```typescript
// Add to projects table
tags: text("tags").array().default([]),
```

Tags are free-form strings (e.g., "cliente: Acme Corp", "produção", "staging").

Dashboard filter bar:
```
[Todos] [cliente: Acme] [produção] [staging] [+ Filtro]
```

### 5. Weekly Digest Email

Vercel Cron: every Monday at 11:00 UTC (8am BRT)

```typescript
// src/app/api/cron/weekly-digest/route.ts
// For each Studio/Agência user:
//   1. Get all their projects
//   2. Get latest audit for each
//   3. Compare to audit from 7 days ago
//   4. Send digest email: summary table + biggest improvements/regressions
```

Digest email structure:
```
Performance Semanal: 5 sites monitorados

MELHOROU ↑
  acme.com        72 → 85  +13 pontos

ESTÁVEL →
  beta.com        68       sem mudança

PIOROU ↓
  gamma.com       91 → 76  -15 pontos ⚠️

Ver todos os relatórios →
```

---

## Definition of Done

- [ ] PDF generated and downloadable from dashboard
- [ ] White-label logo and color customization works for Agência plan
- [ ] PDF is agency-ready (professional layout, no broken fonts)
- [ ] Clerk Organizations setup, invite flow works
- [ ] Projects scoped to org when user is in an org
- [ ] Project tagging and dashboard filtering works
- [ ] Weekly digest cron running and sending emails
