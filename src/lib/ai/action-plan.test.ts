import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Hoisted mocks (must be declared before vi.mock calls) ────────────────────

const mockEnv = vi.hoisted(() => ({
  ANTHROPIC_API_KEY: "test-key" as string | undefined,
}))

const mockCreate = vi.hoisted(() => vi.fn())

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/env", () => ({ env: mockEnv }))

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate }
  },
}))

// ─── Import SUT after mocks are registered ────────────────────────────────────

import { generateAIActionPlan } from "./action-plan"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const baseMetrics = {
  perfScore: 60,
  lcp: 3000,
  cls: 0.2,
  fcp: 2000,
  ttfb: 900,
  cruxInp: 300,
  seoScore: 70,
  accessibilityScore: 80,
}

const validJsonResponse = (items = 1) => ({
  content: [
    {
      type: "text",
      text: JSON.stringify(
        Array.from({ length: items }, (_, i) => ({
          title: `Item ${i + 1}`,
          action: "Fix it",
          steps: ["Step 1", "Step 2"],
          why: "Improves performance",
          difficulty: "Fácil",
        }))
      ),
    },
  ],
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("generateAIActionPlan", () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockEnv.ANTHROPIC_API_KEY = "test-key"
  })

  it("returns null without touching the SDK when no API key", async () => {
    mockEnv.ANTHROPIC_API_KEY = undefined
    const result = await generateAIActionPlan(
      "https://example.com",
      baseMetrics,
      null,
      "starter"
    )
    expect(result).toBeNull()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it("calls messages.create with haiku model for free plan", async () => {
    mockCreate.mockResolvedValue(validJsonResponse())
    await generateAIActionPlan("https://example.com", baseMetrics, null, "free")
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-haiku-4-5-20251001" })
    )
  })

  it("calls messages.create with haiku model for starter plan", async () => {
    mockCreate.mockResolvedValue(validJsonResponse())
    await generateAIActionPlan(
      "https://example.com",
      baseMetrics,
      null,
      "starter"
    )
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-haiku-4-5-20251001" })
    )
  })

  it("calls messages.create with sonnet model for pro plan", async () => {
    mockCreate.mockResolvedValue(validJsonResponse())
    await generateAIActionPlan("https://example.com", baseMetrics, null, "pro")
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-sonnet-4-6" })
    )
  })

  it("calls messages.create with sonnet model for agency plan", async () => {
    mockCreate.mockResolvedValue(validJsonResponse())
    await generateAIActionPlan(
      "https://example.com",
      baseMetrics,
      null,
      "agency"
    )
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-sonnet-4-6" })
    )
  })

  it("returns null when response contains no JSON array", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Sorry, I cannot help with that." }],
    })
    const result = await generateAIActionPlan(
      "https://example.com",
      baseMetrics,
      null,
      "starter"
    )
    expect(result).toBeNull()
  })

  it("returns null when messages.create throws", async () => {
    mockCreate.mockRejectedValue(new Error("API error"))
    const result = await generateAIActionPlan(
      "https://example.com",
      baseMetrics,
      null,
      "starter"
    )
    expect(result).toBeNull()
  })

  it("returns parsed action items on success", async () => {
    mockCreate.mockResolvedValue(validJsonResponse(2))
    const result = await generateAIActionPlan(
      "https://example.com",
      baseMetrics,
      null,
      "pro"
    )
    expect(result).toHaveLength(2)
    expect(result?.[0]).toMatchObject({ title: "Item 1", difficulty: "Fácil" })
  })
})
