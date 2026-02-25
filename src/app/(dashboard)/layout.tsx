import { Sidebar } from "@/components/layout/sidebar"
import { UserMenu } from "@/components/layout/user-menu"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="border-border/40 flex h-14 shrink-0 items-center justify-end border-b bg-white px-4">
          <UserMenu />
        </header>

        {/* Page content */}
        <main className="bg-muted/30 flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
