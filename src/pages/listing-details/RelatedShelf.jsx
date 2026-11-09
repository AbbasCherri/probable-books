import { useRef } from 'react'
import { Link } from 'react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SectionHeading } from '@/components/layout/SectionHeading'
import { ListingCard } from '@/components/listing/ListingCard'
import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton'
import { codeToSlug } from '@/lib/courses'

const stepButton =
  'inline-flex size-11 items-center justify-center rounded-paper border border-ink-900 bg-paper-50 text-ink-900 transition-colors duration-150 ease-out hover:bg-paper-200'
const slot = 'w-3/4 shrink-0 snap-start sm:w-64'

/** "Also for CHEM 201": a scroll-snap shelf of other listings for the same course (doc 5.3). */
export function RelatedShelf({ code, listings, loading }) {
  const shelf = useRef(null)
  if (!code || (!loading && listings.length === 0)) return null

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
        <div role="status" aria-busy="true" className="mt-4 flex gap-4 overflow-hidden">
          <span className="sr-only">Loading listings for {code}</span>
          {[0, 1, 2, 3].map((i) => (
            <ListingCardSkeleton key={i} className={slot} />
          ))}
        </div>
      ) : (
        <>
          <ul
            ref={shelf}
            className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pr-1 pb-4"
          >
            {listings.map((l) => (
              <li key={l.id} className={slot}>
                <ListingCard listing={l} className="h-full" />
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <Link
              to={`/courses/${codeToSlug(code)}`}
              className="inline-flex min-h-11 items-center"
            >
              See everything for {code}
            </Link>
            <div className="flex gap-2">
              <button type="button" className={stepButton} onClick={() => scrollBy(-1)}>
                <ChevronLeft strokeWidth={1.5} aria-hidden="true" className="size-5" />
                <span className="sr-only">Previous listings</span>
              </button>
              <button type="button" className={stepButton} onClick={() => scrollBy(1)}>
                <ChevronRight strokeWidth={1.5} aria-hidden="true" className="size-5" />
                <span className="sr-only">Next listings</span>
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
