import { Link } from 'react-router'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'

/**
 * Unknown listing id, or someone else's draft (doc 5.3, 5.9): "This page was torn out."
 * A page torn along its perforation, with the ways back.
 */
export function TornOut() {
  return (
    <PageShell chapter="Listing">
      {/* Torn along the perforation: a dashed top edge instead of a hairline. */}
      <div className="relative mt-8 max-w-xl rounded-b-paper border border-t-0 border-paper-400 bg-paper-50 shadow-stack sm:mt-12">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 border-t-2 border-dashed border-ink-300"
        />
        <div className="px-5 pt-6 pb-7 sm:px-8 sm:pt-8 sm:pb-9">
          <h1 className="font-serif text-h1-sm font-semibold tracking-tight text-ink-900 sm:text-h1">
            This page was torn out.
          </h1>
          <p className="mt-4 text-ink-700">
            No listing lives at this address. The seller may have taken it down, or the
            link lost a few characters on the way here.
          </p>
          <p className="mt-3 font-hand text-note text-graphite">
            Check the course index, it is probably still on the shelf.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button as={Link} to="/browse">
              Browse listings
            </Button>
            <Button as={Link} to="/" variant="outline">
              Home
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
