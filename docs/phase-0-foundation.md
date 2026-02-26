# Phase 0 — Foundation

**Goal:** Deployed, authenticated, database-connected app on Vercel. No product features yet.
**Duration:** 1–2 days
**Status:** ✅ Complete
**Branch:** `main` (this is the base everything builds on)

---

## Steps

### 1. Init Next.js Project

```bash
pnpx create-next-app@latest perf-ally \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
cd perf-ally
pnpm install
```

**Versions in use:** Next.js 16.1.6, React 19, TypeScript, Tailwind CSS v4.

**Tailwind v4 note:** CSS-based config — no `tailwind.config.ts`. Instead, `@import "tailwindcss"` in `globals.css`. shadcn/ui components need `@import "tw-animate-css"` for animation support.

### 2. Install Core Dependencies

```bash
# UI
pnpm add @radix-ui/react-icons
pnpx shadcn@latest init   # choose: new-york style, zinc base
pnpx shadcn@latest add button card input label badge separator skeleton

# Auth
pnpm add @clerk/nextjs

# Database
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit

# Utilities
pnpm add zod @t3-oss/env-nextjs
pnpm add clsx tailwind-merge class-variance-authority

# Monitoring
pnpm add @sentry/nextjs
```

### 3. Clerk Setup

1. Create app at [clerk.com](https://clerk.com)
2. Set env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
3. Add redirect URLs for sign-in/sign-up

**Important — Next.js 16 uses `proxy.ts`, not `middleware.ts`:**

```typescript
// src/proxy.ts   ← NOT middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/projects(.*)"])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect()
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
```

```typescript
// src/app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="pt-BR">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

Create route groups:
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

### 4. Neon + Drizzle Setup

1. Create project at [neon.tech](https://neon.tech)
2. Connect via Vercel integration (recommended) or copy `DATABASE_URL`

**Important gotcha — `timestamptz` is not exported from drizzle-orm/pg-core v0.45.** Use a local alias:

```typescript
// src/lib/db/schema.ts
import { pgTable, text, real, uuid, timestamp, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// timestamptz is NOT exported from drizzle-orm/pg-core v0.45 — use this alias
const timestamptz = (name: string) => timestamp(name, { withTimezone: true })
```

Initial schema (Phase 0 — grows through later phases):

```typescript
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull(),
  name: text("name"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  plan: text("plan", { enum: ["free", "starter", "pro", "agency"] }).notNull().default("free"),
  planExpiresAt: timestamptz("plan_expires_at"),
  createdAt: timestamptz("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamptz("updated_at").notNull().default(sql`NOW()`),
})

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  strategy: text("strategy", { enum: ["mobile", "desktop"] }).notNull().default("mobile"),
  schedule: text("schedule", { enum: ["manual", "daily", "hourly"] }).notNull().default("manual"),
  nextAuditAt: timestamptz("next_audit_at"),
  lastAuditAt: timestamptz("last_audit_at"),
  alertLcp: real("alert_lcp"),
  alertCls: real("alert_cls"),
  alertInp: real("alert_inp"),
  orgId: text("org_id"), // Phase 3: Clerk org ID for team projects
  createdAt: timestamptz("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamptz("updated_at").notNull().default(sql`NOW()`),
})

export const auditResults = pgTable("audit_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  strategy: text("strategy", { enum: ["mobile", "desktop"] }).notNull(),
  perfScore: real("perf_score"),
  lcp: real("lcp"), cls: real("cls"), inp: real("inp"),
  fcp: real("fcp"), ttfb: real("ttfb"), tbt: real("tbt"), speedIndex: real("speed_index"),
  cruxLcp: real("crux_lcp"), cruxCls: real("crux_cls"), cruxInp: real("crux_inp"), cruxFcp: real("crux_fcp"),
  lcpGrade: text("lcp_grade"), clsGrade: text("cls_grade"), inpGrade: text("inp_grade"),
  seoScore: real("seo_score"),
  accessibilityScore: real("accessibility_score"),
  bestPracticesScore: real("best_practices_score"),
  lighthouseRaw: jsonb("lighthouse_raw"),
  aiActionPlan: jsonb("ai_action_plan"),
  cruxHistoryRaw: jsonb("crux_history_raw"),
  shareToken: text("share_token").notNull().default(sql`gen_random_uuid()::text`),
  psiApiVersion: text("psi_api_version"),
  triggeredBy: text("triggered_by", { enum: ["manual", "cron", "api"] }).notNull().default("manual"),
  createdAt: timestamptz("created_at").notNull().default(sql`NOW()`),
})
```

```typescript
// src/lib/db/index.ts
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

**Important — drizzle-kit doesn't auto-load `.env.local`.** Add dotenv load at the top of `drizzle.config.ts`:

```typescript
// drizzle.config.ts
import { config } from "dotenv"
config({ path: ".env.local" })

import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

Add to `package.json`:
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

**Push the schema:** Use `pnpm exec drizzle-kit push --force` (the `pnpm db:push` alias may fail due to double-dash arg parsing).

### 5. Clerk Webhook → DB Sync

```typescript
// src/app/api/webhooks/clerk/route.ts
import { Webhook } from "svix"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function POST(req: Request) {
  const payload = await req.text()
  const headers = Object.fromEntries(req.headers)

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)
  const event = wh.verify(payload, headers) as { type: string; data: { id: string; email_addresses: { email_address: string }[]; first_name?: string; last_name?: string } }

  if (event.type === "user.created") {
    await db.insert(users).values({
      id: event.data.id,
      email: event.data.email_addresses[0]!.email_address,
      name: `${event.data.first_name ?? ""} ${event.data.last_name ?? ""}`.trim() || null,
    }).onConflictDoNothing()
  }

  if (event.type === "user.deleted") {
    await db.delete(users).where(eq(users.id, event.data.id))
  }

  return new Response("OK")
}
```

**Note:** `createProjectAction` also does `onConflictDoNothing` user upsert as a safety net for when the webhook isn't wired yet.

### 6. Dashboard Layout Skeleton

```
src/app/(dashboard)/
├── layout.tsx         # Sidebar + top nav (uses Clerk's UserButton)
├── dashboard/
│   └── page.tsx       # "No projects yet" empty state
└── projects/
    └── new/
        └── page.tsx   # Add project form (not wired yet)
```

All dashboard pages require `export const dynamic = "force-dynamic"` since they read Clerk session.

### 7. Vercel Deployment

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables in Vercel dashboard
4. Connect Neon via Vercel Neon integration
5. Configure Clerk production instance

### 8. Sentry Setup

```bash
pnpx @sentry/wizard@latest -i nextjs
```

Follow wizard — it auto-configures `instrumentation.ts` and `sentry.*.config.ts`.

---

## vercel.json (starting point)

```json
{
  "crons": []
}
```

Crons added in Phase 2.

---

## .env.example

```
# Database
DATABASE_URL=

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Google APIs (Phase 1+)
GOOGLE_API_KEY=

# AI (Phase 2)
ANTHROPIC_API_KEY=

# Stripe (Phase 2)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_STARTER_PRICE_ID=
STRIPE_PRO_PRICE_ID=
STRIPE_AGENCY_PRICE_ID=

# Email (Phase 2)
RESEND_API_KEY=

# Queue / Cache (Phase 2)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

# Storage (Phase 3)
BLOB_READ_WRITE_TOKEN=

# Monitoring
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

---

## Definition of Done

- [x] `pnpm dev` works locally
- [x] Can sign up and sign in via Clerk
- [x] User row created in DB on sign-up
- [x] Dashboard route redirects to sign-in if unauthenticated
- [x] App deployed to Vercel production URL
- [x] Preview deployments working on PRs
