"use server"

import { auth } from "@clerk/nextjs/server"
import { db, projects } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export interface AlertThresholds {
  alertLcp: number | null
  alertCls: number | null
  alertInp: number | null
}

export async function updateAlertThresholdsAction(
  projectId: string,
  thresholds: AlertThresholds
): Promise<{ error?: string } | null> {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthorized" }

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
    columns: { id: true },
  })
  if (!project) return { error: "Project not found" }

  await db
    .update(projects)
    .set({
      alertLcp: thresholds.alertLcp,
      alertCls: thresholds.alertCls,
      alertInp: thresholds.alertInp,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))

  revalidatePath(`/projects/${projectId}`)
  return null
}
