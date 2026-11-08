import { cn } from '@/lib/cn'
import { checkboxClass } from './filterStyles'

/** Single checkbox: only listings open to offers. */
export function OffersFilter({ checked = false, onChange, className }) {
  return (
    <label
      className={cn('flex min-h-11 cursor-pointer items-center gap-3 py-2', className)}
    >
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className={checkboxClass}
      />
      <span className="text-ink-900">Open to offers only</span>
    </label>
  )
}
