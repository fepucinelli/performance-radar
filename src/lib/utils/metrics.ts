import type { Grade } from "@/lib/db/schema"

// Google's official Core Web Vitals thresholds (2025)
export const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 }, // ms
  cls: { good: 0.1, poor: 0.25 }, // unitless
  inp: { good: 200, poor: 500 }, // ms
  fcp: { good: 1800, poor: 3000 }, // ms
  ttfb: { good: 800, poor: 1800 }, // ms
} as const

export type MetricKey = keyof typeof THRESHOLDS

export function gradeMetric(metric: MetricKey, value: number): Grade {
  const t = THRESHOLDS[metric]
  if (value <= t.good) return "good"
  if (value <= t.poor) return "needs-improvement"
  return "poor"
}

export function gradeScore(score: number): Grade {
  if (score >= 90) return "good"
  if (score >= 50) return "needs-improvement"
  return "poor"
}

export function formatMetricValue(metric: string, value: number): string {
  if (metric === "cls") return value.toFixed(3)
  if (["lcp", "fcp", "ttfb", "inp", "tbt"].includes(metric)) {
    return value >= 1000
      ? `${(value / 1000).toFixed(1)}s`
      : `${Math.round(value)}ms`
  }
  return String(value)
}

export const GRADE_STYLES: Record<Grade, { badge: string; dot: string; text: string }> = {
  good: {
    badge: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
    text: "text-green-700",
  },
  "needs-improvement": {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    text: "text-amber-700",
  },
  poor: {
    badge: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
    text: "text-red-700",
  },
}

export const GRADE_LABELS: Record<Grade, string> = {
  good: "Bom",
  "needs-improvement": "Atenção",
  poor: "Ruim",
}

// Stroke color for the score gauge SVG
export function scoreGaugeColor(score: number): string {
  if (score >= 90) return "#16a34a" // green-600
  if (score >= 50) return "#d97706" // amber-600
  return "#dc2626" // red-600
}
