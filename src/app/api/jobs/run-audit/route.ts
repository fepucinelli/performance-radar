/**
 * POST /api/jobs/run-audit
 *
 * QStash job handler. Receives a projectId, runs a PSI audit,
 * and updates nextAuditAt based on the project's schedule.
 *
 * In production: verifies the Upstash-Signature header.
 * In dev (no signing keys): skips verification for easy local testing.
 */
import { db, projects } from "@/lib/db"
import { eq } from "drizzle-orm"
import { env } from "@/env"
import { runAuditForProject, PSIError } from "@/lib/audit-runner"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const rawBody = await req.text()

  // Verify Upstash signature in production
  if (env.QSTASH_CURRENT_SIGNING_KEY && env.QSTASH_NEXT_SIGNING_KEY) {
    const { Receiver } = await import("@upstash/qstash")
    const receiver = new Receiver({
      currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
    })

    const signature = req.headers.get("upstash-signature") ?? ""
    const isValid = await receiver
      .verify({ signature, body: rawBody })
      .catch(() => false)

    if (!isValid) {
      return Response.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  let projectId: string
  try {
    const body = JSON.parse(rawBody) as { projectId?: unknown }
    if (typeof body.projectId !== "string") {
      return Response.json({ error: "Missing projectId" }, { status: 400 })
    }
    projectId = body.projectId
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Look up the project's schedule before running (needed for nextAuditAt)
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    columns: { id: true, schedule: true },
  })
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 })
  }

  try {
    await runAuditForProject(projectId, "cron")

    // Schedule the next run based on the project's cadence
    const next = new Date()
    if (project.schedule === "hourly") {
      next.setHours(next.getHours() + 1)
    } else if (project.schedule === "daily") {
      next.setDate(next.getDate() + 1)
    }

    if (project.schedule !== "manual") {
      await db
        .update(projects)
        .set({ nextAuditAt: next, updatedAt: new Date() })
        .where(eq(projects.id, projectId))
    }

    return Response.json({ ok: true })
  } catch (err) {
    if (err instanceof PSIError) {
      // Return 200 so QStash doesn't retry on PSI API errors (permanent failure)
      console.error(`[run-audit] PSI error for project ${projectId}:`, err.message)
      return Response.json({ error: err.message, permanent: true })
    }
    console.error(`[run-audit] Unexpected error for project ${projectId}:`, err)
    // Return 500 so QStash will retry
    return Response.json({ error: "Audit failed" }, { status: 500 })
  }
}
