"use server"

import { auth } from "@clerk/nextjs/server"
import { db, projects, users } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { PLAN_LIMITS } from "@/lib/utils/plan-limits"
import { nextNoonBRT } from "@/lib/utils/schedule"

type Schedule = "manual" | "daily" | "hourly"

export type UpdateScheduleResult = {
  error?: string
  planGated?: boolean
} | null

export async function updateScheduleAction(
  projectId: string,
  schedule: Schedule
): Promise<UpdateScheduleResult> {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthorized" }

  // Verify project ownership
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
    columns: { id: true, schedule: true },
  })
  if (!project) return { error: "Project not found" }

  // Check plan allows scheduled audits
  if (schedule !== "manual") {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { plan: true },
    })
    const plan = (user?.plan ?? "free") as keyof typeof PLAN_LIMITS
    const limits = PLAN_LIMITS[plan]

    if (!limits.scheduledRuns) {
      return {
        error: "Scheduled audits require a paid plan. Upgrade to enable daily or hourly monitoring.",
        planGated: true,
      }
    }

    if (schedule === "hourly" && !limits.hourlyRuns) {
      return {
        error: "Monitoramento por hora requer o plano Pro ou superior.",
        planGated: true,
      }
    }
  }

  // Compute nextAuditAt for the first scheduled run
  let nextAuditAt: Date | null = null
  if (schedule === "daily") {
    // First run at the next noon BRT (12:00 Brasília = 15:00 UTC)
    nextAuditAt = nextNoonBRT()
  } else if (schedule === "hourly") {
    // First run on the next cron tick (within the hour)
    nextAuditAt = new Date()
    nextAuditAt.setMinutes(nextAuditAt.getMinutes() + 5)
  }

  await db
    .update(projects)
    .set({ schedule, nextAuditAt, updatedAt: new Date() })
    .where(eq(projects.id, projectId))

  revalidatePath(`/projects/${projectId}`)
  return null
}
