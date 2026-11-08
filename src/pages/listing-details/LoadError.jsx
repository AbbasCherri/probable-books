import { Link } from 'react-router'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'

/** The listing failed to load for a reason other than "not found": say so, offer Retry. */
export function LoadError({ onRetry }) {
  return (
    <PageShell chapter="Listing">
      <div className="mt-8 max-w-xl sm:mt-12">
        <h1 className="font-serif text-h1-sm font-semibold tracking-tight text-ink-900 sm:text-h1">
          This page didn&rsquo;t print.
        </h1>
        <p role="alert" className="mt-4 text-ink-700">
          Something jammed on our end while loading this listing. Your connection is
          probably fine. Try again in a moment.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={onRetry}>Retry</Button>
          <Button as={Link} to="/browse" variant="outline">
            Browse listings
          </Button>
        </div>
      </div>
    </PageShell>
  )
}
