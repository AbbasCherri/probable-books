import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ConditionGrade } from '@/components/annotate/ConditionGrade'
import { CourseTab } from '@/components/annotate/CourseTab'
import { Footnote } from '@/components/annotate/Footnote'
import { Highlight } from '@/components/annotate/Highlight'
import { MarginNote } from '@/components/annotate/MarginNote'
import { Stamp } from '@/components/annotate/Stamp'
import { PageShell } from '@/components/layout/PageShell'
import { SectionHeading } from '@/components/layout/SectionHeading'
import { PriceTag } from '@/components/listing/PriceTag'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'
import { CATEGORIES } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { codeToSlug } from '@/lib/courses'
import { formatPrice, percentUnderRetail } from '@/lib/format'
import { bylineFor } from '@/lib/listings'
import * as api from '@/services/api'
import { ConditionReport } from './ConditionReport'
import { ImageGallery } from './ImageGallery'
import { ListingSkeleton } from './ListingSkeleton'
import { LoadError } from './LoadError'
import { MarkSoldDialog } from './MarkSoldDialog'
import { OfferDialog } from './OfferDialog'
import { RelatedShelf } from './RelatedShelf'
import { SellerBlock } from './SellerBlock'
import { endSentence } from './sentence'
import { TornOut } from './TornOut'
import { useFitsViewport } from './useFitsViewport'
import './listingDetails.css'

const RELATED_MAX = 12
// Offers that still tie this buyer to the listing (a new offer would be refused).
const OPEN_OFFER = ['pending', 'countered', 'accepted']

/**
 * Whether a buyer can make an offer, and the one sentence that explains the page's state
 * (doc 5.3: "actions disabled and a sentence explaining why").
 */
function offerState({ listing, status, isOwner, myOffer, signedIn }) {
  const seller = listing.seller?.name ?? 'The seller'
  const price = formatPrice(listing.priceCents)
  if (isOwner) {
    const owner = {
      sold: 'You marked this sold. Its page stays up so old links still work.',
      reserved: 'You accepted an offer. Mark it sold once you have handed it over.',
      draft: 'Draft. Only you can see this until you publish it.',
    }
    return { canOffer: false, sentence: owner[status] ?? null }
  }
  if (status === 'sold')
    return {
      canOffer: false,
      sentence:
        'This sold, so it can’t take offers. Its page stays up so old links still work.',
    }
  if (myOffer?.status === 'accepted')
    return {
      canOffer: false,
      sentence: `${seller} accepted your ${formatPrice(myOffer.amountCents)} offer, so it is reserved for you. Email them to arrange the pickup.`,
    }
  if (status === 'reserved')
    return {
      canOffer: false,
      sentence: `${seller} accepted an offer and is holding it for that buyer. If the sale falls through it comes back, and so do offers.`,
    }
  if (!listing.openToOffers)
    return {
      canOffer: false,
      sentence: `Firm price: ${seller} isn’t taking offers. ${signedIn ? 'Email them' : 'Sign in to email them'} to buy it at ${price}.`,
    }
  if (myOffer) return { canOffer: false, sentence: null }
  return { canOffer: true, sentence: null }
}

export default function ListingDetailsPage() {
  const { listingId } = useParams()
  const { user, ready } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const reasonId = useId()
  const offerNoteId = useId()

  const listingReq = useAsync(() => api.getListing(listingId), [listingId])
  const { data, error, retry } = listingReq
  // A signed-in visitor's own sent offers, fetched alongside the listing so the page never
  // shows Make an offer enabled and then takes it back. If this fails the page carries on;
  // makeOffer() still refuses a second offer.
  const mine = useAsync(
    () =>
      user ? api.getOffers({ direction: 'sent' }).catch(() => []) : Promise.resolve(null),
    [user?.id, listingId],
  )
  const loading = listingReq.loading || !ready || mine.loading

  // Changes made on this page, tagged with the listing id so they reset on navigation.
  const [soldId, setSoldId] = useState(null)
  const [sent, setSent] = useState(null) // { listingId, status, amountCents }
  const [offerOpen, setOfferOpen] = useState(false)
  const [confirmSold, setConfirmSold] = useState(false)
  // Where focus goes once the next render settles: 'title' | 'reason' | 'offer'.
  const [focusTo, setFocusTo] = useState(null)
  const [panel, setPanel] = useState(null)
  const panelFits = useFitsViewport(panel)
  const titleRef = useRef(null)
  const reasonRef = useRef(null)
  const offerNoteRef = useRef(null)

  const primary = data?.courseCodes?.[0]
  const isOwner = Boolean(user && data && user.id === data.sellerId)

  const related = useAsync(
    () =>
      primary
        ? api.getListings({ courses: [primary], pageSize: RELATED_MAX * 2 })
        : Promise.resolve(null),
    [primary],
  )

  const notFound = error?.status === 404
  useDocumentTitle(
    data?.title ??
      (notFound ? 'Page torn out' : error ? 'Listing did not load' : 'Listing'),
  )

  // Runs after child effects, so it wins over a Dialog handing focus back to its trigger.
  useEffect(() => {
    if (!focusTo) return
    const target = { title: titleRef, reason: reasonRef, offer: offerNoteRef }[focusTo]
    if (target?.current) {
      target.current.focus()
      setFocusTo(null)
    }
  }, [focusTo, loading, data])

  if (loading) return <ListingSkeleton />
  if (notFound) return <TornOut />
  if (error)
    return (
      <LoadError
        onRetry={() => {
          setFocusTo('title')
          retry()
        }}
      />
    )

  const listing = data
  const justSold = soldId === listing.id
  const status = justSold ? 'sold' : listing.status
  const sold = status === 'sold'
  const myOffer =
    (sent?.listingId === listing.id && sent) ||
    (mine.data ?? [])
      .filter((o) => o.listingId === listing.id && OPEN_OFFER.includes(o.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  const { canOffer, sentence } = offerState({
    listing,
    status,
    isOwner,
    myOffer,
    signedIn: Boolean(user),
  })
  const byline = bylineFor(listing)
  const under = percentUnderRetail(listing.priceCents, listing.retailCents)
  const relatedItems = (related.data?.items ?? [])
    .filter((l) => l.id !== listing.id && l.status === 'active')
    .slice(0, RELATED_MAX)
  const seller = listing.seller

  function openOffer() {
    if (!user) {
      navigate('/login', { state: { from: location } })
      return
    }
    setOfferOpen(true)
  }

  function offerSent(offer, { amountCents }) {
    setOfferOpen(false)
    setSent({
      listingId: listing.id,
      status: offer?.status ?? 'pending',
      amountCents: offer?.amountCents ?? amountCents,
    })
    setFocusTo('offer')
    toast(
      `Offer of ${formatPrice(amountCents)} sent to ${endSentence(seller?.name ?? 'the seller')} Track it in your dashboard.`,
    )
  }

  async function markSold() {
    await api.updateListing(listing.id, { status: 'sold' })
    setSoldId(listing.id)
    setConfirmSold(false)
    setFocusTo('reason')
    toast('Marked as sold. Nice one.')
  }

  // The "You offered" note, when an offer of yours already waiting is what blocks a new one.
  const showOfferNote = !isOwner && myOffer && myOffer.status !== 'accepted'
  const offerReason = sentence ? reasonId : showOfferNote ? offerNoteId : undefined

  const actions = (size, className) =>
    isOwner ? (
      <>
        <Button
          as={Link}
          to={`/listings/${listing.id}/edit`}
          variant="outline"
          size={size}
          className={className}
        >
          Edit listing
        </Button>
        {status !== 'draft' && (
          <Button
            size={size}
            className={className}
            disabled={sold}
            aria-describedby={sentence ? reasonId : undefined}
            onClick={() => setConfirmSold(true)}
          >
            Mark as sold
          </Button>
        )}
      </>
    ) : (
      <Button
        size={size}
        className={className}
        disabled={!canOffer}
        aria-describedby={offerReason}
        onClick={openOffer}
      >
        Make an offer
      </Button>
    )

  // Nothing left to arrange once it sold; a reserved listing keeps contact for its buyer.
  const contact =
    isOwner || sold ? null : user && seller?.email ? (
      <>
        <Button
          as="a"
          href={`mailto:${seller.email}`}
          variant="outline"
          className="w-full"
        >
          Contact seller
        </Button>
        <p className="mt-2 text-small break-all text-ink-500">
          Or write to <span className="text-ink-900">{seller.email}</span>
        </p>
      </>
    ) : (
      <p className="text-small text-ink-700">
        <Link to="/login" state={{ from: location }}>
          Sign in
        </Link>{' '}
        to see {seller?.name ?? 'the seller'}&rsquo;s email and contact them.
      </p>
    )

  return (
    <PageShell chapter={`Listing, ${primary}`} title={null} className="pb-0 lg:pb-20">
      <div className="mt-5 grid grid-cols-1 gap-8 sm:mt-6 lg:grid-cols-12 lg:gap-x-0 lg:gap-y-14">
        {/* Left page: the photos. */}
        <div className="min-w-0 lg:col-span-7 lg:pr-12">
          <ImageGallery
            listing={listing}
            overlay={
              sold && (
                <span className="pointer-events-none absolute inset-0 grid place-items-center">
                  <Stamp
                    status="sold"
                    size="lg"
                    animate={justSold}
                    className="bg-paper-50/90 px-5 text-h2"
                  />
                </span>
              )
            }
          />
        </div>

        {/* Right page: the facts and the actions; sticky from lg when it fits the screen. */}
        <div className="min-w-0 lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:border-l lg:border-paper-300 lg:pl-12">
          <div
            ref={setPanel}
            className={cn('flex flex-col gap-5', panelFits && 'lg:sticky lg:top-6')}
          >
            <ul aria-label="Courses" className="-mb-2 flex flex-wrap gap-x-2">
              {listing.courseCodes.map((code) => (
                <li key={code}>
                  <Link
                    to={`/courses/${codeToSlug(code)}`}
                    className="group inline-flex min-h-11 min-w-11 items-end no-underline"
                  >
                    <CourseTab code={code} className="group-hover:underline" />
                  </Link>
                </li>
              ))}
            </ul>

            <div>
              <h1
                ref={titleRef}
                tabIndex={-1}
                className="font-serif text-h1-sm font-semibold tracking-tight break-words text-ink-900 outline-none sm:text-h1"
              >
                {listing.title}
              </h1>
              <div className="mt-2 text-small text-ink-500">
                {byline ? (
                  <p className="break-words">{byline}</p>
                ) : (
                  <p>{CATEGORIES[listing.category]?.label}</p>
                )}
                {listing.isbn && <p>ISBN {listing.isbn}</p>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <PriceTag
                cents={listing.priceCents}
                retailCents={listing.retailCents}
                size="lg"
                footnoteId="retail"
                showSavings={false}
              />
              <ConditionGrade condition={listing.condition} />
              {status === 'reserved' && <Stamp status="reserved" />}
            </div>

            {under != null && (
              <Footnote id="retail" className="-mt-1">
                New at the bookstore: {formatPrice(listing.retailCents)}. You save{' '}
                {formatPrice(listing.retailCents - listing.priceCents)}.
              </Footnote>
            )}

            {!sold && status !== 'draft' && (
              <p className="font-semibold text-ink-900">
                {listing.openToOffers ? (
                  <Highlight color="green">Open to offers</Highlight>
                ) : (
                  'Firm price'
                )}
              </p>
            )}

            {sentence && (
              <p
                id={reasonId}
                ref={reasonRef}
                tabIndex={-1}
                className="border-l-2 border-ink-300 pl-3 text-ink-700 outline-none"
              >
                {sentence}
              </p>
            )}

            {showOfferNote && (
              <p
                id={offerNoteId}
                ref={offerNoteRef}
                tabIndex={-1}
                className="rounded-paper border border-pen-600 bg-pen-50 px-4 py-3 text-ink-900 outline-none"
              >
                You offered{' '}
                <span className="font-semibold text-pen-600">
                  {formatPrice(myOffer.amountCents)}
                </span>
                {myOffer.status === 'countered' && myOffer.counterCents
                  ? ` and ${seller?.name ?? 'the seller'} countered with ${formatPrice(myOffer.counterCents)}. `
                  : `. ${seller?.name ?? 'The seller'} can accept, counter or decline it. `}
                <Link to="/dashboard?tab=sent">See offers you sent</Link>
              </p>
            )}

            <div className="hidden flex-col gap-3 lg:flex">{actions('lg')}</div>

            <SellerBlock
              seller={seller}
              pickupSpot={listing.pickupSpot}
              contact={contact}
            />
          </div>
        </div>

        {/* Left page, continued: the description with its margin notes, then the condition. */}
        <div className="flex min-w-0 flex-col gap-12 lg:col-span-7 lg:pr-12">
          <section aria-labelledby="description-heading">
            <SectionHeading title="From the seller" id="description-heading" />
            <div className="mt-5 flex flex-col gap-5 xl:grid xl:grid-cols-3 xl:gap-8">
              <p
                data-testid="description"
                className="font-serif text-reading break-words whitespace-pre-line text-ink-900 xl:col-span-2"
              >
                {listing.description ||
                  'No description from the seller. The condition report has the details.'}
              </p>
              <div className="flex flex-col gap-4 xl:border-l xl:border-dotted xl:border-graphite xl:pl-6">
                {/* Margin notes repeat facts printed elsewhere (pickup, the footnote). */}
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

      {/* Below lg: the price and the main action stay under the thumb. */}
      <div
        data-testid="action-bar"
        className="listing-action-bar sticky bottom-0 z-20 -mx-4 mt-12 border-t border-paper-400 bg-paper-50 px-4 pt-3 sm:-mx-8 sm:px-8 lg:hidden"
      >
        {isOwner ? (
          // Owners know the price: phones drop it so both actions stay on one row.
          <div className="flex items-center gap-3">
            <PriceTag
              cents={listing.priceCents}
              size="md"
              showSavings={false}
              className="hidden sm:flex"
            />
            <div className="flex flex-1 gap-2 sm:ml-auto sm:flex-none">
              {actions('md', 'flex-1 sm:flex-none')}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <PriceTag cents={listing.priceCents} size="md" showSavings={false} />
            <div className="ml-auto flex gap-2">{actions('md')}</div>
          </div>
        )}
      </div>

      {!isOwner && canOffer && (
        <OfferDialog
          open={offerOpen}
          onClose={() => setOfferOpen(false)}
          listing={listing}
          onSubmit={(offer) => api.makeOffer(listing.id, offer)}
          onSent={offerSent}
        />
      )}
      {isOwner && (
        <MarkSoldDialog
          open={confirmSold}
          onClose={() => setConfirmSold(false)}
          title={listing.title}
          onConfirm={markSold}
        />
      )}
    </PageShell>
  )
}
