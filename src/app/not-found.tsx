import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest">
          404
        </p>
        <h1 className="text-2xl font-semibold">Página não encontrada</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          A página que você está procurando não existe ou foi movida.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">Ir para o início</Link>
      </Button>
    </div>
  )
}
