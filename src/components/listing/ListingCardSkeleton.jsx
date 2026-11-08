import { cn } from '@/lib/cn'

/**
 * Loading placeholder for a ListingCard: ruled pencil lines on paper, no shimmer (section 2).
 * Wrap a group of them in an element with role="status" and a visually hidden "Loading…" label.
 */
export function ListingCardSkeleton({ variant = 'card', className }) {
  if (variant === 'row') {
    return (
      <div
        aria-hidden="true"
        className={cn(
          'flex items-center gap-4 border-b border-paper-300 py-3',
          className,
        )}
      >
        <span className="aspect-4/3 w-20 shrink-0 rounded-paper border border-dashed border-paper-400" />
        <span className="flex flex-1 flex-col gap-3">
          <span className="w-3/5 border-t border-paper-400" />
          <span className="w-2/5 border-t border-paper-300" />
        </span>
        <span className="w-12 border-t border-paper-400" />
      </div>
    )
  }
  return (
    <div aria-hidden="true" className={cn('flex flex-col pt-7', className)}>
      <div className="rounded-paper border border-paper-300 bg-paper-50">
        <div className="aspect-4/3 border-b border-dashed border-paper-300" />
        <div className="flex flex-col gap-4 p-3.5 pb-5">
          <span className="w-4/5 border-t border-paper-400" />
          <span className="w-1/2 border-t border-paper-300" />
          <span className="mt-2 w-1/4 border-t border-paper-400" />
        </div>
      </div>
    </div>
  )
}
