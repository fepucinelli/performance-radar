import { cn } from "@/lib/utils"
import { getActionPlan } from "@/lib/utils/explanations"
import type { ActionItem } from "@/lib/utils/explanations"
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react"

interface ActionPlanProps {
  lighthouseRaw: unknown
}

const IMPACT_CONFIG = {
  high: {
    icon: AlertTriangle,
    label: "Alto impacto",
    iconClass: "text-red-500",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
  medium: {
    icon: AlertCircle,
    label: "Médio impacto",
    iconClass: "text-amber-500",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  low: {
    icon: Info,
    label: "Baixo impacto",
    iconClass: "text-blue-500",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
}

export function ActionPlan({ lighthouseRaw }: ActionPlanProps) {
  const items = getActionPlan(lighthouseRaw)

  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-green-50 p-4">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
        <div>
          <p className="font-medium text-green-800">Nenhum problema crítico encontrado</p>
          <p className="text-sm text-green-700">
            Esta página passou em todas as auditorias de performance. Ótimo trabalho!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <ActionItem key={item.auditId} item={item} index={i + 1} />
      ))}
    </div>
  )
}

function ActionItem({ item, index }: { item: ActionItem; index: number }) {
  const config = IMPACT_CONFIG[item.impact]
  const Icon = config.icon

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {/* Number */}
        <div className="bg-muted text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          {index}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {/* Title + impact badge */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-medium leading-snug">{item.title}</p>
            <span
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                config.badgeClass
              )}
            >
              <Icon className={cn("h-3 w-3", config.iconClass)} />
              {config.label}
            </span>
          </div>

          {/* Fix guidance */}
          <p className="text-muted-foreground text-sm leading-relaxed">
            {item.fix}
          </p>

          {/* Savings estimate if available */}
          {item.savings && (
            <p className="text-xs font-medium text-green-700">
              Economia potencial: {item.savings}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
