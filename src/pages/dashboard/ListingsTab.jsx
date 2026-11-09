import { Link } from 'react-router'
import { CourseTab } from '@/components/annotate/CourseTab'
import { Stamp } from '@/components/annotate/Stamp'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/cn'
import { formatPrice } from '@/lib/format'
import { ListingThumb } from './ListingThumb'
import { RowActionsMenu } from './RowActionsMenu'
import { STATUS_FILTERS, plural, shortDate } from './ledger'

function offerInfo(listing, received) {
  const mine = received.filter((o) => o.listingId === listing.id)
  return {
    pending: mine.filter((o) => o.status === 'pending').length,
    accepted: mine.filter((o) => o.status === 'accepted').length,
  }
}

/** Stamp has no draft status (it would read Pending), so drafts get a plain label here. */
function OffersCell({ info, onShowOffers }) {
  if (info.pending > 0) {
    return (
      <button
        type="button"
        onClick={onShowOffers}
        className="min-h-11 font-semibold text-pen-600 underline underline-offset-3 hover:text-pen-700"
      >
        {info.pending} new
      </button>
    )
  }
  if (info.accepted > 0)
    return <span className="text-ink-700">{info.accepted} accepted</span>
  return <span className="text-ink-500">none</span>
}

/** Listings tab: status chips, the ledger table from md up, stacked cards below md. */
export function ListingsTab({
  listings,
  received,
  status,
  onStatusChange,
  onSetStatus,
  onDelete,
  onShowOffers,
  busyId,
}) {
  if (listings.length === 0) {
    return (
      <EmptyState
        title="Nothing on your ledger yet."
        note="Selling your CHEM 201 lab coat? Takes two minutes."
        action={
          <Button as={Link} to="/sell" size="lg">
            Sell something
          </Button>
        }
      />
    )
  }

  const counts = { all: listings.length }
  for (const l of listings) counts[l.status] = (counts[l.status] ?? 0) + 1
  const rows = status === 'all' ? listings : listings.filter((l) => l.status === status)

  return (
    <>
      <div
        role="group"
        aria-label="Filter by status"
        className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {STATUS_FILTERS.map((f) => {
          const on = status === f.id
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={on}
              onClick={() => onStatusChange(f.id)}
              className={cn(
                'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-paper border px-3 transition-paper',
                on
                  ? 'border-hl-yellow bg-hl-yellow font-semibold text-on-mark'
                  : 'border-paper-400 text-ink-900 hover:bg-paper-200',
              )}
            >
              {f.label}
              <span
                className={cn(
                  'text-small tabular-nums',
                  on ? 'text-on-mark' : 'text-ink-700',
                )}
              >
                {counts[f.id] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      {rows.length === 0 && (
        <p className="py-6 text-ink-700">Nothing marked {status} right now.</p>
      )}

      {/* md and up: the ledger table */}
      {rows.length > 0 && (
        <table className="hidden w-full md:table">
          <caption className="sr-only">Your listings</caption>
          <thead>
            <tr className="border-b-3 border-double border-ink-900 text-left font-serif text-small text-ink-500 italic">
              <th scope="col" className="py-2 pr-3 font-normal">
                Item
              </th>
              <th scope="col" className="px-3 py-2 font-normal">
                Courses
              </th>
              <th scope="col" className="px-3 py-2 text-right font-normal">
                Price
              </th>
              <th scope="col" className="px-3 py-2 font-normal">
                Status
              </th>
              <th scope="col" className="px-3 py-2 font-normal">
                Offers
              </th>
              <th scope="col" className="px-3 py-2 font-normal">
                Posted
              </th>
              <th scope="col" className="w-14 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => {
              const sold = l.status === 'sold'
              return (
                <tr
                  key={l.id}
                  className="border-b border-paper-300 transition-paper hover:bg-paper-200"
                >
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-3.5">
                      <ListingThumb listing={l} className="w-16" />
                      <Link
                        to={`/listings/${l.id}`}
                        className={cn(
                          'inline-flex min-h-11 items-center font-semibold no-underline hover:underline',
                          sold ? 'text-ink-500' : 'text-ink-900',
                        )}
                      >
                        {l.title}
                      </Link>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {l.courseCodes.map((c) => (
                        <CourseTab key={c} code={c} />
                      ))}
                    </div>
                  </td>
                  <td
                    className={cn(
                      'px-3 py-2.5 text-right font-serif text-lead font-semibold tabular-nums',
                      sold ? 'text-ink-500' : 'text-ink-900',
                    )}
                  >
                    {formatPrice(l.priceCents)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Stamp status={l.status} />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <OffersCell
                      info={offerInfo(l, received)}
                      onShowOffers={onShowOffers}
                    />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-ink-500 tabular-nums">
                    {shortDate(l.createdAt)}
                  </td>
                  <td className="py-2.5 text-right">
                    <RowActionsMenu
                      listing={l}
                      onSetStatus={onSetStatus}
                      onDelete={onDelete}
                      disabled={busyId === l.id}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Below md: stacked cards */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((l) => {
          const info = offerInfo(l, received)
          return (
            <li
              key={l.id}
              className="relative flex gap-3 rounded-paper border border-paper-400 bg-paper-50 py-3 pr-1 pl-3 shadow-stack"
            >
              <ListingThumb listing={l} className="w-18" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link
                  to={`/listings/${l.id}`}
                  // Stretched over the card so the whole card is a 44px+ target.
                  className="leading-snug font-semibold text-ink-900 no-underline after:absolute after:inset-0 after:rounded-paper hover:underline"
                >
                  {l.title}
                </Link>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-serif text-lead font-semibold tabular-nums">
                    {formatPrice(l.priceCents)}
                  </span>
                  <Stamp status={l.status} />
                  {info.pending > 0 ? (
                    <button
                      type="button"
                      onClick={onShowOffers}
                      className="relative min-h-11 text-small font-semibold text-pen-600 underline underline-offset-3"
                    >
                      {plural(info.pending, 'new offer', 'new offers')}
                    </button>
                  ) : (
                    <span className="text-small text-ink-500">
                      {info.accepted ? `${info.accepted} accepted` : 'No offers'}
                    </span>
                  )}
                </div>
              </div>
              <RowActionsMenu
                listing={l}
                onSetStatus={onSetStatus}
                onDelete={onDelete}
                disabled={busyId === l.id}
              />
            </li>
          )
        })}
      </ul>
    </>
  )
}
