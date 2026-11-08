import { useId, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Footnote } from '@/components/annotate/Footnote'
import { CourseTab } from '@/components/annotate/CourseTab'
import { MarginNote } from '@/components/annotate/MarginNote'
import { Stamp } from '@/components/annotate/Stamp'
import { PageShell } from '@/components/layout/PageShell'
import { SectionHeading } from '@/components/layout/SectionHeading'
import { PriceTag } from '@/components/listing/PriceTag'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'
import { CATEGORIES } from '@/lib/constants'
import { formatPrice, percentUnderRetail } from '@/lib/format'
import { bylineFor } from '@/lib/listings'
import * as api from '@/services/api'
import { ConditionReport } from './ConditionReport'
import { ImageGallery } from './ImageGallery'
import { OfferDialog } from './OfferDialog'
import { RelatedShelf } from './RelatedShelf'
import { SellerBlock } from './SellerBlock'

const RELATED_MAX = 12

function TornOut() {
  return (
    <PageShell chapter="Listing">
      <div className="max-w-prose py-12">
        <h1 className="font-serif text-h1-sm font-semibold text-ink-900 sm:text-h1">
          This page was torn out
        </h1>
        <p className="mt-4 text-ink-700">
          That listing doesn&apos;t exist, or the seller took it down.
        </p>
        <Button as={Link} to="/browse" className="mt-6">
          Browse listings
        </Button>
      </div>
    </PageShell>
  )
}

function Loading() {
  return (
    <PageShell chapter="Listing">
      <div role="status" className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-12">
        <span className="sr-only">Loading listing…</span>
        <div className="aspect-4/3 rounded-paper border border-dashed border-paper-400 lg:col-span-7" />
        <div className="ruled h-72 lg:col-span-5" />
      </div>
    </PageShell>
  )
}

/** One sentence under the price saying why actions are off, or what Reserved means. */
function StatusNote({ status, isOwner }) {
  if (status === 'sold')
    return (
      <p className="text-ink-700">
        {isOwner
          ? 'You marked this sold. It stays up so old links still work.'
          : 'This sold, so it can’t take offers. It stays up so old links still work.'}
      </p>
    )
  if (status === 'reserved')
    return (
      <p className="text-ink-700">
        {isOwner
          ? 'You accepted an offer. Mark it sold once you’ve handed it over.'
          : 'The seller accepted an offer. You can still make one in case that falls through.'}
      </p>
    )
  if (status === 'draft')
    return (
      <p className="text-ink-700">Draft. Only you can see this until you publish it.</p>
    )
  return null
}

export default function ListingDetailsPage() {
  const { listingId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const contactId = useId()

  const { data, error, loading, retry } = useAsync(
    () => api.getListing(listingId),
    [listingId],
  )
  // Status changes made on this page (Mark as sold), keyed by listing so they reset on navigation.
  const [changed, setChanged] = useState(null)
  const [offerOpen, setOfferOpen] = useState(false)
  const [confirmSold, setConfirmSold] = useState(false)
  const [marking, setMarking] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)

  const primary = data?.courseCodes[0]
  const sellerId = data?.sellerId
  const related = useAsync(
    () =>
      primary
        ? api.getListings({ courses: [primary], pageSize: RELATED_MAX + 1 })
        : Promise.resolve(null),
    [primary],
  )
  const sellerListings = useAsync(
    () => (sellerId ? api.getListings({ pageSize: 1000 }) : Promise.resolve(null)),
    [sellerId],
  )

  useDocumentTitle(data?.title ?? 'Listing')

  if (loading) return <Loading />
  const isOwner = Boolean(user && data && user.id === data.sellerId)
  if (error?.status === 404 || (data?.status === 'draft' && !isOwner)) return <TornOut />
  if (error) {
    return (
      <PageShell chapter="Listing">
        <div role="alert" className="max-w-prose py-12">
          <h1 className="font-serif text-h1-sm font-semibold text-ink-900 sm:text-h1">
            This page didn&apos;t print
          </h1>
          <p className="mt-4 text-ink-700">Something jammed on our end. Try again.</p>
          <Button className="mt-6" onClick={retry}>
            Retry
          </Button>
        </div>
      </PageShell>
    )
  }

  const listing = data
  const justSold = changed?.id === listing.id
  const status = justSold ? changed.status : listing.status
  const sold = status === 'sold'
  const byline = bylineFor(listing)
  const under = percentUnderRetail(listing.priceCents, listing.retailCents)
  const relatedItems = (related.data?.items ?? [])
    .filter((l) => l.id !== listing.id)
    .slice(0, RELATED_MAX)
  const activeCount = sellerListings.data?.items.filter(
    (l) => l.sellerId === listing.sellerId && l.status === 'active',
  ).length

  function needSignIn() {
    if (user) return false
    navigate('/login', { state: { from: location } })
    return true
  }

  function openOffer() {
    if (!needSignIn()) setOfferOpen(true)
  }

  async function sendOffer(offer) {
    await api.makeOffer(listing.id, offer)
    setOfferOpen(false)
    toast(
      `Offer of ${formatPrice(offer.amountCents)} sent. ${listing.seller.name} will see it in their ledger.`,
    )
  }

  async function markSold() {
    setMarking(true)
    try {
      await api.updateListing(listing.id, { status: 'sold' })
      setChanged({ id: listing.id, status: 'sold' })
      setConfirmSold(false)
      toast('Marked as sold. Nice one.')
    } catch (err) {
      toast(err.message ?? 'That didn’t save. Try again.')
    } finally {
      setMarking(false)
    }
  }

  const actions = (size) =>
    isOwner ? (
      <>
        <Button
          as={Link}
          to={`/listings/${listing.id}/edit`}
          variant="outline"
          size={size}
        >
          Edit listing
        </Button>
        <Button size={size} disabled={sold} onClick={() => setConfirmSold(true)}>
          Mark as sold
        </Button>
      </>
    ) : (
      <Button size={size} disabled={sold} onClick={openOffer}>
        Make an offer
      </Button>
    )

  return (
    <PageShell chapter={`Listing, ${primary}`} title={null} className="pb-36 lg:pb-20">
      <div className="mt-5 grid gap-8 sm:mt-6 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-14">
        {/* Left page: the photos */}
        <div className="lg:col-span-7">
          <ImageGallery
            listing={listing}
            overlay={
              sold && (
                <span className="absolute inset-0 grid place-items-center bg-paper-50/40">
                  <Stamp
                    status="sold"
                    size="lg"
                    animate={justSold}
                    className="bg-paper-50/80 px-5 text-h2"
                  />
                </span>
              )
            }
          />
        </div>

        {/* Right page: the facts and the actions, sticky from lg */}
        <div className="lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1">
          <div className="flex flex-col gap-5 lg:sticky lg:top-6">
            <ul className="flex flex-wrap gap-1.5" aria-label="Courses">
              {listing.courseCodes.map((code) => (
                <li key={code}>
                  <CourseTab code={code} asLink />
                </li>
              ))}
            </ul>

            <div>
              <h1 className="font-serif text-h1-sm font-semibold tracking-tight text-ink-900 sm:text-h1">
                {listing.title}
              </h1>
              <div className="mt-2 text-small text-ink-500">
                <p>{CATEGORIES[listing.category]?.label}</p>
                {byline && <p>{byline}</p>}
                {listing.isbn && <p>ISBN {listing.isbn}</p>}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
              <PriceTag
                cents={listing.priceCents}
                retailCents={listing.retailCents}
                size="lg"
                footnoteId="retail"
                showSavings={false}
              />
              {status === 'reserved' && <Stamp status="reserved" />}
              {!sold && (
                <p className="pb-1 font-medium text-ink-700">
                  {listing.openToOffers ? 'Open to offers' : 'Firm price'}
                </p>
              )}
            </div>

            <StatusNote status={status} isOwner={isOwner} />

            <div className="hidden flex-col gap-3 lg:flex">{actions('lg')}</div>

            {!isOwner && (
              <div>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  aria-expanded={contactOpen}
                  aria-controls={contactId}
                  onClick={() => !needSignIn() && setContactOpen((o) => !o)}
                >
                  Contact seller
                </Button>
                <div id={contactId} hidden={!contactOpen} className="mt-3 text-small">
                  <p className="text-ink-700">
                    Messages aren&apos;t built yet. Email {listing.seller.name} at{' '}
                    <a href={`mailto:${listing.seller.email}`}>{listing.seller.email}</a>,
                    or put a note in your offer.
                  </p>
                </div>
              </div>
            )}

            <SellerBlock
              seller={listing.seller}
              activeCount={activeCount}
              pickupSpot={listing.pickupSpot}
            />

            {under != null && (
              <Footnote id="retail">
                New at the bookstore: {formatPrice(listing.retailCents)}. You save{' '}
                {formatPrice(listing.retailCents - listing.priceCents)}.
              </Footnote>
            )}
          </div>
        </div>

        {/* Left page, continued: description and condition report */}
        <div className="flex flex-col gap-12 lg:col-span-7">
          <section aria-labelledby="description-heading">
            <SectionHeading title="From the seller" id="description-heading" />
            <div className="mt-5 flex flex-col gap-4 xl:grid xl:grid-cols-3 xl:gap-8">
              <p className="font-serif text-reading whitespace-pre-line text-ink-900 xl:col-span-2">
                {listing.description ||
                  'No description. The condition report has the details.'}
              </p>
              <div className="flex flex-col gap-4 xl:border-l xl:border-dotted xl:border-graphite xl:pl-6">
                <MarginNote
                  tone="pen"
                  className="lg:static lg:ml-0 lg:w-auto lg:max-w-full lg:rotate-0 lg:border-l lg:pl-3 xl:-rotate-1 xl:border-0 xl:pl-0"
                >
                  Can meet at the {listing.pickupSpot.toLowerCase()}.
                </MarginNote>
                {under != null && (
                  <MarginNote className="lg:static lg:ml-0 lg:w-auto lg:max-w-full lg:rotate-0 lg:border-l lg:pl-3 xl:rotate-1 xl:border-0 xl:pl-0">
                    {under}% under the bookstore price.
                  </MarginNote>
                )}
              </div>
            </div>
          </section>
          <ConditionReport listing={listing} />
        </div>
      </div>

      <RelatedShelf code={primary} listings={relatedItems} loading={related.loading} />

      {/* Phones and tablets: price and the main action under the thumb */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-paper-400 bg-paper-50 px-4 pt-3 lg:hidden"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-page items-center gap-4">
          <PriceTag cents={listing.priceCents} size="md" showSavings={false} />
          <div className="ml-auto flex gap-2">{actions('md')}</div>
        </div>
      </div>

      <OfferDialog
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        listing={listing}
        onSubmit={sendOffer}
      />

      <Dialog
        open={confirmSold}
        onClose={() => setConfirmSold(false)}
        title="Mark this as sold?"
      >
        <p className="mt-2 text-ink-700">
          “{listing.title}” gets a Sold stamp and stops taking offers. You can&apos;t undo
          this.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmSold(false)}>
            Keep it listed
          </Button>
          <Button onClick={markSold} disabled={marking}>
            {marking ? 'Saving…' : 'Mark as sold'}
          </Button>
        </div>
      </Dialog>
    </PageShell>
  )
}
