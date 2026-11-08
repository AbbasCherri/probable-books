import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

const short = (text, max = 28) => (text.length > max ? `${text.slice(0, max)}...` : text)

/** Empty result set with one clear way forward. */
export function NoResults({ restrictive, onRemoveRestrictive, onClearAll, className }) {
  const note = restrictive
    ? `Nothing is listed with ${short(restrictive.label, 60)}. Removing it may bring some back.`
    : 'Try fewer filters or a different search.'
  return (
    <EmptyState
      title="Nothing matches"
      note={note}
      className={className}
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
