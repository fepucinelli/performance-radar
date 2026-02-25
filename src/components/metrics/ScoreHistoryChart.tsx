"use client"

import { useState } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts"
import { THRESHOLDS } from "@/lib/utils/metrics"

interface DataPoint {
  createdAt: Date
  perfScore: number | null
  lcp: number | null
  cls: number | null
  inp: number | null
}

interface Props {
  data: DataPoint[]
}

type Tab = "score" | "lcp" | "cls" | "inp"

const TABS: { key: Tab; label: string }[] = [
  { key: "score", label: "Pontuação" },
  { key: "lcp", label: "LCP" },
  { key: "cls", label: "CLS" },
  { key: "inp", label: "INP" },
]

// Reference lines (good / poor thresholds) per tab
const REFS: Record<
  Tab,
  { good: number; poor: number; unit: string } | null
> = {
  score: { good: 90, poor: 50, unit: "" },
  lcp: { good: THRESHOLDS.lcp.good, poor: THRESHOLDS.lcp.poor, unit: "ms" },
  cls: { good: THRESHOLDS.cls.good, poor: THRESHOLDS.cls.poor, unit: "" },
  inp: { good: THRESHOLDS.inp.good, poor: THRESHOLDS.inp.poor, unit: "ms" },
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatValue(tab: Tab, value: number) {
  if (tab === "score") return `${value}`
  if (tab === "cls") return value.toFixed(3)
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`
}

// Determine line color based on tab and the last value
function lineColor(tab: Tab, data: DataPoint[]): string {
  const last = data[data.length - 1]
  if (!last) return "#6b7280"

  if (tab === "score") {
    const score = last.perfScore ?? 0
    if (score >= 90) return "#16a34a"
    if (score >= 50) return "#d97706"
    return "#dc2626"
  }

  const refs = REFS[tab]
  if (!refs) return "#6b7280"

  const value = last[tab] ?? 0
  // For score-like metrics: lower value is better for LCP/INP/CLS
  if (value <= refs.good) return "#16a34a"
  if (value <= refs.poor) return "#d97706"
  return "#dc2626"
}

export function ScoreHistoryChart({ data }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("score")

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed bg-muted/30 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          Execute ao menos 2 auditorias para ver a evolução da performance.
        </p>
      </div>
    )
  }

  const chartData = data.map((d) => ({
    date: formatDate(d.createdAt),
    value: activeTab === "score" ? (d.perfScore ?? null) : d[activeTab],
  }))

  const refs = REFS[activeTab]
  const color = lineColor(activeTab, data)

  const tooltipFormatter = (value: number | undefined) => [
    value != null ? formatValue(activeTab, value) : "—",
    activeTab === "score" ? "Pontuação" : activeTab.toUpperCase(),
  ]

  return (
    <div className="space-y-3">
      {/* Tab switcher */}
      <div className="flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              activeTab === tab.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={36}
            tickFormatter={(v) => (activeTab === "score" ? String(v) : v >= 1000 ? `${(v / 1000).toFixed(0)}s` : `${v}`)}
          />
          <Tooltip
            formatter={tooltipFormatter}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--background))",
            }}
          />

          {/* Reference lines at thresholds */}
          {refs && (
            <>
              <ReferenceLine
                y={refs.good}
                stroke="#16a34a"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
              <ReferenceLine
                y={refs.poor}
                stroke="#dc2626"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
            </>
          )}

          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
