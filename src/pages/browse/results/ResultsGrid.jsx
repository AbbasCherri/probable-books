import { ListingCard } from '@/components/listing/ListingCard'
import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton'
import { cn } from '@/lib/cn'
import { PAGE_SIZE } from '@/lib/constants'

const SKELETON_COUNT = 8
// ListingCard's title is a bare heading; keep it card-sized, not the page-section h2 size.
const titleSize = '[&_h2]:text-body sm:[&_h2]:text-h3 [&_h2]:break-words'
// Columns come from a rem minimum width, so they drop to fewer when text is zoomed or the screen is narrow.
const gridClass =
  'grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-x-3 gap-y-2 sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] sm:gap-x-4 lg:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]'

/** Listing cards in a grid (view "cards") or a plain ledger list (view "ledger"). */
export function ResultsGrid({ items, loading, view, pageSize = PAGE_SIZE, className }) {
  const ledger = view === 'ledger'
  const variant = ledger ? 'row' : 'card'
  const list = cn(titleSize, ledger ? 'flex flex-col' : gridClass)
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
