/**
 * Resource diagnostics grid — extracts byte weights and timing breakdowns
 * from the stored Lighthouse JSON and renders them in a compact card grid.
 *
 * All data comes from audits already present in `lighthouseRaw`:
 *   resource-summary, third-party-summary, unused-javascript,
 *   dom-size, total-blocking-time, bootup-time, mainthread-work-breakdown
 *
 * Thresholds are based on Lighthouse scoring curves and web.dev budgets.
 */
import type { LighthouseResult } from "@/types"

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(2)} MB`
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(2)} KB`
  return `${bytes} B`
}

function formatMs(ms: number): string {
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)} s`
  return `${Math.round(ms)} ms`
}

// ─── Grading ──────────────────────────────────────────────────────────────────

type Grade = "good" | "needs-improvement" | "poor"

/** Returns grade given a value and two ascending thresholds (good ≤ g, ni ≤ n, else poor). */
function grade(value: number, good: number, ni: number): Grade {
  if (value <= good) return "good"
  if (value <= ni) return "needs-improvement"
  return "poor"
}

// Thresholds per metric — all byte sizes in bytes, timings in ms, nodes for DOM.
// Sources: Lighthouse audit scoring, web.dev performance budgets.
const THRESHOLDS = {
  //                                    good        needs-improvement
  totalPageWeight:   { good: 1_638_400, ni: 4_096_000 }, // 1.6 MB / 4 MB
  thirdPartyWeight:  { good:   153_600, ni:   512_000 }, // 150 KB / 500 KB
  scriptWeight:      { good:   307_200, ni:   768_000 }, // 300 KB / 750 KB
  imageWeight:       { good:   512_000, ni: 1_536_000 }, // 500 KB / 1.5 MB
  cssWeight:         { good:   102_400, ni:   256_000 }, // 100 KB / 250 KB
  fontWeight:        { good:   102_400, ni:   307_200 }, // 100 KB / 300 KB
  unusedJavascript:  { good:    20_480, ni:   102_400 }, //  20 KB / 100 KB
  domSize:           { good:       800, ni:     1_400 }, // 800 / 1 400 nodes
  tbt:               { good:       200, ni:       600 }, // 200 ms / 600 ms
  bootupTime:        { good:     2_000, ni:     3_500 }, //   2 s  / 3.5 s
  mainThreadWork:    { good:     2_000, ni:     4_000 }, //   2 s  /   4 s
} satisfies Record<string, { good: number; ni: number }>

const GRADE_STYLES: Record<Grade, string> = {
  good:               "bg-green-500",
  "needs-improvement": "bg-yellow-400",
  poor:               "bg-red-500",
}

const GRADE_TITLES: Record<Grade, string> = {
  good:               "Dentro do orçamento recomendado",
  "needs-improvement": "Atenção — próximo do limite recomendado",
  poor:               "Fora do orçamento recomendado",
}

// ─── Data extraction ──────────────────────────────────────────────────────────

interface ResourceItem {
  resourceType: string
  transferSize?: number
}

interface ThirdPartyItem {
  transferSize?: number
}

function extract(lighthouseRaw: unknown) {
  const lhr = lighthouseRaw as LighthouseResult | null
  if (!lhr?.audits) return null
  const a = lhr.audits

  const resSummary = a["resource-summary"]?.details as
    | { items?: ResourceItem[] }
    | undefined
  const resources = resSummary?.items ?? []
  const res = (type: string) =>
    resources.find((r) => r.resourceType === type)?.transferSize ?? null

  const tpDetails = a["third-party-summary"]?.details as
    | { items?: ThirdPartyItem[] }
    | undefined
  const thirdPartyWeight =
    tpDetails?.items && tpDetails.items.length > 0
      ? tpDetails.items.reduce((sum, i) => sum + (i.transferSize ?? 0), 0)
      : null

  return {
    totalPageWeight:  res("total"),
    thirdPartyWeight,
    scriptWeight:     res("script"),
    imageWeight:      res("image"),
    cssWeight:        res("stylesheet"),
    fontWeight:       res("font"),
    unusedJavascript: a["unused-javascript"]?.numericValue ?? null,
    domSize:          a["dom-size"]?.numericValue ?? null,
    tbt:              a["total-blocking-time"]?.numericValue ?? null,
    bootupTime:       a["bootup-time"]?.numericValue ?? null,
    mainThreadWork:   a["mainthread-work-breakdown"]?.numericValue ?? null,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Metric {
  label: string
  value: string | null
  grade: Grade | null
}

export function DiagnosticsGrid({ lighthouseRaw }: { lighthouseRaw: unknown }) {
  const data = extract(lighthouseRaw)
  if (!data) return null

  const t = THRESHOLDS

  const metrics: Metric[] = [
    {
      label: "Peso Total da Página",
      value: data.totalPageWeight !== null ? formatBytes(data.totalPageWeight) : null,
      grade: data.totalPageWeight !== null ? grade(data.totalPageWeight, t.totalPageWeight.good, t.totalPageWeight.ni) : null,
    },
    {
      label: "Peso de Terceiros",
      value: data.thirdPartyWeight !== null ? formatBytes(data.thirdPartyWeight) : null,
      grade: data.thirdPartyWeight !== null ? grade(data.thirdPartyWeight, t.thirdPartyWeight.good, t.thirdPartyWeight.ni) : null,
    },
    {
      label: "Peso de Scripts",
      value: data.scriptWeight !== null ? formatBytes(data.scriptWeight) : null,
      grade: data.scriptWeight !== null ? grade(data.scriptWeight, t.scriptWeight.good, t.scriptWeight.ni) : null,
    },
    {
      label: "Peso de Imagens",
      value: data.imageWeight !== null ? formatBytes(data.imageWeight) : null,
      grade: data.imageWeight !== null ? grade(data.imageWeight, t.imageWeight.good, t.imageWeight.ni) : null,
    },
    {
      label: "Peso de CSS",
      value: data.cssWeight !== null ? formatBytes(data.cssWeight) : null,
      grade: data.cssWeight !== null ? grade(data.cssWeight, t.cssWeight.good, t.cssWeight.ni) : null,
    },
    {
      label: "Peso de Fontes",
      value: data.fontWeight !== null ? formatBytes(data.fontWeight) : null,
      grade: data.fontWeight !== null ? grade(data.fontWeight, t.fontWeight.good, t.fontWeight.ni) : null,
    },
    {
      label: "JavaScript Não Utilizado",
      value: data.unusedJavascript !== null ? formatBytes(data.unusedJavascript) : null,
      grade: data.unusedJavascript !== null ? grade(data.unusedJavascript, t.unusedJavascript.good, t.unusedJavascript.ni) : null,
    },
    {
      label: "Tamanho do DOM",
      value: data.domSize !== null ? `${Math.round(data.domSize)} nós` : null,
      grade: data.domSize !== null ? grade(data.domSize, t.domSize.good, t.domSize.ni) : null,
    },
    {
      label: "Tempo de Bloqueio Total",
      value: data.tbt !== null ? formatMs(data.tbt) : null,
      grade: data.tbt !== null ? grade(data.tbt, t.tbt.good, t.tbt.ni) : null,
    },
    {
      label: "Tempo de Inicialização",
      value: data.bootupTime !== null ? formatMs(data.bootupTime) : null,
      grade: data.bootupTime !== null ? grade(data.bootupTime, t.bootupTime.good, t.bootupTime.ni) : null,
    },
    {
      label: "Trabalho na Thread Principal",
      value: data.mainThreadWork !== null ? formatMs(data.mainThreadWork) : null,
      grade: data.mainThreadWork !== null ? grade(data.mainThreadWork, t.mainThreadWork.good, t.mainThreadWork.ni) : null,
    },
  ]

  const available = metrics.filter((m) => m.value !== null)
  if (available.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {available.map((metric) => (
        <div key={metric.label} className="rounded-lg border bg-card px-4 py-3">
          <div className="mb-1.5 flex items-start justify-between gap-2">
            <p className="text-xs text-muted-foreground leading-tight">
              {metric.label}
            </p>
            {metric.grade && (
              <span
                title={GRADE_TITLES[metric.grade]}
                className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${GRADE_STYLES[metric.grade]}`}
              />
            )}
          </div>
          <p className="text-lg font-semibold tabular-nums">{metric.value}</p>
        </div>
      ))}
    </div>
  )
}
