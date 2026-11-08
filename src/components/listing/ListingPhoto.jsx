import { useState } from 'react'
import { CATEGORIES } from '@/lib/constants'
import { cn } from '@/lib/cn'

/**
 * A listing's cover photo at 4:3, or, when there is none (or it fails to load), a ruled index
 * card showing the category and title. Never a grey box (section 3).
 */
export function ListingPhoto({ listing, className, loading = 'lazy', sizes }) {
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

  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex aspect-4/3 w-full flex-col justify-center gap-2 bg-paper-50 px-[8%] py-[6%]',
        className,
      )}
    >
      <span className="text-xs font-semibold text-ink-500">
        {CATEGORIES[listing.category]?.label ?? 'Listing'}
      </span>
      <span className="line-clamp-2 border-b border-paper-300 pb-1 font-serif text-sm leading-snug text-ink-700">
        {listing.title}
      </span>
      <span className="border-b border-paper-300 pt-2" />
      <span className="w-3/4 border-b border-paper-300 pt-2" />
    </div>
  )
}
