/**
 * Shared audit execution logic.
 *
 * Called by both the manual audit route (/api/projects/[id]/audit)
 * and the scheduled job handler (/api/jobs/run-audit).
 */
import { db, projects, auditResults } from "@/lib/db"
import { eq } from "drizzle-orm"
import { runPSIAudit, PSIError } from "@/lib/api/pagespeed"
import { gradeMetric } from "@/lib/utils/metrics"
import { checkAndFireAlerts } from "@/lib/alerts"
import type { Strategy } from "@/lib/db/schema"

export { PSIError }

/**
 * Run a PSI audit for the given project and persist the result.
 * Returns the new auditResult ID.
 * Throws PSIError on API failure or Error if project not found.
 */
export async function runAuditForProject(
  projectId: string,
  triggeredBy: "manual" | "cron" | "api"
): Promise<string> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  })
  if (!project) {
    throw new Error(`Project not found: ${projectId}`)
  }

  const auditData = await runPSIAudit(project.url, project.strategy as Strategy)

  const [result] = await db
    .insert(auditResults)
    .values({
      projectId: project.id,
      strategy: project.strategy,
      perfScore: auditData.perfScore,
      lcp: auditData.lcp,
      cls: auditData.cls,
      inp: auditData.inp,
      fcp: auditData.fcp,
      ttfb: auditData.ttfb,
      tbt: auditData.tbt,
      speedIndex: auditData.speedIndex,
      cruxLcp: auditData.cruxLcp,
      cruxCls: auditData.cruxCls,
      cruxInp: auditData.cruxInp,
      cruxFcp: auditData.cruxFcp,
      lcpGrade: auditData.lcp ? gradeMetric("lcp", auditData.lcp) : null,
      clsGrade: auditData.cls ? gradeMetric("cls", auditData.cls) : null,
      inpGrade: auditData.inp ? gradeMetric("inp", auditData.inp) : null,
      lighthouseRaw: auditData.lighthouseRaw,
      psiApiVersion: auditData.psiApiVersion,
      triggeredBy,
    })
    .returning()

  if (!result) throw new Error("Failed to insert audit result")

  await db
    .update(projects)
    .set({ lastAuditAt: new Date(), updatedAt: new Date() })
    .where(eq(projects.id, project.id))

  // Fire alerts if any thresholds are breached (no-op if none configured)
  await checkAndFireAlerts(
    { id: project.id, userId: project.userId, name: project.name, url: project.url },
    { id: result.id, lcp: result.lcp, cls: result.cls, inp: result.inp, triggeredBy: result.triggeredBy }
  )

  return result.id
}
