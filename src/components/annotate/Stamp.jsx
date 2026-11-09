import { cn } from '@/lib/cn'
import { LISTING_STATUSES, OFFER_STATUSES } from '@/lib/constants'

// Ink colour per status; the label comes from src/lib/constants.js. Red pen for the final word
// (sold), ballpoint for deals in motion, muted ink for what is off the table.
const COLORS = {
  // Listings
  draft: 'text-ink-500',
  active: 'text-ink-900',
  reserved: 'text-pen-600',
  sold: 'text-redpen-600',
  // Offers
  pending: 'text-ink-700',
  accepted: 'text-pen-600',
  countered: 'text-pen-600',
  declined: 'text-ink-500',
  withdrawn: 'text-ink-500',
}

const LABELS = { ...LISTING_STATUSES, ...OFFER_STATUSES }

const SIZES = {
  sm: 'px-1.5 text-caption border-3',
  md: 'px-2 text-small border-4',
  lg: 'px-3 py-0.5 text-h3 border-6',
}

/**
 * Angled rubber-stamp status (section 2). The word always carries the meaning; colour backs it up.
 *   <Stamp status="sold" />          listing: draft, active, reserved, sold
 *   <Stamp status="countered" />     offer: pending, accepted, declined, countered, withdrawn
 * Labels come from LISTING_STATUSES and OFFER_STATUSES; an unknown status renders nothing.
 * Pass `animate` right after a status changes so it lands with a short scale-and-rotate.
 */
export function Stamp({ status, size = 'md', animate = false, className }) {
  const label = LABELS[status]?.label
  if (!label) return null
  return (
    <span
      key={status}
      className={cn(
        'inline-block shrink-0 -rotate-3 rounded-paper border-double border-current font-condensed leading-normal font-semibold whitespace-nowrap',
        COLORS[status],
        SIZES[size] ?? SIZES.md,
        animate && 'motion-safe:animate-stamp-land',
        className,
      )}
    >
      {label}
    </span>
  )
}
