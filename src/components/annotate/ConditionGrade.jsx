import { CONDITIONS } from '@/lib/constants'
import { cn } from '@/lib/cn'

const SIZES = {
  sm: { ring: 'size-7 text-xs', word: 'text-sm' },
  md: { ring: 'size-9 text-sm', word: 'text-base' },
  lg: { ring: 'size-14 text-xl', word: 'text-h3' },
}

/**
 * Condition as a red-pen circled grade plus its printed word (section 2).
 * The word is always shown: colour is never the only signal.
 *   <ConditionGrade condition="good" />   ->  (B) Good
 */
export function ConditionGrade({ condition, size = 'md', className }) {
  const c = CONDITIONS[condition]
  if (!c) return null
  const s = SIZES[size] ?? SIZES.md
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'grid shrink-0 -rotate-6 place-items-center rounded-full border-2 border-redpen-600 leading-none font-semibold text-redpen-600',
          s.ring,
        )}
      >
        {c.grade}
      </span>
      <span className={cn('font-medium text-ink-900', s.word)}>
        <span className="sr-only">Condition: grade {c.grade}, </span>
        {c.label}
      </span>
    </span>
  )
}
