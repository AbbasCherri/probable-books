import { cn } from '@/lib/cn'

const STAMPS = {
  active: { label: 'Active', color: 'text-ink-900' },
  pending: { label: 'Pending', color: 'text-ink-700' },
  reserved: { label: 'Reserved', color: 'text-pen-600' },
  accepted: { label: 'Accepted', color: 'text-pen-600' },
  sold: { label: 'Sold', color: 'text-redpen-600' },
  declined: { label: 'Declined', color: 'text-ink-500' },
}

const SIZES = {
  sm: 'px-1.5 text-xs border-3',
  md: 'px-2 text-sm border-4',
  lg: 'px-3 py-0.5 text-xl border-6',
}

/**
 * Angled rubber-stamp status (section 2). The word always carries the meaning; colour backs it up.
 *   <Stamp status="sold" />
 * Pass `animate` right after a status changes so it lands with a short scale-and-rotate.
 */
export function Stamp({ status, size = 'md', animate = false, className }) {
  const s = STAMPS[status] ?? STAMPS.pending
  return (
    <span
      key={status}
      className={cn(
        'inline-block shrink-0 -rotate-3 rounded-paper border-double border-current font-condensed leading-normal font-semibold whitespace-nowrap',
        s.color,
        SIZES[size] ?? SIZES.md,
        animate && 'stamp-land',
        className,
      )}
    >
      {s.label}
    </span>
  )
}
