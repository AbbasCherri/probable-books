import { formatMonthYear, plural } from '@/lib/format'

/** Who is selling and where they usually hand things over (section 5.3). */
export function SellerBlock({ seller, activeCount, pickupSpot }) {
  if (!seller) return null
  return (
    <section
      aria-labelledby="seller-heading"
      className="rounded-paper border border-paper-400 bg-paper-50 p-4"
    >
      <h2 id="seller-heading" className="font-sans text-h3 font-semibold text-ink-900">
        {seller.name}
      </h2>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-small">
        <dt className="text-ink-500">Member since</dt>
        <dd className="text-ink-900">{formatMonthYear(seller.memberSince)}</dd>
        {activeCount != null && (
          <>
            <dt className="text-ink-500">Selling</dt>
            <dd className="text-ink-900">{plural(activeCount, 'active listing')}</dd>
          </>
        )}
        <dt className="text-ink-500">Pickup</dt>
        <dd className="text-ink-900">{pickupSpot ?? seller.usualPickupSpot}</dd>
      </dl>
    </section>
  )
}
