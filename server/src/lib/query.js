// Lenient query-string readers for public GET endpoints: bad values are ignored, never errors.

/** First value of a parameter that may have been repeated (?q=a&q=b). */
export const one = (v) => (Array.isArray(v) ? v[0] : v)

/**
 * A list parameter sent repeated (?course=A&course=B) or comma-separated (?course=A,B),
 * or both. Blank entries are dropped.
 */
export function list(v) {
  if (v === undefined) return []
  return (Array.isArray(v) ? v : [v])
    .flatMap((item) => String(item).split(','))
    .map((item) => item.trim())
    .filter(Boolean)
}

/** Integer from a query value, or null when it is not a plain (optionally signed) integer. */
export function int(v) {
  const s = one(v)
  if (typeof s !== 'string' || !/^\s*-?\d{1,15}\s*$/.test(s)) return null
  return Number(s)
}
