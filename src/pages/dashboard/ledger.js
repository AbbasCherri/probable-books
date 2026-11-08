import { formatPrice } from '@/lib/format'

export const TAB_IDS = ['listings', 'received', 'sent']

export const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'reserved', label: 'Reserved' },
  { id: 'sold', label: 'Sold' },
]

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

/** ISO string -> "Nov 6". */
export function shortDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d)
}

/** "80% of asking". */
export function shareOfAsking(amountCents, askingCents) {
  if (!askingCents) return ''
  return `${Math.round((amountCents / askingCents) * 100)}% of asking`
}

/** Adds a full stop unless the text already ends with one ("Waiting on Karim S." not "Karim S.."). */
export function sentence(text) {
  return /[.!?]$/.test(text) ? text : `${text}.`
}

export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`
}

/** Header line, computed from data: "3 active, 2 offers waiting, $85 sold so far". */
export function ledgerSummary(listings, received) {
  const active = listings.filter((l) => l.status === 'active').length
  const waiting = received.filter((o) => o.status === 'pending').length
  const sold = listings
    .filter((l) => l.status === 'sold')
    .reduce((sum, l) => sum + (l.priceCents ?? 0), 0)
  return `${active} active, ${plural(waiting, 'offer', 'offers')} waiting, ${formatPrice(sold)} sold so far`
}

/** Pending first, then newest first. */
export function byPendingThenNewest(a, b) {
  const p = (o) => (o.status === 'pending' ? 0 : 1)
  return p(a) - p(b) || String(b.createdAt).localeCompare(String(a.createdAt))
}
