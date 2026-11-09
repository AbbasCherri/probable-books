import { Link } from 'react-router'
import { PageShell } from '@/components/layout/PageShell'
import { pageTitleClass } from '@/components/layout/pageTitle'
import { Button } from '@/components/ui/Button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

// Ragged bottom edge of the sheet: x,y pairs across a 0-100 wide, 0-12 tall box.
const TEAR = [
  [0, 0],
  [4, 7],
  [9, 3],
  [13, 10],
  [18, 4],
  [23, 8],
  [27, 2],
  [32, 9],
  [37, 5],
  [41, 11],
  [46, 3],
  [51, 8],
  [55, 4],
  [60, 10],
  [65, 2],
  [69, 7],
  [74, 4],
  [79, 11],
  [83, 5],
  [88, 9],
  [92, 3],
  [96, 8],
  [100, 4],
]
const EDGE = TEAR.map(([x, y]) => `${x},${y}`).join(' ')

function TornEdge() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 12"
      preserveAspectRatio="none"
      className="block h-4 w-full"
    >
      <polygon points={`0,0 ${EDGE} 100,0`} className="fill-paper-50" />
      <polyline
        points={EDGE}
        vectorEffect="non-scaling-stroke"
        className="fill-none stroke-paper-400"
      />
    </svg>
  )
}

/** Not found (section 5.9): a page torn out of the book, with the way back. */
export default function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <PageShell chapter="Not found" title={null}>
      <div className="max-w-form pt-8 sm:pt-12">
        <div className="rounded-t-paper border border-b-0 border-paper-400 bg-paper-50 ruled px-5 pt-6 pb-8 sm:px-8">
          <h1 className={pageTitleClass}>This page was torn out.</h1>
          <p className="mt-4 text-ink-700">
            The link may be old, or the address may have a typo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button as={Link} to="/">
              Home
            </Button>
            <Button as={Link} to="/browse" variant="outline">
              Browse
            </Button>
          </div>
        </div>
        <TornEdge />
      </div>
    </PageShell>
  )
}
