import { useRef } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SectionHeading } from '@/components/layout/SectionHeading'
import { ListingCard } from '@/components/listing/ListingCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton'

const navBtn =
  'inline-flex size-11 items-center justify-center rounded-paper border border-ink-900 bg-transparent text-ink-900 hover:bg-paper-200'

export function FreshShelf({ listings, loading }) {
  const shelf = useRef(null)
  const scrollBy = (dir) => {
    const el = shelf.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({
      left: dir * el.clientWidth * 0.8,
      behavior: reduce ? 'auto' : 'smooth',
    })
  }

  return (
    <section aria-labelledby="fresh-heading" id="fresh" className="scroll-mt-20">
      <SectionHeading title="Fresh this week" id="fresh-heading" />
      {loading ? (
        <div className="mt-6 flex gap-4 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <ListingCardSkeleton key={i} className="w-[78%] shrink-0 sm:w-64" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <EmptyState
          title="Nothing new yet"
          note="Listings show up here the day they go live."
        />
      ) : (
        <>
          <ul
            ref={shelf}
            className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4"
          >
            {listings.map((l) => (
              <li key={l.id} className="w-[78%] shrink-0 snap-start sm:w-64">
                <ListingCard listing={l} variant="card" />
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between gap-4">
            <Link
              to="/browse?sort=newest"
              className="inline-flex min-h-11 items-center text-pen-600 underline underline-offset-4 hover:text-pen-700"
            >
              See all new listings
            </Link>
            <div className="flex gap-2">
              <button
                type="button"
                className={navBtn}
                aria-label="Previous listings"
                onClick={() => scrollBy(-1)}
              >
                <ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={navBtn}
                aria-label="Next listings"
                onClick={() => scrollBy(1)}
              >
                <ChevronRight size={20} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
