import { useRef } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SectionHeading } from '@/components/layout/SectionHeading'
import { ListingCard } from '@/components/listing/ListingCard'
import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton'
import { codeToSlug } from '@/lib/courses'

const navBtn =
  'inline-flex size-11 items-center justify-center rounded-paper border border-ink-900 bg-transparent text-ink-900 hover:bg-paper-200'

/** "Also for CHEM 201": a scroll-snap shelf of other listings for the same course. */
export function RelatedShelf({ code, listings, loading }) {
  const shelf = useRef(null)
  if (!loading && listings.length === 0) return null

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
    <section aria-labelledby="related-heading" className="mt-16 lg:mt-24">
      <SectionHeading title={`Also for ${code}`} id="related-heading" />
      {loading ? (
        <div role="status" className="mt-6 flex gap-4 overflow-hidden">
          <span className="sr-only">Loading listings…</span>
          {[0, 1, 2].map((i) => (
            <ListingCardSkeleton key={i} className="w-[78%] shrink-0 sm:w-64" />
          ))}
        </div>
      ) : (
        <>
          <ul
            ref={shelf}
            className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4"
          >
            {listings.map((l) => (
              <li key={l.id} className="w-[78%] shrink-0 snap-start sm:w-64">
                <ListingCard listing={l} />
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between gap-4">
            <Link
              to={`/courses/${codeToSlug(code)}`}
              className="inline-flex min-h-11 items-center"
            >
              See everything for {code}
            </Link>
            <div className="flex gap-2">
              <button type="button" className={navBtn} onClick={() => scrollBy(-1)}>
                <ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" />
                <span className="sr-only">Previous listings</span>
              </button>
              <button type="button" className={navBtn} onClick={() => scrollBy(1)}>
                <ChevronRight size={20} strokeWidth={1.5} aria-hidden="true" />
                <span className="sr-only">Next listings</span>
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
