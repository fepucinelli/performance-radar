/**
 * Stripe webhook endpoint.
 *
 * Handles subscription lifecycle events and keeps our DB in sync.
 * Set up in Stripe Dashboard → Webhooks → Add Endpoint:
 *   URL: https://your-domain.com/api/webhooks/stripe
 *   Events:
 *     - checkout.session.completed
 *     - customer.subscription.updated
 *     - customer.subscription.deleted
 *
 * Protected by Stripe-Signature header verification.
 */
import { stripe } from "@/lib/stripe"
import { db, users } from "@/lib/db"
import { eq } from "drizzle-orm"
import { env } from "@/env"
import type Stripe from "stripe"

export const dynamic = "force-dynamic"

// Map Stripe price IDs → plan names
function planFromPriceId(priceId: string): "starter" | "pro" | "agency" | null {
  if (priceId === env.STRIPE_STARTER_PRICE_ID) return "starter"
  if (priceId === env.STRIPE_PRO_PRICE_ID) return "pro"
  if (priceId === env.STRIPE_AGENCY_PRICE_ID) return "agency"
  return null
}

export async function POST(req: Request) {
  if (!env.STRIPE_SECRET_KEY) {
    return new Response("Stripe not configured", { status: 500 })
  }

  const webhookSecret = env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return new Response("Stripe webhook secret not configured", { status: 500 })
  }

  const payload = await req.text()
  const sig = req.headers.get("stripe-signature") ?? ""

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret)
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err)
    return new Response("Invalid signature", { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== "subscription") break

        const userId = session.metadata?.userId
        if (!userId) break

        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        // Fetch the subscription to get the price ID
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0]?.price.id ?? ""
        const plan = planFromPriceId(priceId)

        if (plan && customerId) {
          await db
            .update(users)
            .set({
              stripeCustomerId: customerId,
              plan,
              planExpiresAt: null, // active subscription, no expiry
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId))

          console.log(`[stripe-webhook] User ${userId} upgraded to ${plan}`)
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const priceId = subscription.items.data[0]?.price.id ?? ""
        const plan = planFromPriceId(priceId)

        // cancel_at is set (to the period end) when cancel_at_period_end=true
        const expiresAt =
          subscription.cancel_at_period_end && subscription.cancel_at
            ? new Date(subscription.cancel_at * 1000)
            : null

        if (subscription.status === "active" && plan) {
          await db
            .update(users)
            .set({
              plan,
              planExpiresAt: expiresAt,
              updatedAt: new Date(),
            })
            .where(eq(users.stripeCustomerId, customerId))
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Downgrade to free
        await db
          .update(users)
          .set({
            plan: "free",
            planExpiresAt: null,
            updatedAt: new Date(),
          })
          .where(eq(users.stripeCustomerId, customerId))

        console.log(`[stripe-webhook] Customer ${customerId} downgraded to free`)
        break
      }

      default:
        // Ignore unhandled events
        break
    }
  } catch (err) {
    console.error("[stripe-webhook] Handler error:", err)
    return new Response("Internal server error", { status: 500 })
  }

  return new Response("OK", { status: 200 })
}
