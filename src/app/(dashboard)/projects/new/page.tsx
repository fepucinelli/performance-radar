export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { NewProjectForm } from "./new-project-form"

export const metadata: Metadata = {
  title: "Adicionar projeto",
}

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <NewProjectForm />
    </div>
  )
}
