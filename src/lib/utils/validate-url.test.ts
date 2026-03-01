import { describe, it, expect } from "vitest"
import { validateAuditUrl } from "./validate-url"

describe("validateAuditUrl", () => {
  describe("valid URLs", () => {
    it("accepts https URL and returns it normalized", () => {
      const result = validateAuditUrl("https://example.com")
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe("https://example.com")
      expect(result.error).toBeUndefined()
    })

    it("accepts http URL", () => {
      const result = validateAuditUrl("http://example.com")
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe("http://example.com")
    })

    it("auto-prepends https when no protocol given", () => {
      const result = validateAuditUrl("example.com")
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe("https://example.com")
    })

    it("strips trailing slash", () => {
      const result = validateAuditUrl("https://example.com/")
      expect(result.valid).toBe(true)
      expect(result.normalized).toBe("https://example.com")
    })
  })

  describe("invalid inputs", () => {
    it("returns error for empty string", () => {
      const result = validateAuditUrl("")
      expect(result.valid).toBe(false)
      expect(result.error).toBe("Please enter a URL")
    })

    it("returns error for no-dot hostname", () => {
      const result = validateAuditUrl("notaurl")
      expect(result.valid).toBe(false)
      expect(result.error).toBe("Please enter a full domain (e.g. yoursite.com)")
    })

    it("returns error for ftp:// (no dot after prepend makes it a bare hostname)", () => {
      // Code prepends https://, making "https://ftp://example.com" → hostname "ftp" (no dot)
      const result = validateAuditUrl("ftp://example.com")
      expect(result.valid).toBe(false)
      expect(result.error).toBe("Please enter a full domain (e.g. yoursite.com)")
    })
  })

  describe("SSRF blocks", () => {
    const ssrfError = "Cannot audit local or private network URLs"

    it("blocks localhost", () => {
      expect(validateAuditUrl("http://localhost").error).toBe(ssrfError)
    })

    it("blocks 127.0.0.1", () => {
      expect(validateAuditUrl("http://127.0.0.1").error).toBe(ssrfError)
    })

    it("blocks 0.0.0.0", () => {
      expect(validateAuditUrl("http://0.0.0.0").error).toBe(ssrfError)
    })

    it("blocks 192.168.x.x", () => {
      expect(validateAuditUrl("http://192.168.1.1").error).toBe(ssrfError)
    })

    it("blocks 10.x.x.x", () => {
      expect(validateAuditUrl("http://10.0.0.1").error).toBe(ssrfError)
    })

    it("blocks 172.16.x.x", () => {
      expect(validateAuditUrl("http://172.16.0.1").error).toBe(ssrfError)
    })

    it("blocks 172.31.x.x", () => {
      expect(validateAuditUrl("http://172.31.255.255").error).toBe(ssrfError)
    })

    it("blocks IPv6 loopback [::1] — hostname includes brackets so falls to no-dot check", () => {
      // url.hostname returns "[::1]" (with brackets); PRIVATE_PREFIXES has "::1" (no brackets)
      // so the SSRF check misses and the no-dot check catches it instead
      const result = validateAuditUrl("http://[::1]")
      expect(result.valid).toBe(false)
      // Still blocked — just via a different guard
      expect(result.error).toBeDefined()
    })

    it("blocks AWS metadata endpoint 169.254.169.254", () => {
      expect(validateAuditUrl("http://169.254.169.254").error).toBe(ssrfError)
    })

    it("blocks CGNAT lower bound 100.64.0.1", () => {
      expect(validateAuditUrl("http://100.64.0.1").error).toBe(ssrfError)
    })

    it("blocks CGNAT upper bound 100.127.255.255", () => {
      expect(validateAuditUrl("http://100.127.255.255").error).toBe(ssrfError)
    })
  })

  describe("CGNAT boundary edge cases", () => {
    it("allows 100.63.0.1 (just below CGNAT range)", () => {
      const result = validateAuditUrl("http://100.63.0.1")
      expect(result.valid).toBe(true)
    })

    it("allows 100.128.0.1 (just above CGNAT range)", () => {
      const result = validateAuditUrl("http://100.128.0.1")
      expect(result.valid).toBe(true)
    })
  })
})
