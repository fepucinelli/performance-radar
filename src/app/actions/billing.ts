"use server"

import { auth } from "@clerk/nextjs/server"
import { db, users } from "@/lib/db"
import { eq } from "drizzle-orm"
import { stripe } from "@/lib/stripe"
import { env } from "@/env"

const APP_URL = env.NEXT_PUBLIC_APP_URL

// Price ID → plan name mapping (unused externally — kept for future use)
const PRICE_TO_PLAN: Record<string, "starter" | "pro" | "agency"> = {}
if (env.STRIPE_STARTER_PRICE_ID) PRICE_TO_PLAN[env.STRIPE_STARTER_PRICE_ID] = "starter"
if (env.STRIPE_PRO_PRICE_ID) PRICE_TO_PLAN[env.STRIPE_PRO_PRICE_ID] = "pro"
if (env.STRIPE_AGENCY_PRICE_ID) PRICE_TO_PLAN[env.STRIPE_AGENCY_PRICE_ID] = "agency"

export type PlanKey = "starter" | "pro" | "agency"

/** Start a Stripe Checkout session for a given plan. Returns the session URL. */
export async function createCheckoutSession(plan: PlanKey): Promise<{ url: string } | { error: string }> {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthorized" }

  const priceId =
    plan === "starter"
      ? env.STRIPE_STARTER_PRICE_ID
      : plan === "pro"
        ? env.STRIPE_PRO_PRICE_ID
        : env.STRIPE_AGENCY_PRICE_ID

  if (!priceId) return { error: "Stripe price not configured" }
  if (!env.STRIPE_SECRET_KEY) return { error: "Stripe not configured" }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true, stripeCustomerId: true },
  })
  if (!dbUser) return { error: "User not found" }

  // Re-use an existing Stripe customer or let Checkout create one
  const customer = dbUser.stripeCustomerId ?? undefined

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    currency: "brl",
    customer,
    customer_email: customer ? undefined : dbUser.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/settings?upgrade=success`,
    cancel_url: `${APP_URL}/settings?upgrade=cancelled`,
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
    },
  })

  if (!session.url) return { error: "Failed to create checkout session" }
  return { url: session.url }
}

/** Open the Stripe Customer Portal so users can manage/cancel their subscription. */
export async function createBillingPortalSession(): Promise<{ url: string } | { error: string }> {
  const { userId } = await auth()
  if (!userId) return { error: "Unauthorized" }

  if (!env.STRIPE_SECRET_KEY) return { error: "Stripe not configured" }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { stripeCustomerId: true },
  })

  if (!dbUser?.stripeCustomerId) {
    return { error: "No billing account found" }
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: dbUser.stripeCustomerId,
    return_url: `${APP_URL}/settings`,
  })

  return { url: session.url }
}

