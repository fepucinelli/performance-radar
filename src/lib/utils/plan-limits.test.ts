import { describe, it, expect } from "vitest"
import { PLAN_LIMITS } from "./plan-limits"

describe("PLAN_LIMITS", () => {
  it("matches snapshot", () => {
    expect(PLAN_LIMITS).toMatchSnapshot()
  })

  describe("free plan", () => {
    it("maxProjects is 1", () => {
      expect(PLAN_LIMITS.free.maxProjects).toBe(1)
    })
    it("aiActionPlansPerMonth is 0", () => {
      expect(PLAN_LIMITS.free.aiActionPlansPerMonth).toBe(0)
    })
    it("pdfReports is false", () => {
      expect(PLAN_LIMITS.free.pdfReports).toBe(false)
    })
  })

  describe("starter plan", () => {
    it("pdfReports is false", () => {
      expect(PLAN_LIMITS.starter.pdfReports).toBe(false)
    })
    it("manualRunsPerMonth is -1 (unlimited)", () => {
      expect(PLAN_LIMITS.starter.manualRunsPerMonth).toBe(-1)
    })
  })

  describe("pro plan", () => {
    it("pdfReports is true", () => {
      expect(PLAN_LIMITS.pro.pdfReports).toBe(true)
    })
    it("manualRunsPerMonth is -1 (unlimited)", () => {
      expect(PLAN_LIMITS.pro.manualRunsPerMonth).toBe(-1)
    })
  })

  describe("agency plan", () => {
    it("maxProjects is 100", () => {
      expect(PLAN_LIMITS.agency.maxProjects).toBe(100)
    })
    it("maxPagesPerProject is -1 (unlimited)", () => {
      expect(PLAN_LIMITS.agency.maxPagesPerProject).toBe(-1)
    })
    it("manualRunsPerMonth is -1 (unlimited)", () => {
      expect(PLAN_LIMITS.agency.manualRunsPerMonth).toBe(-1)
    })
  })
})
