import { CONDITIONS } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { legendClass } from './filterStyles'

const IN_RANK_ORDER = Object.entries(CONDITIONS).sort(([, a], [, b]) => a.rank - b.rank)

/** Five grade toggles in rank order. selected = condition keys. */
export function ConditionFilter({ selected = [], onToggle, className }) {
  const first = IN_RANK_ORDER.find(([key]) => selected.includes(key))
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className={legendClass}>Condition</legend>
      <div className="flex flex-wrap gap-2">
        {IN_RANK_ORDER.map(([key, c]) => {
          const on = selected.includes(key)
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle?.(key)}
              className={cn(
                'inline-flex min-h-11 items-center gap-2 rounded-paper border px-3 transition-colors duration-150 ease-out',
                on
                  ? 'border-ink-900 bg-ink-900 font-semibold text-paper-50'
                  : 'border-paper-400 bg-paper-50 text-ink-900 hover:bg-paper-200',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs leading-none font-semibold',
                  on ? 'border-paper-50' : 'border-redpen-600 text-redpen-600',
                )}
              >
                {c.grade}
              </span>
              <span>
                <span className="sr-only">Grade {c.grade}, </span>
                {c.label}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-small text-ink-500">
        {first && selected.length === 1
          ? `${first[1].label}: ${first[1].description}`
          : selected.length > 1
            ? `${selected.length} grades picked. A is best.`
            : 'Pick one or more grades. A is best.'}
      </p>
    </fieldset>
  )
}
