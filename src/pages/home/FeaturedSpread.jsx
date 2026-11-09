import { SectionHeading } from '@/components/layout/SectionHeading'
import { ListingCard } from '@/components/listing/ListingCard'
import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton'
import { cn } from '@/lib/cn'

const slotClass = (i) =>
  cn(
    'flex flex-col',
    i === 0 && 'md:col-span-2 lg:col-span-1 lg:row-span-2',
    i > 0 && 'hidden md:flex',
  )

// One large card spanning two rows plus four smaller ones; phones show only the first.
// While loading, the same five slots hold skeletons so the page below does not jump.
export function FeaturedSpread({ listings, loading = false }) {
  const items = (listings ?? []).slice(0, 5)
  return (
    <section aria-labelledby="featured-heading" id="featured" className="scroll-mt-20">
      <SectionHeading title="Featured" id="featured-heading" />
      {loading ? (
        <div role="status" className="mt-6">
          <span className="sr-only">Loading featured listings</span>
          <ul aria-hidden="true" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <li key={i} className={slotClass(i)}>
                <ListingCardSkeleton className="flex-1" />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((l, i) => (
            <li key={l.id} className={slotClass(i)}>
              <ListingCard listing={l} headingLevel={3} className="flex-1" />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
