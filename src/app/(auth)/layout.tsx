import type { Metadata } from "next"
import { Zap } from "lucide-react"

export const metadata: Metadata = {
  title: "Entrar",
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-muted/40 flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-2">
        <span className="text-primary text-xl font-semibold tracking-tight">
          <Zap className="h-5 w-5 text-amber-500" />
          PerfAlly
        </span>
      </div>
      {children}
    </div>
  )
}
