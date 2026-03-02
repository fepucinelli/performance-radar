import type { Metadata } from "next"
import Image from "next/image"

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
        <Image src="/favicon.png" alt="Performance Hero" width={28} height={28} className="rounded-lg" />
        <span className="text-primary text-xl font-semibold tracking-tight">
          Performance Hero
        </span>
      </div>
      {children}
    </div>
  )
}
