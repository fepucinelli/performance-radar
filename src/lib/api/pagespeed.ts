/**
 * PageSpeed Insights API client.
 *
 * One call returns both Lighthouse lab data AND CrUX field data.
 * Free quota: 25,000 req/day with API key, 400/day without.
 * Docs: https://developers.google.com/speed/docs/insights/v5/reference/pagespeedapi/runpagespeed
 */
import { env } from "@/env"
import type { PSIAuditData, LighthouseResult } from "@/types"

const PSI_ENDPOINT =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"

export type PSIStrategy = "mobile" | "desktop"

export class PSIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = "PSIError"
  }
}

export async function runPSIAudit(
  url: string,
  strategy: PSIStrategy
): Promise<PSIAuditData> {
  const params = new URLSearchParams({
    url,
    strategy,
    category: "performance",
    // Include SEO + accessibility now — free, useful for Phase 4
    ...(env.GOOGLE_API_KEY ? { key: env.GOOGLE_API_KEY } : {}),
  })

  const res = await fetch(`${PSI_ENDPOINT}?${params}`, {
    // Never serve a cached PSI response — every run must be fresh
    cache: "no-store",
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message =
      (body as { error?: { message?: string } }).error?.message ??
      `PSI API error ${res.status}`
    throw new PSIError(message, res.status)
  }

  const data = (await res.json()) as {
    lighthouseResult: LighthouseResult
    loadingExperience?: {
      metrics?: {
        LARGEST_CONTENTFUL_PAINT_MS?: { percentiles?: { p75?: number } }
        CUMULATIVE_LAYOUT_SHIFT_SCORE?: { percentiles?: { p75?: number } }
        INTERACTION_TO_NEXT_PAINT?: { percentiles?: { p75?: number } }
        FIRST_CONTENTFUL_PAINT_MS?: { percentiles?: { p75?: number } }
      }
    }
  }

  const lhr = data.lighthouseResult
  const field = data.loadingExperience

  return {
    perfScore: Math.round((lhr.categories.performance.score ?? 0) * 100),
    lcp: getNumericValue(lhr, "largest-contentful-paint"),
    cls: getNumericValue(lhr, "cumulative-layout-shift"),
    inp: getNumericValue(lhr, "interaction-to-next-paint"),
    fcp: getNumericValue(lhr, "first-contentful-paint"),
    ttfb: getNumericValue(lhr, "server-response-time"),
    tbt: getNumericValue(lhr, "total-blocking-time"),
    speedIndex: getNumericValue(lhr, "speed-index"),
    // CrUX field data — null when origin has insufficient traffic
    cruxLcp:
      field?.metrics?.LARGEST_CONTENTFUL_PAINT_MS?.percentiles?.p75 ?? null,
    cruxCls:
      field?.metrics?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentiles?.p75 ?? null,
    cruxInp:
      field?.metrics?.INTERACTION_TO_NEXT_PAINT?.percentiles?.p75 ?? null,
    cruxFcp:
      field?.metrics?.FIRST_CONTENTFUL_PAINT_MS?.percentiles?.p75 ?? null,
    lighthouseRaw: lhr,
    psiApiVersion: lhr.lighthouseVersion,
  }
}

function getNumericValue(lhr: LighthouseResult, auditId: string): number | null {
  return (lhr.audits[auditId]?.numericValue as number | undefined) ?? null
}
