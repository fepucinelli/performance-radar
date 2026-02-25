import { auth } from "@clerk/nextjs/server"
import { db, projects, auditResults, users } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { runAuditForProject, PSIError } from "@/lib/audit-runner"
import { PLAN_LIMITS } from "@/lib/utils/plan-limits"
import { getMonthlyRunCount } from "@/app/actions/projects"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: projectId } = await params

  // Verify project exists and belongs to this user
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
  })
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 })
  }

  // Enforce monthly run limit for free plan
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { plan: true },
  })
  const plan = (user?.plan ?? "free") as keyof typeof PLAN_LIMITS
  const limits = PLAN_LIMITS[plan]

  if (limits.manualRunsPerMonth !== -1) {
    const runCount = await getMonthlyRunCount(userId)
    if (runCount >= limits.manualRunsPerMonth) {
      return Response.json(
        {
          error: `Monthly audit limit reached (${limits.manualRunsPerMonth} runs). Upgrade to continue.`,
          limitReached: true,
        },
        { status: 429 }
      )
    }
  }

  try {
    const auditId = await runAuditForProject(projectId, "manual")
    const result = await db.query.auditResults.findFirst({
      where: eq(auditResults.id, auditId),
    })
    return Response.json(result)
  } catch (err) {
    if (err instanceof PSIError) {
      return Response.json({ error: err.message }, { status: 502 })
    }
    console.error("[audit] Unexpected error:", err)
    return Response.json({ error: "Audit failed" }, { status: 500 })
  }
}
