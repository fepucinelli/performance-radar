"use server"

import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { db, projects, users, auditResults } from "@/lib/db"
import { eq, and, count, gte } from "drizzle-orm"
import { validateAuditUrl } from "@/lib/utils/validate-url"
import { PLAN_LIMITS } from "@/lib/utils/plan-limits"
import { z } from "zod"

// Shape returned by createProjectAction (compatible with useActionState)
export type CreateProjectState = {
  error?: string
  limitReached?: boolean
} | null

const createProjectSchema = z.object({
  url: z.string().min(1),
  name: z.string().optional(),
  strategy: z.enum(["mobile", "desktop"]).default("mobile"),
})

export async function createProjectAction(
  _prevState: CreateProjectState,
  formData: FormData
): Promise<CreateProjectState> {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const raw = {
    url: formData.get("url") as string,
    name: (formData.get("name") as string) || undefined,
    strategy: (formData.get("strategy") as string) || "mobile",
  }

  const parsed = createProjectSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: "Invalid form data" }
  }

  // Validate URL
  const validation = validateAuditUrl(parsed.data.url)
  if (!validation.valid) {
    return { error: validation.error }
  }

  const url = validation.normalized!

  // Upsert user row — Clerk webhook may not be wired yet in dev
  const clerkUser = await currentUser()
  if (clerkUser) {
    await db
      .insert(users)
      .values({
        id: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        name: clerkUser.fullName ?? null,
      })
      .onConflictDoNothing()
  }

  // Enforce plan limits
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })
  const plan = (user?.plan ?? "free") as keyof typeof PLAN_LIMITS
  const limits = PLAN_LIMITS[plan]

  const countResult = await db
    .select({ value: count() })
    .from(projects)
    .where(eq(projects.userId, userId))

  const projectCount = countResult[0]?.value ?? 0

  if (projectCount >= limits.maxProjects) {
    return {
      error: `Your ${plan} plan allows ${limits.maxProjects} project${limits.maxProjects === 1 ? "" : "s"}. Upgrade to add more.`,
      limitReached: true,
    }
  }

  // Auto-generate name from hostname if not provided
  const hostname = new URL(url).hostname.replace(/^www\./, "")
  const name = parsed.data.name?.trim() || hostname

  const inserted = await db
    .insert(projects)
    .values({
      userId,
      url,
      name,
      strategy: parsed.data.strategy as "mobile" | "desktop",
    })
    .returning({ id: projects.id })

  const projectId = inserted[0]?.id
  if (!projectId) {
    return { error: "Failed to create project. Please try again." }
  }

  redirect(`/projects/${projectId}`)
}

export async function deleteProjectAction(projectId: string): Promise<void> {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))

  redirect("/dashboard")
}

// Returns current month run count for the authenticated user
export async function getMonthlyRunCount(userId: string): Promise<number> {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const result = await db
    .select({ value: count() })
    .from(auditResults)
    .innerJoin(projects, eq(auditResults.projectId, projects.id))
    .where(
      and(eq(projects.userId, userId), gte(auditResults.createdAt, monthStart))
    )

  return result[0]?.value ?? 0
}
