"use client"

import { useState, useTransition } from "react"
import { useUser } from "@clerk/nextjs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { Plan } from "@/lib/db/schema"

const PLAN_LABELS: Record<Plan, string> = {
  free: "Grátis",
  starter: "Freelancer",
  pro: "Studio",
  agency: "Agência",
}

interface ProfileSectionProps {
  plan: Plan
  planExpiresAt: Date | null
}

export function ProfileSection({ plan, planExpiresAt }: ProfileSectionProps) {
  const { user, isLoaded } = useUser()
  const [firstName, setFirstName] = useState(user?.firstName ?? "")
  const [lastName, setLastName] = useState(user?.lastName ?? "")
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Sync state once Clerk loads (handles SSR hydration)
  if (isLoaded && firstName === "" && lastName === "" && user?.firstName) {
    setFirstName(user.firstName)
    setLastName(user.lastName ?? "")
  }

  function handleSave() {
    if (!user) return
    setMessage(null)
    startTransition(async () => {
      try {
        await user.update({ firstName: firstName.trim(), lastName: lastName.trim() })
        setMessage("Perfil atualizado!")
      } catch {
        setMessage("Erro ao salvar. Tente novamente.")
      }
    })
  }

  const email = user?.emailAddresses[0]?.emailAddress ?? "—"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Conta</CardTitle>
        <CardDescription>Detalhes e informações do seu perfil.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Email — read-only */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">E-mail</span>
          <span className="text-muted-foreground">{email}</span>
        </div>

        <Separator />

        {/* Editable name */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="first-name" className="text-xs">Primeiro nome</Label>
            <Input
              id="first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Seu nome"
              disabled={!isLoaded || isPending}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last-name" className="text-xs">Sobrenome</Label>
            <Input
              id="last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Sobrenome"
              disabled={!isLoaded || isPending}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isLoaded || isPending}
          >
            {isPending ? "Salvando..." : "Salvar nome"}
          </Button>
          {message && (
            <span
              className={
                message === "Perfil atualizado!"
                  ? "text-xs text-green-600"
                  : "text-xs text-red-500"
              }
            >
              {message}
            </span>
          )}
        </div>

        <Separator />

        {/* Plan */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Plano atual</span>
          <Badge variant={plan === "free" ? "secondary" : "default"}>
            {PLAN_LABELS[plan]}
          </Badge>
        </div>
        {planExpiresAt && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Acesso até</span>
            <span className="text-muted-foreground">
              {new Date(planExpiresAt).toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
