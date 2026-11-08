import { useCallback } from 'react'
import { ListingCard } from '@/components/listing/ListingCard'

/**
 * The live card, labelled "How buyers see it". It's a picture of the card, so it is
 * made inert: no tabbing into it and no clicking through to a listing that doesn't exist yet.
 */
export function ListingPreview({ listing, hint }) {
  // Set via the DOM so it works the same on React 18 and 19.
  const inertRef = useCallback((el) => {
    if (el) el.setAttribute('inert', '')
  }, [])

  return (
    <div className="flex flex-col gap-3.5">
      <p className="-rotate-1 font-hand text-lg leading-snug text-graphite">
        How buyers see it
      </p>
      <div ref={inertRef}>
        <ListingCard listing={listing} variant="card" />
      </div>
      {hint && (
        <p className="mt-4 -rotate-1 font-hand text-lg leading-snug text-graphite">
          {hint}
        </p>
      )}
    </div>
  )
}
