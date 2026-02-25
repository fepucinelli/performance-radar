"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2, AlertCircle } from "lucide-react"
import { createProjectAction, type CreateProjectState } from "@/app/actions/projects"

export function NewProjectForm() {
  const [state, action, pending] = useActionState<CreateProjectState, FormData>(
    createProjectAction,
    null
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adicionar um projeto</CardTitle>
        <CardDescription>
          Insira a URL que você quer monitorar. Vamos executar uma auditoria
          Lighthouse usando a API PageSpeed Insights do Google.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {/* Error message */}
          {state?.error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {state.error}
              {state.limitReached && (
                <a href="/pricing" className="ml-1 underline">
                  View plans →
                </a>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="url">URL do site</Label>
            <Input
              id="url"
              name="url"
              type="text"
              inputMode="url"
              placeholder="https://seusite.com.br"
              required
              autoFocus
              disabled={pending}
            />
            <p className="text-muted-foreground text-xs">
              Qualquer URL pública — adicionamos https:// automaticamente se necessário
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">
              Nome do projeto{" "}
              <span className="text-muted-foreground font-normal">
                (opcional)
              </span>
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Meu site"
              disabled={pending}
            />
            <p className="text-muted-foreground text-xs">
              Preenchido automaticamente pelo domínio se deixado em branco
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Estratégia</Label>
            <div className="flex gap-2">
              {[
                { value: "mobile", label: "📱 Mobile" },
                { value: "desktop", label: "🖥️ Desktop" },
              ].map(({ value, label }) => (
                <label
                  key={value}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors has-[:checked]:border-black has-[:checked]:bg-black has-[:checked]:text-white"
                >
                  <input
                    type="radio"
                    name="strategy"
                    value={value}
                    defaultChecked={value === "mobile"}
                    className="sr-only"
                    disabled={pending}
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              Mobile recomendado — o Google rankeia com base nas pontuações mobile
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando projeto…
              </>
            ) : (
              "Adicionar projeto →"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
