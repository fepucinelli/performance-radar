import { describe, it, expect } from "vitest"
import {
  gradeMetric,
  gradeScore,
  formatMetricValue,
  scoreGaugeColor,
} from "./metrics"

describe("gradeMetric", () => {
  describe("lcp (good ≤ 2500, poor > 4000)", () => {
    it("returns good at exact good threshold", () => {
      expect(gradeMetric("lcp", 2500)).toBe("good")
    })
    it("returns needs-improvement one unit above good", () => {
      expect(gradeMetric("lcp", 2501)).toBe("needs-improvement")
    })
    it("returns needs-improvement at exact poor threshold", () => {
      expect(gradeMetric("lcp", 4000)).toBe("needs-improvement")
    })
    it("returns poor one unit above poor threshold", () => {
      expect(gradeMetric("lcp", 4001)).toBe("poor")
    })
  })

  describe("cls (good ≤ 0.1, poor > 0.25)", () => {
    it("returns good at exact good threshold", () => {
      expect(gradeMetric("cls", 0.1)).toBe("good")
    })
    it("returns needs-improvement one unit above good", () => {
      expect(gradeMetric("cls", 0.101)).toBe("needs-improvement")
    })
    it("returns needs-improvement at exact poor threshold", () => {
      expect(gradeMetric("cls", 0.25)).toBe("needs-improvement")
    })
    it("returns poor one unit above poor threshold", () => {
      expect(gradeMetric("cls", 0.251)).toBe("poor")
    })
  })

  describe("inp (good ≤ 200, poor > 500)", () => {
    it("returns good at exact good threshold", () => {
      expect(gradeMetric("inp", 200)).toBe("good")
    })
    it("returns needs-improvement one unit above good", () => {
      expect(gradeMetric("inp", 201)).toBe("needs-improvement")
    })
    it("returns needs-improvement at exact poor threshold", () => {
      expect(gradeMetric("inp", 500)).toBe("needs-improvement")
    })
    it("returns poor one unit above poor threshold", () => {
      expect(gradeMetric("inp", 501)).toBe("poor")
    })
  })

  describe("fcp (good ≤ 1800, poor > 3000)", () => {
    it("returns good at exact good threshold", () => {
      expect(gradeMetric("fcp", 1800)).toBe("good")
    })
    it("returns needs-improvement one unit above good", () => {
      expect(gradeMetric("fcp", 1801)).toBe("needs-improvement")
    })
    it("returns needs-improvement at exact poor threshold", () => {
      expect(gradeMetric("fcp", 3000)).toBe("needs-improvement")
    })
    it("returns poor one unit above poor threshold", () => {
      expect(gradeMetric("fcp", 3001)).toBe("poor")
    })
  })

  describe("ttfb (good ≤ 800, poor > 1800)", () => {
    it("returns good at exact good threshold", () => {
      expect(gradeMetric("ttfb", 800)).toBe("good")
    })
    it("returns needs-improvement one unit above good", () => {
      expect(gradeMetric("ttfb", 801)).toBe("needs-improvement")
    })
    it("returns needs-improvement at exact poor threshold", () => {
      expect(gradeMetric("ttfb", 1800)).toBe("needs-improvement")
    })
    it("returns poor one unit above poor threshold", () => {
      expect(gradeMetric("ttfb", 1801)).toBe("poor")
    })
  })
})

describe("gradeScore", () => {
  it("returns good at 90", () => {
    expect(gradeScore(90)).toBe("good")
  })
  it("returns needs-improvement at 89", () => {
    expect(gradeScore(89)).toBe("needs-improvement")
  })
  it("returns needs-improvement at 50", () => {
    expect(gradeScore(50)).toBe("needs-improvement")
  })
  it("returns poor at 49", () => {
    expect(gradeScore(49)).toBe("poor")
  })
})

describe("formatMetricValue", () => {
  it("formats CLS with 3 decimal places", () => {
    expect(formatMetricValue("cls", 0.125)).toBe("0.125")
    expect(formatMetricValue("cls", 0.1)).toBe("0.100")
  })

  it("formats LCP below 1000ms as ms", () => {
    expect(formatMetricValue("lcp", 800)).toBe("800ms")
  })

  it("formats LCP at or above 1000 as seconds", () => {
    expect(formatMetricValue("lcp", 1000)).toBe("1.0s")
    expect(formatMetricValue("lcp", 2500)).toBe("2.5s")
  })

  it("formats FCP below 1000ms as ms", () => {
    expect(formatMetricValue("fcp", 999)).toBe("999ms")
  })

  it("formats TTFB at 1000 as seconds", () => {
    expect(formatMetricValue("ttfb", 1000)).toBe("1.0s")
  })

  it("formats INP below 1000 as ms", () => {
    expect(formatMetricValue("inp", 200)).toBe("200ms")
  })

  it("falls through to String() for unknown metric", () => {
    expect(formatMetricValue("unknown", 42)).toBe("42")
  })
})

describe("scoreGaugeColor", () => {
  it("returns green-600 at 90", () => {
    expect(scoreGaugeColor(90)).toBe("#16a34a")
  })
  it("returns amber-600 at 89", () => {
    expect(scoreGaugeColor(89)).toBe("#d97706")
  })
  it("returns amber-600 at 50", () => {
    expect(scoreGaugeColor(50)).toBe("#d97706")
  })
  it("returns red-600 at 49", () => {
    expect(scoreGaugeColor(49)).toBe("#dc2626")
  })
})
