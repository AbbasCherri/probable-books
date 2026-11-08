import { useId } from 'react'
import { cn } from '@/lib/cn'
import { formatMonthYear, plural } from '@/lib/format'

/**
 * Who is selling and where they hand things over (doc 5.3): name, member since, active
 * listings, usual pickup spot, and this listing's pickup spot when it differs.
 * `contact` renders under the facts (Contact seller, or the sign-in sentence).
 */
export function SellerBlock({ seller, pickupSpot, contact, className }) {
  const headingId = useId()
  if (!seller) return null
  const usual = seller.usualPickupSpot
  const rows = [
    ['Member since', formatMonthYear(seller.memberSince)],
    seller.yearOfStudy ? ['Year of study', `Year ${seller.yearOfStudy}`] : null,
    seller.activeListingCount != null
      ? ['Selling', plural(seller.activeListingCount, 'active listing')]
      : null,
    usual ? ['Usual pickup spot', usual] : null,
    pickupSpot && pickupSpot !== usual ? ['Pickup for this one', pickupSpot] : null,
  ].filter(Boolean)

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'rounded-paper border border-paper-400 bg-paper-50 p-4 sm:p-5',
        className,
      )}
    >
      <p className="text-small text-ink-500">Sold by</p>
      <h2
        id={headingId}
        className="font-sans text-h3 font-semibold break-words text-ink-900"
      >
        {seller.name}
      </h2>
      <dl className="mt-3 flex flex-col gap-2 text-small">
        {rows.map(([term, value]) => (
          <div
            key={term}
            className="flex flex-wrap gap-x-2 border-b border-paper-300 pb-2"
          >
            <dt className="text-ink-500">{term}</dt>
            <dd className="ml-auto text-right text-ink-900">{value}</dd>
          </div>
        ))}
      </dl>
      {contact && <div className="mt-4">{contact}</div>}
    </section>
  )
}
