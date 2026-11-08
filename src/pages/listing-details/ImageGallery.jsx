import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ListingPhoto } from '@/components/listing/ListingPhoto'
import { cn } from '@/lib/cn'

const SWIPE_PX = 40

const navBtn =
  'absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-paper border border-ink-900 bg-paper-50 text-ink-900 transition-colors duration-150 ease-out hover:bg-paper-200'

/** Two strips of tape on the main photo's top corners. Decorative. */
function Tape() {
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute -top-2 -left-3 hidden h-6 w-16 -rotate-12 border border-paper-300 bg-paper-50/75 sm:block"
      />
      <span
        aria-hidden="true"
        className="absolute -top-2 -right-3 hidden h-6 w-16 rotate-12 border border-paper-300 bg-paper-50/75 sm:block"
      />
    </>
  )
}

/**
 * The listing's photos (section 5.3). Phones get the photo edge to edge with swipe and
 * position dots; from sm the main photo is taped down with thumbnails under it.
 * Left and right arrow keys move between photos while the gallery has focus.
 * `overlay` sits over the main photo (the SOLD stamp).
 */
export function ImageGallery({ listing, overlay }) {
  const photos = listing.photos ?? []
  const [index, setIndex] = useState(0)
  const touchX = useRef(null)
  const count = photos.length
  const current = Math.min(index, Math.max(count - 1, 0))

  const go = (i) => setIndex((i + count) % count)

  function onKeyDown(e) {
    if (count < 2) return
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(current + 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(current - 1)
    }
  }

  // The main photo shows the current photo; ListingPhoto falls back to a ruled index card.
  const shown = count ? { ...listing, photos: [photos[current]] } : listing

  return (
    <div
      role="group"
      aria-roledescription="gallery"
      aria-label={count > 1 ? `Photos, use arrow keys to move` : 'Photo'}
      tabIndex={count > 1 ? 0 : undefined}
      onKeyDown={onKeyDown}
      className="-mx-4 sm:mx-0"
    >
      <div
        className="relative sm:mt-2"
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          if (touchX.current == null || count < 2) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > SWIPE_PX) go(current + (dx < 0 ? 1 : -1))
          touchX.current = null
        }}
      >
        <Tape />
        <div className="overflow-hidden border-y border-paper-400 bg-paper-50 sm:rounded-paper sm:border sm:shadow-stack">
          <ListingPhoto listing={shown} loading="eager" />
        </div>
        {overlay}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(current - 1)}
              className={cn(navBtn, 'left-2 hidden sm:grid')}
            >
              <ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" />
              <span className="sr-only">Previous photo</span>
            </button>
            <button
              type="button"
              onClick={() => go(current + 1)}
              className={cn(navBtn, 'right-2 hidden sm:grid')}
            >
              <ChevronRight size={20} strokeWidth={1.5} aria-hidden="true" />
              <span className="sr-only">Next photo</span>
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <>
          <p aria-live="polite" className="sr-only">
            Photo {current + 1} of {count}: {photos[current].alt}
          </p>

          {/* Phone: position dots. Swiping and arrow keys do the moving. */}
          <div aria-hidden="true" className="mt-3 flex justify-center gap-2 sm:hidden">
            {photos.map((p, i) => (
              <span
                key={p.url}
                className={cn(
                  'size-2 rounded-full border border-ink-700',
                  i === current && 'bg-ink-700',
                )}
              />
            ))}
          </div>

          <ul className="mt-4 hidden gap-3 sm:flex">
            {photos.map((p, i) => (
              <li key={p.url} className="w-20">
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-current={i === current ? 'true' : undefined}
                  className={cn(
                    'block w-full overflow-hidden rounded-paper border transition-colors duration-150 ease-out',
                    i === current
                      ? 'border-2 border-ink-900'
                      : 'border-paper-400 hover:border-ink-500',
                  )}
                >
                  <img
                    src={p.url}
                    alt=""
                    loading="lazy"
                    className="aspect-4/3 w-full object-cover"
                  />
                  <span className="sr-only">
                    Show photo {i + 1}
                    {p.alt ? `: ${p.alt}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
