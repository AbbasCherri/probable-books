import { ListingCard } from '@/components/listing/ListingCard'
import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton'
import { cn } from '@/lib/cn'
import { PAGE_SIZE } from '@/lib/constants'

const SKELETON_COUNT = 8
const gridClass = 'grid grid-cols-2 gap-x-3 gap-y-2 sm:gap-x-4 lg:grid-cols-3'

/** Listing cards in a grid (view "cards") or a plain ledger list (view "ledger"). */
export function ResultsGrid({ items, loading, view, pageSize = PAGE_SIZE, className }) {
  const ledger = view === 'ledger'
  const variant = ledger ? 'row' : 'card'
  const list = ledger ? 'flex flex-col' : gridClass
  const shown = (items ?? []).slice(0, pageSize)

  if (loading) {
    return (
      <div role="status" className={className}>
        <span className="sr-only">Loading listings</span>
        <ul aria-hidden="true" className={list}>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <li key={i} className="flex flex-col">
              <ListingCardSkeleton variant={variant} className="flex-1" />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <ul className={cn(list, className)}>
      {shown.map((item) => (
        <li key={item.id} className="flex flex-col">
          <ListingCard
            listing={item}
            variant={variant}
            headingLevel={2}
            className="flex-1"
          />
        </li>
      ))}
    </ul>
  )
}
