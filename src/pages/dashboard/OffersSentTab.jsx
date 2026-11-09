import { Link } from 'react-router'
import { CourseTab } from '@/components/annotate/CourseTab'
import { Stamp } from '@/components/annotate/Stamp'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatPrice } from '@/lib/format'
import { byPendingThenNewest, shortDate } from './ledger'

const NOTES = {
  accepted: 'Accepted. Arrange the pickup with the seller.',
  declined: 'The seller passed on this one.',
  withdrawn: 'You withdrew this offer.',
}

/** Offers you made, with status stamps. Withdraw while pending. */
export function OffersSentTab({ offers, busyId, onWithdraw }) {
  if (offers.length === 0) {
    return (
      <EmptyState
        title="You haven't made any offers."
        note="Look up your course, then offer on anything open to offers."
        action={
          <Button as={Link} to="/browse" variant="outline" size="lg">
            Browse listings
          </Button>
        }
      />
    )
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {[...offers].sort(byPendingThenNewest).map((offer) => {
        const l = offer.listing ?? {}
        const stamp =
          offer.status === 'withdrawn'
            ? null
            : offer.status === 'countered'
              ? 'pending'
              : offer.status
        let note = NOTES[offer.status] ?? ''
        if (offer.status === 'countered')
          note = `The seller countered at ${formatPrice(offer.counterCents)}.`
        return (
          <article
            key={offer.id}
            aria-label={`Your offer on ${l.title ?? 'a listing'}`}
            className="flex flex-col gap-2.5 rounded-paper border border-paper-400 bg-paper-50 p-4 shadow-stack sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap gap-1">
                {(l.courseCodes ?? []).map((c) => (
                  <CourseTab key={c} code={c} />
                ))}
              </div>
              {stamp && <Stamp status={stamp} />}
            </div>
            <h2 className="font-sans text-lead leading-snug font-semibold">
              {l.id ? (
                <Link
                  to={`/listings/${l.id}`}
                  className="text-ink-900 no-underline hover:underline"
                >
                  {l.title}
                </Link>
              ) : (
                'Listing removed'
              )}
            </h2>
            <p className="flex flex-wrap items-baseline gap-x-2.5">
              <span className="font-serif text-price font-semibold text-pen-600 tabular-nums">
                {formatPrice(offer.amountCents)}
              </span>
              {l.priceCents ? (
                <span className="text-ink-700">
                  {Math.round((offer.amountCents / l.priceCents) * 100)}% of{' '}
                  {formatPrice(l.priceCents)} asking
                </span>
              ) : null}
            </p>
            <p className="text-small text-ink-500">
              {l.sellerName ? `Seller ${l.sellerName}, sent ` : 'Sent '}
              {shortDate(offer.createdAt)}
            </p>
            {note && (
              <p className="border-t border-paper-300 pt-2 text-ink-700">{note}</p>
            )}
            {offer.status === 'pending' && (
              <Button
                variant="outline"
                size="lg"
                className="self-start"
                onClick={() => onWithdraw(offer)}
                disabled={busyId === offer.id}
              >
                Withdraw offer
              </Button>
            )}
          </article>
        )
      })}
    </div>
  )
}
