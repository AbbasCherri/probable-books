import { cn } from '@/lib/cn'

/**
 * 4:3 thumbnail for ledger rows and cards. With no photo it draws a small
 * ruled index card instead of a grey box (section 3, Icons and imagery).
 */
export function ListingThumb({ listing, className }) {
  const photo = listing.photos?.[0]
  if (photo) {
    return (
      <img
        src={photo.url}
        alt=""
        loading="lazy"
        className={cn(
          'aspect-4/3 shrink-0 rounded-paper border border-paper-400 object-cover',
          className,
        )}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex aspect-4/3 shrink-0 flex-col justify-center gap-1.5 rounded-paper border border-paper-400 bg-paper-50 px-2',
        className,
      )}
    >
      <span className="border-t border-paper-300" />
      <span className="w-3/4 border-t border-paper-300" />
      <span className="w-1/2 border-t border-paper-300" />
    </span>
  )
}
