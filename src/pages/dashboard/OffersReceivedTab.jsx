import { Link } from 'react-router'
import { CourseTab } from '@/components/annotate/CourseTab'
import { Stamp } from '@/components/annotate/Stamp'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatPrice } from '@/lib/format'
import { OfferNote } from './OfferNote'
import { byPendingThenNewest, plural } from './ledger'

/** Offers received, grouped by listing. */
export function OffersReceivedTab({
  listings,
  offers,
  askDeclineFor,
  busyId,
  onAccept,
  onDecline,
  onCounter,
  onDeclineOthers,
  onKeepOthers,
  onShowListings,
}) {
  const groups = listings
    .map((listing) => ({
      listing,
      offers: offers.filter((o) => o.listingId === listing.id).sort(byPendingThenNewest),
    }))
    .filter((g) => g.offers.length > 0)

  if (groups.length === 0) {
    return (
      <EmptyState
        title="No offers yet."
        note="Listings with photos get more."
        action={
          <Button variant="outline" size="lg" onClick={onShowListings}>
            See your listings
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-10">
      {groups.map(({ listing, offers: list }) => {
        const pending = list.filter((o) => o.status === 'pending').length
        const headingId = `offers-for-${listing.id}`
        return (
          <section
            key={listing.id}
            aria-labelledby={headingId}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-b border-paper-300 pb-2.5">
              <h2 id={headingId} className="text-lg font-semibold sm:text-xl">
                <Link to={`/listings/${listing.id}`} className="hover:underline">
                  {listing.title}
                </Link>
              </h2>
              {listing.courseCodes.map((c) => (
                <CourseTab key={c} code={c} />
              ))}
              <span className="text-ink-700">
                asking {formatPrice(listing.priceCents)}
              </span>
              <Stamp status={listing.status} />
              {pending > 0 && (
                <span className="text-sm text-ink-500 sm:ml-auto">{pending} waiting</span>
              )}
            </div>

            {askDeclineFor === listing.id && pending > 0 && (
              <div className="flex flex-col gap-3 rounded-paper border border-ink-900 bg-paper-50 p-4 sm:flex-row sm:flex-wrap sm:items-center">
                <p className="font-medium sm:flex-1">
                  You accepted an offer. Decline the other{' '}
                  {plural(pending, 'pending offer', 'pending offers')}?
                </p>
                <Button
                  variant="redpen"
                  size="lg"
                  onClick={() => onDeclineOthers(listing.id)}
                  disabled={busyId === listing.id}
                >
                  {pending === 1 ? 'Decline it' : `Decline all ${pending}`}
                </Button>
                <Button variant="ghost" size="lg" onClick={onKeepOthers}>
                  Keep {pending === 1 ? 'it' : 'them'} pending
                </Button>
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {list.map((offer) => (
                <OfferNote
                  key={offer.id}
                  offer={offer}
                  askingCents={listing.priceCents}
                  busy={busyId === offer.id}
                  onAccept={onAccept}
                  onDecline={onDecline}
                  onCounter={onCounter}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
