import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Strict mode catches subtle bugs during development
  reactStrictMode: true,

  // Validate env at build time so misconfigured deploys fail fast
  experimental: {
    typedEnv: true,
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ]
  },
}

export default nextConfig
