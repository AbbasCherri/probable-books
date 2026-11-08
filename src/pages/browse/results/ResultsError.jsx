import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

/** Shown when the listings request fails. */
export function ResultsError({ onRetry, className }) {
  return (
    <div
      role="alert"
      className={cn(
        'max-w-lg rounded-paper border border-redpen-600 bg-paper-50 px-6 py-5',
        className,
      )}
    >
      <h2 className="text-h3 font-semibold text-ink-900">Couldn&apos;t load the index</h2>
      <p className="mt-1 text-ink-700">Check your connection and try again.</p>
      <Button variant="outline" className="mt-4" onClick={() => onRetry?.()}>
        Retry
      </Button>
    </div>
  )
}
