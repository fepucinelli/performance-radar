"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { updateAlertThresholdsAction } from "@/app/actions/alerts"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface Props {
  projectId: string
  initialLcp: number | null
  initialCls: number | null
  initialInp: number | null
  hasEmailAlerts: boolean // plan-gated
}

export function AlertThresholds({
  projectId,
  initialLcp,
  initialCls,
  initialInp,
  hasEmailAlerts,
}: Props) {
  const [lcp, setLcp] = useState(initialLcp != null ? String(initialLcp) : "")
  const [cls, setCls] = useState(initialCls != null ? String(initialCls) : "")
  const [inp, setInp] = useState(initialInp != null ? String(initialInp) : "")
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await updateAlertThresholdsAction(projectId, {
        alertLcp: lcp ? parseFloat(lcp) : null,
        alertCls: cls ? parseFloat(cls) : null,
        alertInp: inp ? parseFloat(inp) : null,
      })
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Limites de alerta salvos")
      }
    })
  }

  if (!hasEmailAlerts) {
    return (
      <p className="text-sm text-muted-foreground">
        Alertas por e-mail estão disponíveis no plano Starter ou superior.{" "}
        <a href="/settings" className="underline underline-offset-2">
          Fazer upgrade
        </a>
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Receba um e-mail quando uma métrica ultrapassar o limite configurado.
        Deixe em branco para desativar esse alerta.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="alert-lcp" className="text-xs">
            Limite de LCP (ms)
          </Label>
          <Input
            id="alert-lcp"
            type="number"
            placeholder="e.g. 2500"
            value={lcp}
            onChange={(e) => setLcp(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="alert-inp" className="text-xs">
            Limite de INP (ms)
          </Label>
          <Input
            id="alert-inp"
            type="number"
            placeholder="e.g. 200"
            value={inp}
            onChange={(e) => setInp(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="alert-cls" className="text-xs">
            Limite de CLS
          </Label>
          <Input
            id="alert-cls"
            type="number"
            step="0.01"
            placeholder="e.g. 0.1"
            value={cls}
            onChange={(e) => setCls(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <Button size="sm" onClick={handleSave} disabled={isPending}>
        {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        Salvar limites
      </Button>
    </div>
  )
}
