import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const mockEnvVars = vi.hoisted(() => ({
  STRIPE_SECRET_KEY: "sk_test" as string | undefined,
  STRIPE_WEBHOOK_SECRET: "whsec_test" as string | undefined,
  STRIPE_STARTER_PRICE_ID: "price_starter",
  STRIPE_PRO_PRICE_ID: "price_pro",
  STRIPE_AGENCY_PRICE_ID: "price_agency",
}))

const mockConstructEvent = vi.hoisted(() => vi.fn())
const mockRetrieve = vi.hoisted(() => vi.fn())
const mockWhere = vi.hoisted(() => vi.fn())
const mockSet = vi.hoisted(() => vi.fn())
const mockUpdate = vi.hoisted(() => vi.fn())

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/env", () => ({ env: mockEnvVars }))

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockRetrieve },
  },
}))

vi.mock("@/lib/db", () => ({
  db: { update: mockUpdate },
  users: { id: {}, stripeCustomerId: {} },
}))

vi.mock("drizzle-orm", () => ({
  eq: vi.fn().mockReturnValue("eq-stub"),
}))

// ─── Import SUT after mocks ───────────────────────────────────────────────────

import { POST } from "./route"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(payload = "{}", sig = "t=1,v1=abc") {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body: payload,
    headers: { "stripe-signature": sig },
  })
}

function makeEvent(type: string, object: Record<string, unknown>) {
  return { type, data: { object } }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    mockEnvVars.STRIPE_SECRET_KEY = "sk_test"
    mockEnvVars.STRIPE_WEBHOOK_SECRET = "whsec_test"
    mockWhere.mockReset().mockResolvedValue([])
    mockSet.mockReset().mockReturnValue({ where: mockWhere })
    mockUpdate.mockReset().mockReturnValue({ set: mockSet })
    mockConstructEvent.mockReset()
    mockRetrieve.mockReset()
  })

  // ─── Config guards ──────────────────────────────────────────────────────────

  it("returns 500 when STRIPE_SECRET_KEY is missing", async () => {
    mockEnvVars.STRIPE_SECRET_KEY = undefined
    const res = await POST(makeRequest())
    expect(res.status).toBe(500)
  })

  it("returns 500 when STRIPE_WEBHOOK_SECRET is missing", async () => {
    mockEnvVars.STRIPE_WEBHOOK_SECRET = undefined
    const res = await POST(makeRequest())
    expect(res.status).toBe(500)
  })

  it("returns 400 when constructEvent throws (bad signature)", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching")
    })
    const res = await POST(makeRequest())
    expect(res.status).toBe(400)
  })

  // ─── checkout.session.completed ────────────────────────────────────────────

  describe("checkout.session.completed", () => {
    it("upgrades plan and returns 200 when userId present", async () => {
      mockConstructEvent.mockReturnValue(
        makeEvent("checkout.session.completed", {
          mode: "subscription",
          metadata: { userId: "user_123" },
          customer: "cus_123",
          subscription: "sub_123",
        })
      )
      mockRetrieve.mockResolvedValue({
        items: { data: [{ price: { id: "price_starter" } }] },
      })

      const res = await POST(makeRequest())
      expect(res.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ plan: "starter", stripeCustomerId: "cus_123" })
      )
    })

    it("does not update db when no userId and returns 200", async () => {
      mockConstructEvent.mockReturnValue(
        makeEvent("checkout.session.completed", {
          mode: "subscription",
          metadata: {},
          customer: "cus_123",
          subscription: "sub_123",
        })
      )
      const res = await POST(makeRequest())
      expect(res.status).toBe(200)
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it("ignores non-subscription mode and returns 200", async () => {
      mockConstructEvent.mockReturnValue(
        makeEvent("checkout.session.completed", {
          mode: "payment",
          metadata: { userId: "user_123" },
        })
      )
      const res = await POST(makeRequest())
      expect(res.status).toBe(200)
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  // ─── customer.subscription.updated ─────────────────────────────────────────

  describe("customer.subscription.updated", () => {
    it("syncs plan with planExpiresAt null when not cancelling", async () => {
      mockConstructEvent.mockReturnValue(
        makeEvent("customer.subscription.updated", {
          customer: "cus_123",
          items: { data: [{ price: { id: "price_pro" } }] },
          status: "active",
          cancel_at_period_end: false,
          cancel_at: null,
        })
      )
      const res = await POST(makeRequest())
      expect(res.status).toBe(200)
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ plan: "pro", planExpiresAt: null })
      )
    })

    it("sets planExpiresAt to a Date when cancel_at_period_end is true", async () => {
      const cancelAt = Math.floor(Date.now() / 1000) + 86400 // 1 day from now
      mockConstructEvent.mockReturnValue(
        makeEvent("customer.subscription.updated", {
          customer: "cus_123",
          items: { data: [{ price: { id: "price_starter" } }] },
          status: "active",
          cancel_at_period_end: true,
          cancel_at: cancelAt,
        })
      )
      const res = await POST(makeRequest())
      expect(res.status).toBe(200)
      const setArg = mockSet.mock.calls[0]?.[0] as Record<string, unknown>
      expect(setArg?.planExpiresAt).toBeInstanceOf(Date)
    })

    it("does not update db when status is past_due and returns 200", async () => {
      mockConstructEvent.mockReturnValue(
        makeEvent("customer.subscription.updated", {
          customer: "cus_123",
          items: { data: [{ price: { id: "price_pro" } }] },
          status: "past_due",
          cancel_at_period_end: false,
          cancel_at: null,
        })
      )
      const res = await POST(makeRequest())
      expect(res.status).toBe(200)
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  // ─── customer.subscription.deleted ─────────────────────────────────────────

  describe("customer.subscription.deleted", () => {
    it("downgrades to free and returns 200", async () => {
      mockConstructEvent.mockReturnValue(
        makeEvent("customer.subscription.deleted", {
          customer: "cus_123",
        })
      )
      const res = await POST(makeRequest())
      expect(res.status).toBe(200)
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ plan: "free", planExpiresAt: null })
      )
    })
  })

  // ─── Unknown event ──────────────────────────────────────────────────────────

  it("ignores unknown event type and returns 200", async () => {
    mockConstructEvent.mockReturnValue(
      makeEvent("payment_intent.created", { id: "pi_123" })
    )
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
