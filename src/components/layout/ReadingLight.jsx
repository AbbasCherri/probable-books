import { useId } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/cn'

const OPTIONS = [
  { value: 'system', label: 'Match system' },
  { value: 'day', label: 'Day' },
  { value: 'night', label: 'Night' },
]

/**
 * The "Reading light" setting (section 10): Match system, Day or Night, saved under pb.theme
 * through useTheme, so every copy on the page (footer, mobile menu) stays in sync.
 *   <ReadingLight />
 * A segmented row of native radios: Tab reaches the group, arrow keys change the choice. The
 * chosen segment takes the toggle treatment (ink fill, paper text, semibold). 44px tall.
 */
export function ReadingLight({ className }) {
  const [theme, setTheme] = useTheme()
  const labelId = useId()
  const name = useId()
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      className={cn('flex flex-wrap items-center gap-x-3 gap-y-2', className)}
    >
      <span id={labelId} className="text-small text-ink-700">
        Reading light
      </span>
      {/* Wraps instead of overflowing when text is enlarged (200% at 320px). */}
      <span className="inline-flex max-w-full flex-wrap rounded-paper border border-paper-400 bg-paper-50">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className={cn(
              'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center px-3 text-small transition-paper not-first:border-l not-first:border-paper-400',
              'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-pen-600',
              theme === o.value
                ? 'bg-ink-900 font-semibold text-paper-50'
                : 'text-ink-900 hover:bg-paper-200',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={theme === o.value}
              onChange={() => setTheme(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </span>
    </div>
  )
}
