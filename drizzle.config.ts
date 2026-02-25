// drizzle-kit doesn't auto-load .env.local (that's a Next.js convention),
// so we load it manually here for CLI commands (db:push, db:studio, etc.)
import { config } from "dotenv"
config({ path: ".env.local" })

import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
})
