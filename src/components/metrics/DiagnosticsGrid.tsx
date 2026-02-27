/**
 * Resource diagnostics grid — extracts byte weights and timing breakdowns
 * from the stored Lighthouse JSON and renders them in a compact card grid.
 *
 * All data comes from audits already present in `lighthouseRaw`:
 *   resource-summary, third-party-summary, unused-javascript,
 *   dom-size, total-blocking-time, bootup-time, mainthread-work-breakdown
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

  // resource-summary items keyed by resourceType
  const resSummary = a["resource-summary"]?.details as
    | { items?: ResourceItem[] }
    | undefined
  const resources = resSummary?.items ?? []
  const res = (type: string) =>
    resources.find((r) => r.resourceType === type)?.transferSize ?? null

  // third-party-summary: sum all items' transferSize
  const tpDetails = a["third-party-summary"]?.details as
    | { items?: ThirdPartyItem[] }
    | undefined
  const thirdPartyWeight =
    tpDetails?.items && tpDetails.items.length > 0
      ? tpDetails.items.reduce((sum, i) => sum + (i.transferSize ?? 0), 0)
      : null

  return {
    totalPageWeight: res("total"),
    thirdPartyWeight,
    scriptWeight: res("script"),
    imageWeight: res("image"),
    cssWeight: res("stylesheet"),
    fontWeight: res("font"),
    unusedJavascript: a["unused-javascript"]?.numericValue ?? null,
    domSize: a["dom-size"]?.numericValue ?? null,
    tbt: a["total-blocking-time"]?.numericValue ?? null,
    bootupTime: a["bootup-time"]?.numericValue ?? null,
    mainThreadWork: a["mainthread-work-breakdown"]?.numericValue ?? null,
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Metric {
  label: string
  value: string | null
}

export function DiagnosticsGrid({ lighthouseRaw }: { lighthouseRaw: unknown }) {
  const data = extract(lighthouseRaw)
  if (!data) return null

  const metrics: Metric[] = [
    {
      label: "Peso Total da Página",
      value: data.totalPageWeight !== null ? formatBytes(data.totalPageWeight) : null,
    },
    {
      label: "Peso de Terceiros",
      value: data.thirdPartyWeight !== null ? formatBytes(data.thirdPartyWeight) : null,
    },
    {
      label: "Peso de Scripts",
      value: data.scriptWeight !== null ? formatBytes(data.scriptWeight) : null,
    },
    {
      label: "Peso de Imagens",
      value: data.imageWeight !== null ? formatBytes(data.imageWeight) : null,
    },
    {
      label: "Peso de CSS",
      value: data.cssWeight !== null ? formatBytes(data.cssWeight) : null,
    },
    {
      label: "Peso de Fontes",
      value: data.fontWeight !== null ? formatBytes(data.fontWeight) : null,
    },
    {
      label: "JavaScript Não Utilizado",
      value: data.unusedJavascript !== null ? formatBytes(data.unusedJavascript) : null,
    },
    {
      label: "Tamanho do DOM",
      value: data.domSize !== null ? `${Math.round(data.domSize)} nós` : null,
    },
    {
      label: "Tempo de Bloqueio Total",
      value: data.tbt !== null ? formatMs(data.tbt) : null,
    },
    {
      label: "Tempo de Inicialização",
      value: data.bootupTime !== null ? formatMs(data.bootupTime) : null,
    },
    {
      label: "Trabalho na Thread Principal",
      value: data.mainThreadWork !== null ? formatMs(data.mainThreadWork) : null,
    },
  ]

  const available = metrics.filter((m) => m.value !== null)
  if (available.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {available.map((metric) => (
        <div
          key={metric.label}
          className="rounded-lg border bg-card px-4 py-3"
        >
          <p className="mb-1.5 text-xs text-muted-foreground leading-tight">
            {metric.label}
          </p>
          <p className="text-lg font-semibold tabular-nums">{metric.value}</p>
        </div>
      ))}
    </div>
  )
}
