import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ListingPhoto } from '@/components/listing/ListingPhoto'
import { cn } from '@/lib/cn'

// A horizontal drag this long (in px, and longer than it is tall) changes photo.
const SWIPE_PX = 40

const stepButton =
  'absolute top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-paper border border-ink-900 bg-paper-50 text-ink-900 transition-colors duration-150 ease-out hover:bg-paper-200 sm:grid'

/** Two strips of tape on the main photo's top corners (doc 3, imagery). Decorative. */
function Tape() {
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute -top-2.5 -left-3 z-10 hidden h-6 w-16 -rotate-12 border border-paper-300 bg-paper-50/75 sm:block"
      />
      <span
        aria-hidden="true"
        className="absolute -top-2.5 -right-3 z-10 hidden h-6 w-16 rotate-12 border border-paper-300 bg-paper-50/75 sm:block"
      />
    </>
  )
}

/**
 * The listing's photos (doc 5.3). Phones: the photo runs edge to edge, swipes, and shows a
 * row of position dots (44px buttons). From sm the main photo is taped down, with Previous and
 * Next over it and thumbnails under it. Arrow keys, Home and End move between photos while
 * focus is in the gallery; only the current dot or thumbnail is in the tab order.
 * 0 photos: the ruled index card. 1 photo: no controls. `overlay` sits over the main photo.
 */
export function ImageGallery({ listing, overlay, className }) {
  const count = listing.photos?.length ?? 0
  const photos = (listing.photos ?? []).map((p, i) => ({
    url: p.url,
    alt: p.alt?.trim() || `${listing.title}, photo ${i + 1} of ${count}`,
  }))
  const [index, setIndex] = useState(0)
  const touch = useRef(null)
  const root = useRef(null)
  const current = Math.min(index, Math.max(count - 1, 0))
  const many = count > 1

  // `row` is the dots or thumbnails list the key was pressed in: focus follows into it.
  function go(i, row) {
    const next = (i + count) % count
    setIndex(next)
    row?.querySelector(`[data-photo="${next}"]`)?.focus()
  }

  function onKeyDown(e) {
    if (!many) return
    const keys = {
      ArrowRight: current + 1,
      ArrowLeft: current - 1,
      Home: 0,
      End: count - 1,
    }
    if (!(e.key in keys)) return
    e.preventDefault()
    go(keys[e.key], e.target.closest?.('[data-photo]')?.closest('ul'))
  }

  const shown = count ? { ...listing, photos: [photos[current]] } : listing

  const pick = (i) => ({
    type: 'button',
    'data-photo': i,
    tabIndex: i === current ? 0 : -1,
    'aria-current': i === current ? 'true' : undefined,
    onClick: () => setIndex(i),
  })

  return (
    <div
      ref={root}
      data-testid="gallery"
      role="group"
      aria-label={many ? `Photos, ${count}` : 'Photo'}
      onKeyDown={onKeyDown}
      className={cn('-mx-4 sm:mx-0', className)}
    >
      <div
        data-testid="gallery-stage"
        className="relative sm:mt-2"
        onTouchStart={(e) => {
          const t = e.touches[0]
          touch.current = { x: t.clientX, y: t.clientY }
        }}
        onTouchEnd={(e) => {
          const start = touch.current
          touch.current = null
          if (!start || !many) return
          const t = e.changedTouches[0]
          const dx = t.clientX - start.x
          const dy = t.clientY - start.y
          if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy))
            go(current + (dx < 0 ? 1 : -1))
        }}
      >
        <Tape />
        <div className="overflow-hidden border-y border-paper-400 bg-paper-50 sm:rounded-paper sm:border sm:shadow-stack">
          <ListingPhoto
            listing={shown}
            loading="eager"
            sizes="(min-width: 64rem) 40rem, 100vw"
          />
        </div>
        {overlay}
        {many && (
          <>
            <button
              type="button"
              onClick={() => go(current - 1)}
              className={cn(stepButton, 'left-3')}
            >
              <ChevronLeft strokeWidth={1.5} aria-hidden="true" className="size-5" />
              <span className="sr-only">Previous photo</span>
            </button>
            <button
              type="button"
              onClick={() => go(current + 1)}
              className={cn(stepButton, 'right-3')}
            >
              <ChevronRight strokeWidth={1.5} aria-hidden="true" className="size-5" />
              <span className="sr-only">Next photo</span>
            </button>
          </>
        )}
      </div>

      {many && (
        <>
          <p aria-live="polite" className="sr-only">
            Photo {current + 1} of {count}: {photos[current].alt}
          </p>

          {/* Phones: position dots, each a 44px button. */}
          <ul className="mt-1 flex justify-center gap-1 sm:hidden">
            {photos.map((p, i) => (
              <li key={i}>
                <button {...pick(i)} className="group grid size-11 place-items-center">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-2.5 rounded-full border border-ink-700 transition-colors duration-150 ease-out',
                      i === current ? 'bg-ink-700' : 'group-hover:bg-paper-300',
                    )}
                  />
                  <span className="sr-only">
                    Show photo {i + 1} of {count}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* sm and up: thumbnails. */}
          <ul
            data-testid="gallery-thumbs"
            className="mt-4 hidden flex-wrap gap-3 sm:flex"
          >
            {photos.map((p, i) => (
              <li key={i} className="w-20">
                <button
                  {...pick(i)}
                  className={cn(
                    'block w-full overflow-hidden rounded-paper border-2 bg-paper-50 transition-colors duration-150 ease-out',
                    i === current
                      ? 'border-ink-900'
                      : 'border-paper-300 hover:border-ink-500',
                  )}
                >
                  <img
                    src={p.url}
                    alt=""
                    loading="lazy"
                    className="aspect-4/3 w-full object-cover"
                  />
                  <span className="sr-only">
                    Show photo {i + 1} of {count}
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
