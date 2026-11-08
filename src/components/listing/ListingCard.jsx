import { Link } from 'react-router'
import { ConditionGrade } from '@/components/annotate/ConditionGrade'
import { CourseTab } from '@/components/annotate/CourseTab'
import { Stamp } from '@/components/annotate/Stamp'
import { cn } from '@/lib/cn'
import { isRecent } from '@/lib/format'
import { bylineFor } from '@/lib/listings'
import { ListingPhoto } from './ListingPhoto'
import { PriceTag } from './PriceTag'

const moreChip =
  'h-7 items-center rounded-t-paper border-b border-paper-400 bg-paper-200 px-2 font-condensed text-sm font-semibold text-on-mark'

function More({ n, className }) {
  if (n <= 0) return null
  return (
    <span className={cn(moreChip, className)}>
      +{n}
      <span className="sr-only"> more {n === 1 ? 'course' : 'courses'}</span>
    </span>
  )
}

/** Up to 2 tabs then "+n" (anatomy); phones fit 1 tab on the 2-up compact cards. */
function Tabs({ codes }) {
  return (
    <div className="flex gap-1">
      {codes.slice(0, 2).map((code, i) => (
        <CourseTab
          key={code}
          code={code}
          className={i > 0 ? 'hidden sm:inline-flex' : undefined}
        />
      ))}
      <More n={codes.length - 1} className="inline-flex sm:hidden" />
      <More n={codes.length - 2} className="hidden sm:inline-flex" />
    </div>
  )
}

/**
 * The listing card used on every list (section 4, anatomy: 8 parts).
 * Answers what, which course, how worn and how much. The title is the only link; its click
 * area covers the whole card.
 *   <ListingCard listing={l} />                card (grids and shelves)
 *   <ListingCard listing={l} variant="row" />  one ledger line
 */
export function ListingCard({ listing, variant = 'card', headingLevel = 3, className }) {
  const Heading = `h${headingLevel}`
  const byline = bylineFor(listing)
  const isNew = listing.status === 'active' && isRecent(listing.createdAt, 7)
  const showStamp = listing.status === 'reserved' || listing.status === 'sold'
  const href = `/listings/${listing.id}`

  if (variant === 'row') {
    return (
      <article
        className={cn(
          'relative flex items-center gap-4 border-b border-paper-300 py-3 transition-colors duration-150 ease-out hover:bg-paper-200',
          className,
        )}
      >
        <ListingPhoto
          listing={listing}
          className="w-20 shrink-0 rounded-paper border border-paper-400"
        />
        <div className="min-w-0 flex-1">
          <Heading className="leading-snug font-semibold">
            <Link
              to={href}
              className="text-ink-900 no-underline after:absolute after:inset-0 hover:underline"
            >
              {listing.title}
            </Link>
          </Heading>
          {byline && <p className="truncate text-sm text-ink-500">{byline}</p>}
          <div className="mt-1 flex flex-wrap gap-1">
            {listing.courseCodes.map((code) => (
              <CourseTab key={code} code={code} />
            ))}
          </div>
        </div>
        <ConditionGrade
          condition={listing.condition}
          size="sm"
          className="hidden sm:inline-flex"
        />
        {showStamp && <Stamp status={listing.status} size="sm" />}
        <PriceTag
          cents={listing.priceCents}
          size="sm"
          showSavings={false}
          className="items-end"
        />
      </article>
    )
  }

  return (
    <article className={cn('group relative flex flex-col pt-7', className)}>
      <div className="absolute top-0 left-3">
        <Tabs codes={listing.courseCodes} />
      </div>
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-paper border border-paper-400 bg-paper-50 shadow-stack transition-colors duration-150 ease-out group-hover:border-ink-500">
        <div className="relative border-b border-paper-400">
          <ListingPhoto listing={listing} />
          {isNew && (
            // Dog-ear: posted in the last 7 days.
            <span
              aria-hidden="true"
              className="absolute top-0 right-0 size-5 bg-paper-100 [clip-path:polygon(0_0,100%_0,100%_100%)]"
            >
              <span className="absolute inset-0 bg-paper-300 [clip-path:polygon(0_0,0_100%,100%_100%)]" />
            </span>
          )}
          {showStamp && (
            <span className="absolute inset-0 grid place-items-center bg-paper-50/40">
              <Stamp status={listing.status} size="lg" className="bg-paper-50/80" />
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-0.5 p-3.5">
          <Heading className="leading-snug font-semibold">
            <Link
              to={href}
              className="text-ink-900 no-underline after:absolute after:inset-0 hover:underline"
            >
              {listing.title}
            </Link>
          </Heading>
          {byline && <p className="text-sm text-ink-500">{byline}</p>}
          <div className="mt-auto flex items-end justify-between gap-3 pt-3">
            <PriceTag cents={listing.priceCents} retailCents={listing.retailCents} />
            <ConditionGrade condition={listing.condition} size="sm" />
          </div>
          {isNew && <span className="sr-only">Posted this week.</span>}
        </div>
      </div>
    </article>
  )
}
