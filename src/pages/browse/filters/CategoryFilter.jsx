import { CATEGORIES } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { legendClass, checkboxClass } from './filterStyles'

/** Category checkboxes. selected = category keys. */
export function CategoryFilter({ selected = [], onToggle, className }) {
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className={legendClass}>Category</legend>
      {Object.entries(CATEGORIES).map(([key, { label }]) => (
        <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3 py-2">
          <input
            type="checkbox"
            checked={selected.includes(key)}
            onChange={() => onToggle?.(key)}
            className={checkboxClass}
          />
          <span className="text-ink-900">{label}</span>
        </label>
      ))}
    </fieldset>
  )
}
