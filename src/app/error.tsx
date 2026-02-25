"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to error tracking in production (e.g. Sentry)
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Algo deu errado</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          Ocorreu um erro inesperado. Se o problema persistir, entre em contato
          com o suporte.
        </p>
        {error.digest && (
          <p className="text-muted-foreground font-mono text-xs">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset} variant="outline">
        Tentar novamente
      </Button>
    </div>
  )
}
