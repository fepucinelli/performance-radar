/**
 * Scheduling helpers for audit timing.
 *
 * Daily audits fire at 12:00 BRT (Brasília Time = UTC-3) = 15:00 UTC.
 */

/**
 * Returns the next 15:00 UTC datetime (= noon BRT).
 * - If the current UTC time is before 15:00 today → returns today at 15:00 UTC.
 * - If already past 15:00 today → returns tomorrow at 15:00 UTC.
 */
export function nextNoonBRT(): Date {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 15, 0, 0, 0))
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1)
  }
  return next
}

/**
 * Returns tomorrow at 15:00 UTC (= noon BRT).
 * Use this after an audit has just run to schedule the next one.
 */
export function tomorrowNoonBRT(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 15, 0, 0, 0))
}
