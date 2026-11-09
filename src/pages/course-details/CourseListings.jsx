import { Link } from 'react-router'
import { SectionHeading } from '@/components/layout/SectionHeading'
import { ListingCard } from '@/components/listing/ListingCard'
import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SelectField } from '@/components/ui/SelectField'
import { SORTS } from '@/lib/constants'
import { codeToSlug } from '@/lib/courses'
import { plural } from '@/lib/format'

// "6 listings: 5 for sale, 1 sold or reserved". Until the sold count is known, just the total.
function countLine(total, unavailable) {
  if (unavailable === undefined) return plural(total, 'listing')
  if (unavailable === 0) return `${total} for sale`
  return `${plural(total, 'listing')}: ${total - unavailable} for sale, ${unavailable} sold or reserved`
}

/** Listings for the course with a simple sort; full filtering lives in Browse (section 5.4). */
export function CourseListings({
  code,
  result,
  loading,
  error,
  onRetry,
  unavailable,
  sort,
  onSort,
}) {
  const slug = codeToSlug(code)
  const items = result?.items ?? []
  const total = result?.total ?? 0

  return (
    <section aria-labelledby="listings-heading">
      <SectionHeading
        title="Listings for this course"
        id="listings-heading"
        aside={
          <Link
            to={`/browse?course=${slug}`}
            className="inline-flex min-h-11 items-center"
          >
            Open in Browse
          </Link>
        }
      />

      {(loading || error || total > 0) && (
        // Count and sort stay mounted while the grid reloads, so focus stays on the select.
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <p aria-live="polite" className="text-ink-700">
            {result && countLine(total, unavailable)}
          </p>
          <SelectField
            label="Sort"
            value={sort}
            onChange={(e) => onSort(e.target.value)}
            className="w-full sm:w-56"
          >
            {Object.entries(SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
      )}

      {loading ? (
        <div role="status" className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
          <span className="sr-only">Loading listings…</span>
          {[0, 1, 2].map((i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="mt-4">
          <p className="text-ink-700">These listings didn&apos;t load.</p>
          <Button variant="outline" className="mt-3" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : total === 0 ? (
        <EmptyState
          className="mt-6"
          as="h3"
          title={`Nothing for ${code} yet.`}
          note="Have the book? Somebody in the next section needs it."
          action={
            <Button as={Link} to={`/sell?course=${slug}`}>
              Sell yours for {code}
            </Button>
          }
        />
      ) : (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-3">
            {items.map((l) => (
              <li key={l.id} className="flex">
                <ListingCard listing={l} className="w-full" />
              </li>
            ))}
          </ul>
          {total > items.length && (
            <Link
              to={`/browse?course=${slug}${sort !== 'newest' ? `&sort=${sort}` : ''}`}
              className="mt-6 inline-flex min-h-11 items-center"
            >
              See all {total} in Browse
            </Link>
          )}
        </>
      )}
    </section>
  )
}
