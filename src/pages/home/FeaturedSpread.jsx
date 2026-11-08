import { SectionHeading } from '@/components/layout/SectionHeading'
import { ListingCard } from '@/components/listing/ListingCard'
import { cn } from '@/lib/cn'

// One large card spanning two rows plus four smaller ones; phones show only the first.
export function FeaturedSpread({ listings }) {
  const items = listings.slice(0, 5)
  return (
    <section aria-labelledby="featured-heading" id="featured" className="scroll-mt-20">
      <SectionHeading title="Featured" id="featured-heading" />
      <ul className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((l, i) => (
          <li
            key={l.id}
            className={cn(
              'flex flex-col',
              i === 0 && 'md:col-span-2 lg:col-span-1 lg:row-span-2',
              i > 0 && 'hidden md:block',
            )}
          >
            <ListingCard listing={l} headingLevel={3} className="flex-1" />
          </li>
        ))}
      </ul>
    </section>
  )
}
