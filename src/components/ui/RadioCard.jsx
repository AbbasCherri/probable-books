import { useId } from 'react'
import { cn } from '@/lib/cn'

/**
 * One choice in a group of large radio cards: category and grade pickers. A native radio
 * (visually hidden) inside a clickable card, so arrow keys, Space and form submission all work.
 * Group the cards in a <fieldset> with a <legend>, and give them the same `name`.
 *   <fieldset>
 *     <legend>Category</legend>
 *     <RadioCard name="category" value="textbook" checked={value === 'textbook'}
 *       onChange={() => setValue('textbook')} icon={<BookOpen strokeWidth={1.5} className="size-5.5" />}>
 *       Textbooks
 *     </RadioCard>
 *   </fieldset>
 * Selected treatment for radio cards, everywhere: a 2px ink outline (border plus inset ring)
 * on a pen-50 fill, with the stack shadow. description: a line under the label, tied to the
 * radio with aria-describedby. className styles the card; other props go to the <input>.
 */
export function RadioCard({
  checked = false,
  icon,
  description,
  className,
  children,
  ...props
}) {
  const descId = useId()
  return (
    <label
      className={cn(
        'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-paper border px-3.5 py-2 text-ink-900 transition-paper',
        'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-pen-600',
        'has-disabled:cursor-default has-disabled:text-ink-300',
        checked
          ? 'border-ink-900 bg-pen-50 shadow-stack ring-1 ring-ink-900 ring-inset'
          : 'border-paper-400 bg-paper-50 hover:border-ink-500',
        className,
      )}
    >
      <input
        type="radio"
        checked={checked}
        aria-describedby={description ? descId : undefined}
        {...props}
        className="sr-only"
      />
      {icon && (
        <span aria-hidden="true" className="flex shrink-0">
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn(checked && 'font-semibold')}>{children}</span>
        {description && (
          <span id={descId} className="text-small font-normal text-ink-500">
            {description}
          </span>
        )}
      </span>
    </label>
  )
}
