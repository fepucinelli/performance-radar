/**
 * Drizzle ORM client — Neon serverless adapter.
 *
 * Uses HTTP fetch transport (neon-http) which works in serverless/edge.
 * For long-running queries, switch to `neon-websockets` adapter.
 *
 * This module is safe to import in Server Components and Route Handlers.
 * Do NOT import in Client Components.
 */
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { env } from "@/env"
import * as schema from "./schema"

const sql = neon(env.DATABASE_URL)

export const db = drizzle(sql, {
  schema,
  logger: env.NODE_ENV === "development",
})

// Re-export schema for convenient importing:
// import { db, users, projects } from "@/lib/db"
export * from "./schema"
