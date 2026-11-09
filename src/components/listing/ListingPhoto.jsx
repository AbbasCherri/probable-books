import { useState } from 'react'
import { BookOpen, Calculator, FlaskConical, Package } from 'lucide-react'
import { CATEGORIES } from '@/lib/constants'
import { cn } from '@/lib/cn'

/** Line icon per listing category (lucide, 1.5 stroke). */
export const CATEGORY_ICONS = {
  textbook: BookOpen,
  calculator: Calculator,
  lab_gear: FlaskConical,
  other: Package,
}

/**
 * A listing's cover photo at 4:3, or, when there is none (or it fails to load), a ruled index
 * card showing the category and title. Never a grey box (section 3).
 *   <ListingPhoto listing={l} />
 *   <ListingPhoto listing={l} compact className="w-20" />   small thumbs (ledger rows)
 * compact: under about 8rem wide the title would clip, so the index card shows the category's
 * icon on ruled lines instead. Decorative either way (aria-hidden): the title is printed next to it.
 */
export function ListingPhoto({
  listing,
  compact = false,
  className,
  loading = 'lazy',
  sizes,
}) {
  const photo = listing.photos?.[0]
  const [brokenUrl, setBrokenUrl] = useState(null)
  const broken = photo && brokenUrl === photo.url

  if (photo && !broken) {
    return (
      <img
        src={photo.url}
        alt={photo.alt ?? ''}
        loading={loading}
        sizes={sizes}
        onError={() => setBrokenUrl(photo.url)}
        className={cn('aspect-4/3 w-full bg-paper-200 object-cover', className)}
      />
    )
  }

  if (compact) {
    const Icon = CATEGORY_ICONS[listing.category] ?? Package
    return (
      <div
        aria-hidden="true"
        className={cn(
          'relative grid aspect-4/3 w-full place-items-center overflow-hidden bg-paper-50 ruled',
          className,
        )}
      >
        <span className="grid size-8 place-items-center rounded-paper bg-paper-50">
          <Icon strokeWidth={1.5} className="size-5 text-ink-500" />
        </span>
      </div>
    )
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex aspect-4/3 w-full flex-col justify-center gap-1 overflow-hidden bg-paper-50 p-2 sm:gap-2 sm:p-3',
        className,
      )}
    >
      <span className="text-caption font-semibold text-ink-500">
        {CATEGORIES[listing.category]?.label ?? 'Listing'}
      </span>
      <span className="line-clamp-2 border-b border-paper-300 pb-1 font-serif text-small leading-snug text-ink-700">
        {listing.title}
      </span>
      <span className="border-b border-paper-300 pt-2" />
      <span className="w-3/4 border-b border-paper-300 pt-2" />
    </div>
  )
}
