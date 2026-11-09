import { cn } from '@/lib/cn'

/**
 * A chip that stays pressed: filter toggles such as the condition grades on Browse.
 *   <ToggleChip pressed={selected.includes('good')} onClick={() => toggle('good')}>Good</ToggleChip>
 * Selected treatment for toggles, everywhere: ink fill with paper text (border-ink-900,
 * bg-ink-900, text-paper-50, semibold). Off: paper with a hairline. aria-pressed carries the
 * state for screen readers, so colour is never the only signal. 44px tall.
 * Other props (aria-label, disabled...) go to the <button>.
 */
export function ToggleChip({ pressed = false, className, children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        'inline-flex min-h-11 items-center gap-2 rounded-paper border px-3 transition-paper',
        'disabled:pointer-events-none disabled:border-paper-300 disabled:bg-paper-200 disabled:text-ink-300',
        pressed
          ? 'border-ink-900 bg-ink-900 font-semibold text-paper-50'
          : 'border-paper-400 bg-paper-50 text-ink-900 hover:bg-paper-200',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
