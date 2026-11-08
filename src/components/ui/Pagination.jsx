import { Link } from 'react-router'
import { cn } from '@/lib/cn'

const ITEM =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-paper px-2 text-ink-900 no-underline transition-colors duration-150 ease-out hover:bg-paper-200'

/** Page numbers to show: first, last, current and its neighbours; null marks a gap. */
function getWindow(page, pageCount) {
  const wanted = new Set([1, pageCount, page - 1, page, page + 1])
  const numbers = [...wanted]
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b)
  const items = []
  numbers.forEach((n, i) => {
    const prev = numbers[i - 1]
    if (prev !== undefined && n - prev === 2) items.push(prev + 1)
    else if (prev !== undefined && n - prev > 2) items.push(null)
    items.push(n)
  })
  return items
}

/**
 * Folio-style page links (section 4). Each page is a real link, so Back and shared URLs work.
 *   <Pagination page={2} pageCount={9} buildHref={(n) => `?page=${n}`} />
 * Renders nothing for a single page. Previous and Next are omitted at the ends.
 */
export function Pagination({ page, pageCount, buildHref, className }) {
  if (!pageCount || pageCount <= 1) return null

  const items = getWindow(page, pageCount)

  return (
    <nav aria-label="Pagination" className={cn('font-serif text-ink-900', className)}>
      <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-x-1 p-0">
        {page > 1 && (
          <li>
            <Link
              to={buildHref(page - 1)}
              rel="prev"
              className={cn(ITEM, 'px-3 font-sans')}
            >
              Previous
            </Link>
          </li>
        )}
        <li
          aria-hidden="true"
          className="inline-flex min-h-11 items-center px-1 text-ink-500 italic"
        >
          p.
        </li>
        {items.map((n, i) =>
          n === null ? (
            <li
              key={`gap-${i}`}
              aria-hidden="true"
              className="inline-flex min-h-11 min-w-6 items-center justify-center text-ink-500"
            >
              ...
            </li>
          ) : (
            <li key={n}>
              <Link
                to={buildHref(n)}
                aria-label={n === page ? undefined : `Page ${n}`}
                aria-current={n === page ? 'page' : undefined}
                className={cn(
                  ITEM,
                  n === page &&
                    'bg-hl-yellow font-semibold text-on-mark underline underline-offset-4 hover:bg-hl-yellow',
                )}
              >
                {n}
              </Link>
            </li>
          ),
        )}
        {page < pageCount && (
          <li>
            <Link
              to={buildHref(page + 1)}
              rel="next"
              className={cn(ITEM, 'px-3 font-sans')}
            >
              Next
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
