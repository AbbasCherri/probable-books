import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Plus } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'
import { formatPrice } from '@/lib/format'
import * as api from '@/services/api'
import { LedgerLoading } from './LedgerLoading'
import { ListingsTab } from './ListingsTab'
import { OffersReceivedTab } from './OffersReceivedTab'
import { OffersSentTab } from './OffersSentTab'
import { TabPanel, Tabs } from './Tabs'
import { STATUS_FILTERS, TAB_IDS, ledgerSummary, plural, sentence } from './ledger'

const STATUS_TOASTS = {
  reserved: 'Marked reserved. Buyers see it as on hold.',
  active: 'Back to active.',
  sold: 'Marked sold.',
}

/**
 * 5.6 My Listings and Offers: /dashboard (behind RequireAuth).
 * The ledger. Tab and status filter live in the URL: ?tab=received, ?status=sold.
 */
export default function DashboardPage() {
  useDocumentTitle('Your ledger')
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab = TAB_IDS.includes(params.get('tab')) ? params.get('tab') : 'listings'
  const status = STATUS_FILTERS.some((f) => f.id === params.get('status'))
    ? params.get('status')
    : 'all'

  const listingsQ = useAsync(() => api.getMyListings(), [])
  const receivedQ = useAsync(() => api.getOffers({ direction: 'received' }), [])
  const sentQ = useAsync(() => api.getOffers({ direction: 'sent' }), [])

  const [busyId, setBusyId] = useState(null)
  const [askDeclineFor, setAskDeclineFor] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  const listings = listingsQ.data ?? []
  const received = receivedQ.data ?? []
  const sent = sentQ.data ?? []
  const pendingReceived = received.filter((o) => o.status === 'pending').length

  function setQuery(changes) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(changes)) {
        if (v == null) next.delete(k)
        else next.set(k, v)
      }
      return next
    })
  }

  const showTab = (id) => setQuery({ tab: id === 'listings' ? null : id })

  /** Runs an API call, then reloads the ledger. Keeps the button disabled meanwhile. */
  async function run(id, action, success) {
    setBusyId(id)
    try {
      await action()
      if (success) toast(success)
      listingsQ.retry()
      receivedQ.retry()
      sentQ.retry()
      return true
    } catch (err) {
      toast(err?.message || "That didn't go through. Try again.")
      return false
    } finally {
      setBusyId(null)
    }
  }

  const setListingStatus = (listing, next) =>
    run(
      listing.id,
      () => api.updateListing(listing.id, { status: next }),
      STATUS_TOASTS[next],
    )

  async function acceptOffer(offer) {
    const listing = listings.find((l) => l.id === offer.listingId)
    const ok = await run(
      offer.id,
      async () => {
        await api.respondToOffer(offer.id, 'accept')
        // Accepting marks the listing reserved (5.6).
        await api.updateListing(offer.listingId, { status: 'reserved' })
      },
      `Offer accepted. ${listing?.title ?? 'The listing'} is now reserved.`,
    )
    const others = received.filter(
      (o) =>
        o.listingId === offer.listingId && o.id !== offer.id && o.status === 'pending',
    )
    if (ok && others.length) setAskDeclineFor(offer.listingId)
  }

  const declineOffer = (offer) =>
    run(
      offer.id,
      () => api.respondToOffer(offer.id, 'decline'),
      `Declined. ${offer.buyer?.name ?? 'The buyer'} gets a short note.`,
    )

  const counterOffer = (offer, cents) =>
    run(
      offer.id,
      () => api.respondToOffer(offer.id, 'counter', cents),
      sentence(
        `Counter of ${formatPrice(cents)} sent to ${offer.buyer?.name ?? 'the buyer'}`,
      ),
    )

  async function declineOthers(listingId) {
    const others = received.filter(
      (o) => o.listingId === listingId && o.status === 'pending',
    )
    await run(
      listingId,
      () => Promise.all(others.map((o) => api.respondToOffer(o.id, 'decline'))),
      others.length === 1
        ? 'Declined the other offer.'
        : `Declined ${others.length} other offers.`,
    )
    setAskDeclineFor(null)
  }

  const withdrawOffer = (offer) =>
    run(offer.id, () => api.respondToOffer(offer.id, 'withdraw'), 'Offer withdrawn.')

  async function confirmDelete() {
    const listing = toDelete
    const ok = await run(
      listing.id,
      () => api.deleteListing(listing.id),
      'Listing deleted.',
    )
    if (ok) setToDelete(null)
  }

  const pendingOnDelete = toDelete
    ? received.filter((o) => o.listingId === toDelete.id && o.status === 'pending').length
    : 0
  const loading = !listingsQ.data && !listingsQ.error
  const failed = listingsQ.error || receivedQ.error || sentQ.error
  const tabs = [
    { id: 'listings', label: 'Listings' },
    {
      id: 'received',
      label: pendingReceived ? `Offers received (${pendingReceived})` : 'Offers received',
    },
    { id: 'sent', label: sent.length ? `Offers sent (${sent.length})` : 'Offers sent' },
  ]

  return (
    <PageShell chapter="Ledger" title="Your ledger">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-7">
        <p className="text-ink-700">
          {loading ? ' ' : ledgerSummary(listings, received)}
        </p>
        <Button as={Link} to="/sell" variant="outline" size="lg">
          <Plus size={18} strokeWidth={1.5} aria-hidden="true" />
          Sell something
        </Button>
      </div>

      <Tabs
        label="Ledger sections"
        tabs={tabs}
        value={tab}
        onChange={showTab}
        idPrefix="ledger"
      />

      {failed && (
        <div
          role="alert"
          className="mt-6 flex flex-wrap items-center gap-4 rounded-paper border-2 border-redpen-600 bg-paper-50 px-4 py-3"
        >
          <p className="font-medium">Part of your ledger didn&apos;t load.</p>
          <Button
            variant="outline"
            onClick={() => {
              listingsQ.retry()
              receivedQ.retry()
              sentQ.retry()
            }}
          >
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <LedgerLoading />
      ) : (
        <TabPanel id={tab} idPrefix="ledger">
          {tab === 'listings' && (
            <ListingsTab
              listings={listings}
              received={received}
              status={status}
              onStatusChange={(id) => setQuery({ status: id === 'all' ? null : id })}
              onSetStatus={setListingStatus}
              onDelete={setToDelete}
              onShowOffers={() => showTab('received')}
              busyId={busyId}
            />
          )}
          {tab === 'received' && (
            <OffersReceivedTab
              listings={listings}
              offers={received}
              askDeclineFor={askDeclineFor}
              busyId={busyId}
              onAccept={acceptOffer}
              onDecline={declineOffer}
              onCounter={counterOffer}
              onDeclineOthers={declineOthers}
              onKeepOthers={() => setAskDeclineFor(null)}
              onShowListings={() => showTab('listings')}
            />
          )}
          {tab === 'sent' && (
            <OffersSentTab offers={sent} busyId={busyId} onWithdraw={withdrawOffer} />
          )}
        </TabPanel>
      )}

      <Dialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Delete this listing?"
      >
        {toDelete && (
          <>
            <p className="mt-2 text-ink-700">
              “{toDelete.title}” comes off Probable Books
              {pendingOnDelete > 0 &&
                `, and ${plural(pendingOnDelete, 'buyer with a pending offer is', 'buyers with pending offers are')} told it’s gone`}
              . You can’t undo this.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={() => setToDelete(null)}>
                Keep listing
              </Button>
              <Button
                variant="redpen"
                onClick={confirmDelete}
                disabled={busyId === toDelete.id}
              >
                Delete listing
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </PageShell>
  )
}
