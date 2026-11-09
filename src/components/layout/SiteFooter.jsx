import { Link, useMatches } from 'react-router'
import { ReadingLight } from './ReadingLight'

/**
 * Footer with the folio: the page number from the current route's `handle.folio` (see app/router.jsx).
 * Also holds the "Reading light" setting (section 10), as does the mobile menu.
 */
export function SiteFooter() {
  const matches = useMatches()
  const folio = [...matches].reverse().find((m) => m.handle?.folio != null)?.handle.folio

  return (
    <footer className="mt-auto border-t border-paper-300">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-6 sm:px-8">
        <p className="text-small text-ink-500">
          Probable Books. Used course gear, from students, by course code.
        </p>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-6 gap-y-1 text-small"
        >
          <Link
            to="/browse"
            className="flex min-h-11 items-center text-ink-700 hover:text-ink-900"
          >
            Browse
          </Link>
          <Link
            to="/sell"
            className="flex min-h-11 items-center text-ink-700 hover:text-ink-900"
          >
            Sell something
          </Link>
          {folio != null && (
            <span className="font-serif text-ink-500 italic">p. {folio}</span>
          )}
        </nav>
        <ReadingLight className="w-full" />
      </div>
    </footer>
  )
}
