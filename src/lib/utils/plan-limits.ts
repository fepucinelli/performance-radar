import type { PlanLimits, PlanName } from "@/types"

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  free: {
    maxProjects: 1,
    manualRunsPerMonth: 10,
    scheduledRuns: false,
    emailAlerts: false,
    pdfReports: false,
    slackAlerts: false,
    historyDays: 7,
  },
  starter: {
    maxProjects: 5,
    manualRunsPerMonth: -1,
    scheduledRuns: true,
    emailAlerts: true,
    pdfReports: false,
    slackAlerts: false,
    historyDays: 30,
  },
  pro: {
    maxProjects: 20,
    manualRunsPerMonth: -1,
    scheduledRuns: true,
    emailAlerts: true,
    pdfReports: true,
    slackAlerts: true,
    historyDays: 90,
  },
  agency: {
    maxProjects: 100,
    manualRunsPerMonth: -1,
    scheduledRuns: true,
    emailAlerts: true,
    pdfReports: true,
    slackAlerts: true,
    historyDays: 365,
  },
}
