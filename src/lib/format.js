// Money is integer cents everywhere; format only at display time.
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const usdWhole = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatPrice(cents) {
  return cents % 100 === 0 ? usdWhole.format(cents / 100) : usd.format(cents / 100)
}

/** "45", "$45.50", "1,200" -> integer cents. Empty or not a number -> null. */
export function parsePriceToCents(text) {
  const n = Number.parseFloat(String(text ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

/** 4500 -> "45", 4550 -> "45.50", null -> "". For prefilling price inputs. */
export function centsToInput(cents) {
  if (cents == null) return ''
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2)
}

export function percentUnderRetail(cents, retailCents) {
  if (!retailCents || retailCents <= cents) return null
  return Math.round((1 - cents / retailCents) * 100)
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatMonthYear(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function isRecent(iso, days = 7) {
  return Date.now() - new Date(iso).getTime() < days * 86400000
}

export function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}
