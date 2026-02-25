/**
 * Clerk webhook endpoint.
 *
 * Syncs Clerk user events to our database.
 * Set up in Clerk Dashboard → Webhooks → Add Endpoint:
 *   URL: https://your-domain.com/api/webhooks/clerk
 *   Events: user.created, user.updated, user.deleted
 */
import { headers } from "next/headers"
import { Webhook } from "svix"
import { db, users } from "@/lib/db"
import { eq } from "drizzle-orm"
import { env } from "@/env"

// Clerk webhook event types (minimal — extend as needed)
interface ClerkUserEvent {
  type: "user.created" | "user.updated" | "user.deleted"
  data: {
    id: string
    email_addresses: Array<{ email_address: string }>
    first_name: string | null
    last_name: string | null
    deleted?: boolean
  }
}

export async function POST(req: Request) {
  const webhookSecret = env.CLERK_WEBHOOK_SECRET
  if (!webhookSecret) {
    return new Response("Webhook secret not configured", { status: 500 })
  }

  // Get the raw body and svix headers for signature verification
  const payload = await req.text()
  const headerList = await headers()

  const svixHeaders = {
    "svix-id": headerList.get("svix-id") ?? "",
    "svix-timestamp": headerList.get("svix-timestamp") ?? "",
    "svix-signature": headerList.get("svix-signature") ?? "",
  }

  // Verify the webhook signature
  let event: ClerkUserEvent
  try {
    const wh = new Webhook(webhookSecret)
    event = wh.verify(payload, svixHeaders) as ClerkUserEvent
  } catch (err) {
    console.error("Clerk webhook verification failed:", err)
    return new Response("Invalid signature", { status: 400 })
  }

  try {
    if (event.type === "user.created") {
      const { id, email_addresses, first_name, last_name } = event.data
      const email = email_addresses[0]?.email_address

      if (!email) {
        return new Response("No email address on user", { status: 400 })
      }

      const name = [first_name, last_name].filter(Boolean).join(" ") || null

      await db.insert(users).values({ id, email, name }).onConflictDoNothing()

      console.log(`[clerk-webhook] Created user ${id}`)
    }

    if (event.type === "user.updated") {
      const { id, email_addresses, first_name, last_name } = event.data
      const email = email_addresses[0]?.email_address
      const name = [first_name, last_name].filter(Boolean).join(" ") || null

      if (email) {
        await db
          .update(users)
          .set({ email, name, updatedAt: new Date() })
          .where(eq(users.id, id))
      }

      console.log(`[clerk-webhook] Updated user ${id}`)
    }

    if (event.type === "user.deleted") {
      const { id } = event.data
      // Cascade deletes will clean up projects, audits, etc.
      await db.delete(users).where(eq(users.id, id))
      console.log(`[clerk-webhook] Deleted user ${id}`)
    }

    return new Response("OK", { status: 200 })
  } catch (err) {
    console.error("[clerk-webhook] Database error:", err)
    return new Response("Internal server error", { status: 500 })
  }
}
