/**
 * Lightweight date formatting — avoids importing heavy date libraries.
 * Add date-fns in Phase 2 when charts need more sophisticated formatting.
 */

export function formatDistanceToNow(date: Date | string | null): string {
  if (!date) return "Never"
  const d = typeof date === "string" ? new Date(date) : date
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)

  if (seconds < 60) return "Just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`
  return d.toLocaleDateString()
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
