export interface UrlValidation {
  valid: boolean
  error?: string
  normalized?: string // lowercase, trailing-slash-stripped
}

const PRIVATE_RANGES = [
  "localhost",
  "127.",
  "0.",
  "192.168.",
  "10.",
  "172.16.",
  "172.17.",
  "172.18.",
  "172.19.",
  "172.20.",
  "172.21.",
  "172.22.",
  "172.23.",
  "172.24.",
  "172.25.",
  "172.26.",
  "172.27.",
  "172.28.",
  "172.29.",
  "172.30.",
  "172.31.",
  "::1",
]

export function validateAuditUrl(rawUrl: string): UrlValidation {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return { valid: false, error: "Please enter a URL" }
  }

  // Auto-prepend https:// if no protocol given
  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`

  let url: URL
  try {
    url = new URL(withProtocol)
  } catch {
    return {
      valid: false,
      error: "Please enter a valid URL (e.g. https://yoursite.com)",
    }
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { valid: false, error: "URL must use http or https" }
  }

  if (
    PRIVATE_RANGES.some(
      (r) => url.hostname === r || url.hostname.startsWith(r)
    )
  ) {
    return {
      valid: false,
      error: "Cannot audit local or private network URLs",
    }
  }

  if (!url.hostname.includes(".")) {
    return { valid: false, error: "Please enter a full domain (e.g. yoursite.com)" }
  }

  return {
    valid: true,
    normalized: withProtocol.replace(/\/$/, ""),
  }
}
