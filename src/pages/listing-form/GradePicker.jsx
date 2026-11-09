import { ConditionGrade } from '@/components/annotate/ConditionGrade'
import { CONDITIONS } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { FieldError } from './FieldError'

/**
 * Condition as radio cards with plain descriptions.
 * Phones: a stacked list, each grade with its description (big targets).
 * sm and up: one row, with the chosen grade's description underneath.
 */
export function GradePicker({ value, onChange, error }) {
  const chosen = CONDITIONS[value] && { value, ...CONDITIONS[value] }
  const errorId = 'listing-condition-error'
  return (
    <fieldset
      className="min-w-0"
      aria-describedby={error ? errorId : 'listing-condition-desc'}
    >
      <legend className="mb-2 font-semibold">Grade</legend>
      <FieldError id={errorId}>{error}</FieldError>
      <div
        className={cn(
          'mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap',
          error && 'border-l-2 border-redpen-600 pl-3',
        )}
      >
        {Object.entries(CONDITIONS).map(([key, condition]) => {
          const c = { value: key, ...condition }
          const selected = value === c.value
          return (
            <label
              key={c.value}
              className={cn(
                'flex min-h-15 cursor-pointer items-center gap-3 rounded-paper border px-3 py-2 transition-paper sm:min-w-28 sm:flex-1',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-pen-600',
                selected
                  ? 'border-ink-900 bg-pen-50 shadow-stack ring-1 ring-ink-900 ring-inset'
                  : 'border-paper-400 bg-paper-50 hover:border-ink-500',
              )}
            >
              <input
                type="radio"
                name="condition"
                id={`listing-condition-${c.value}`}
                value={c.value}
                checked={selected}
                onChange={() => onChange(c.value)}
                className="sr-only"
              />
              <span className="flex flex-col gap-0.5">
                <ConditionGrade condition={c.value} size="sm" />
                <span className="text-small text-ink-500 sm:hidden">{c.description}</span>
              </span>
            </label>
          )
        })}
      </div>
      <p id="listing-condition-desc" className="mt-3 hidden text-ink-700 sm:block">
        {chosen ? (
          <>
            <strong className="font-semibold text-ink-900">{chosen.label}.</strong>{' '}
            {chosen.description}
          </>
        ) : (
          'Pick the one that matches. Buyers see the circled letter and the word.'
        )}
      </p>
    </fieldset>
  )
}
