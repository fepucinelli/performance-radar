export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { db, projects, auditResults, users } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScoreGauge } from "@/components/metrics/ScoreGauge"
import { MetricCard } from "@/components/metrics/MetricCard"
import { ActionPlan } from "@/components/metrics/ActionPlan"
import { AuditList } from "@/components/metrics/AuditList"
import { RunAuditButton } from "@/components/metrics/RunAuditButton"
import { ChevronLeft, Share2, Clock, Globe } from "lucide-react"
import { formatDistanceToNow } from "@/lib/utils/date"
import { ScoreHistoryChart } from "@/components/metrics/ScoreHistoryChart"
import { ScheduleSelector } from "@/components/projects/ScheduleSelector"
import { AlertThresholds } from "@/components/projects/AlertThresholds"
import { PLAN_LIMITS } from "@/lib/utils/plan-limits"
import type { Plan } from "@/lib/db/schema"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) return {}

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, id), eq(projects.userId, userId)),
    columns: { name: true },
  })

  return { title: project?.name ?? "Project" }
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) notFound()

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, id), eq(projects.userId, userId)),
  })
  if (!project) notFound()

  // Latest audit result
  const latestAudit = await db.query.auditResults.findFirst({
    where: eq(auditResults.projectId, project.id),
    orderBy: [desc(auditResults.createdAt)],
  })

  // History for chart + run dots (last 30 runs, oldest-first for the chart)
  const historyDesc = await db.query.auditResults.findMany({
    where: eq(auditResults.projectId, project.id),
    orderBy: [desc(auditResults.createdAt)],
    limit: 30,
    columns: {
      id: true,
      perfScore: true,
      lcp: true,
      cls: true,
      inp: true,
      cruxLcp: true,
      cruxCls: true,
      cruxInp: true,
      createdAt: true,
    },
  })
  const history = [...historyDesc].reverse()

  // User plan for ScheduleSelector + AlertThresholds
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { plan: true },
  })
  const userPlan: Plan = (dbUser?.plan ?? "free") as Plan
  const planLimits = PLAN_LIMITS[userPlan]

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2 mb-1" asChild>
            <Link href="/dashboard">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Todos os projetos
            </Link>
          </Button>
          <h1 className="text-xl font-semibold">{project.name}</h1>
          <div className="text-muted-foreground flex items-center gap-3 text-sm">
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              {new URL(project.url).hostname}
            </a>
            <Badge variant="secondary" className="text-xs">
              {project.strategy === "mobile" ? "📱 Mobile" : "🖥️ Desktop"}
            </Badge>
          </div>
        </div>
        <RunAuditButton projectId={project.id} />
      </div>

      {latestAudit ? (
        <>
          {/* Score overview */}
          <div className="flex flex-wrap items-center gap-6 rounded-xl border bg-white p-5 shadow-sm">
            <ScoreGauge score={latestAudit.perfScore ?? 0} size="lg" />

            <div className="flex-1 space-y-1">
              <p className="text-lg font-semibold">Pontuação de Performance</p>
              <p className="text-muted-foreground text-sm">
                Baseado no Lighthouse {latestAudit.psiApiVersion ?? "audit"} ·
                Dados de laboratório (throttling simulado)
              </p>
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(latestAudit.createdAt)}
              </div>
            </div>

            {/* Share link */}
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/share/${latestAudit.shareToken}`}
                target="_blank"
              >
                <Share2 className="mr-1.5 h-3.5 w-3.5" />
                Compartilhar relatório
              </Link>
            </Button>
          </div>

          {/* Run history dots — newest on the right, up to 10 */}
          {historyDesc.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Execuções recentes:</span>
              <div className="flex gap-1.5">
                {[...historyDesc].reverse().slice(-10).map((run) => (
                  <div
                    key={run.id}
                    title={`Score: ${run.perfScore}`}
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        (run.perfScore ?? 0) >= 90
                          ? "#16a34a"
                          : (run.perfScore ?? 0) >= 50
                            ? "#d97706"
                            : "#dc2626",
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Core Web Vitals */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Core Web Vitals
            </h2>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                metric="lcp"
                value={latestAudit.lcp}
                fieldValue={latestAudit.cruxLcp}
              />
              <MetricCard
                metric="inp"
                value={latestAudit.inp}
                fieldValue={latestAudit.cruxInp}
              />
              <MetricCard
                metric="cls"
                value={latestAudit.cls}
                fieldValue={latestAudit.cruxCls}
              />
            </div>
          </section>

          {/* Diagnostic metrics */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Diagnósticos
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard metric="fcp" value={latestAudit.fcp} fieldValue={latestAudit.cruxFcp} />
              <MetricCard metric="ttfb" value={latestAudit.ttfb} />
            </div>
          </section>

          <Separator />

          {/* Performance Trend */}
          <section>
            <h2 className="mb-3 text-base font-semibold">Evolução da Performance</h2>
            <ScoreHistoryChart data={history} />
          </section>

          <Separator />

          {/* Action Plan */}
          <section>
            <h2 className="mb-1 text-base font-semibold">Plano de Ação</h2>
            <p className="text-muted-foreground mb-3 text-sm">
              Corrija esses problemas na ordem — do maior para o menor impacto.
            </p>
            <ActionPlan lighthouseRaw={latestAudit.lighthouseRaw} />
          </section>

          <Separator />

          {/* Full audit */}
          <section>
            <h2 className="mb-3 text-base font-semibold">
              Auditoria Completa do Lighthouse
            </h2>
            <AuditList lighthouseRaw={latestAudit.lighthouseRaw} />
          </section>

          <Separator />

          {/* Monitoring schedule */}
          <section>
            <h2 className="mb-1 text-base font-semibold">Monitoramento</h2>
            <p className="text-muted-foreground mb-3 text-sm">
              Re-execute esta auditoria automaticamente em um agendamento.
            </p>
            <ScheduleSelector
              projectId={project.id}
              currentSchedule={project.schedule}
              userPlan={userPlan}
            />
          </section>

          <Separator />

          {/* Alert thresholds */}
          <section>
            <h2 className="mb-1 text-base font-semibold">Alertas</h2>
            <AlertThresholds
              projectId={project.id}
              initialLcp={project.alertLcp ?? null}
              initialCls={project.alertCls ?? null}
              initialInp={project.alertInp ?? null}
              hasEmailAlerts={planLimits.emailAlerts}
            />
          </section>
        </>
      ) : (
        /* No audit yet */
        <div className="space-y-6">
          <div className="rounded-xl border border-dashed bg-white p-10 text-center">
            <p className="font-medium">Nenhuma auditoria ainda</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Clique em &ldquo;Executar auditoria&rdquo; para analisar os Core Web
              Vitals deste site. Leva cerca de 10 segundos.
            </p>
          </div>

          <Separator />

          <section>
            <h2 className="mb-1 text-base font-semibold">Monitoramento</h2>
            <p className="text-muted-foreground mb-3 text-sm">
              Re-execute esta auditoria automaticamente em um agendamento.
            </p>
            <ScheduleSelector
              projectId={project.id}
              currentSchedule={project.schedule}
              userPlan={userPlan}
            />
          </section>

          <Separator />

          <section>
            <h2 className="mb-1 text-base font-semibold">Alertas</h2>
            <AlertThresholds
              projectId={project.id}
              initialLcp={project.alertLcp ?? null}
              initialCls={project.alertCls ?? null}
              initialInp={project.alertInp ?? null}
              hasEmailAlerts={planLimits.emailAlerts}
            />
          </section>
        </div>
      )}
    </div>
  )
}
