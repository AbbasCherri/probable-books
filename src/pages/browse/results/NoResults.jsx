import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

const short = (text, max = 28) => (text.length > max ? `${text.slice(0, max)}...` : text)

/** Empty result set with one clear way forward. */
export function NoResults({ restrictive, onRemoveRestrictive, onClearAll, className }) {
  let note = 'Try fewer filters or a different search.'
  if (restrictive?.key === 'q') {
    note = `No listings match “${short(restrictive.value, 60)}”. Try a different search.`
  } else if (restrictive) {
    note = `No listings match “${short(restrictive.label, 60)}”. Removing it may bring some back.`
  }
  return (
    <EmptyState
      title="Nothing matches"
      note={note}
      className={cn('break-words', className)}
      action={
        restrictive ? (
          <Button variant="outline" onClick={() => onRemoveRestrictive?.(restrictive)}>
            {`Remove '${short(restrictive.label)}'`}
          </Button>
        ) : (
          <Button variant="outline" onClick={() => onClearAll?.()}>
            Clear all
          </Button>
        )
      }
    />
  )
}
