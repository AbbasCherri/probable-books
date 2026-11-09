import { BookOpen, Calculator, FlaskConical, Package } from 'lucide-react'
import { CATEGORIES } from '@/lib/constants'
import { cn } from '@/lib/cn'

const ICONS = {
  textbook: BookOpen,
  calculator: Calculator,
  lab_gear: FlaskConical,
  other: Package,
}

/** Category as large radio cards: a 2x2 grid on phones, one row from sm. */
export function CategoryPicker({ value, onChange }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2">Category</legend>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {Object.entries(CATEGORIES).map(([key, category]) => {
          const c = { value: key, ...category }
          const Icon = ICONS[c.value] ?? Package
          const selected = value === c.value
          return (
            <label
              key={c.value}
              className={cn(
                'flex min-h-15 cursor-pointer items-center gap-2.5 rounded-paper border px-3.5 transition-paper sm:min-h-22 sm:flex-col sm:justify-center sm:gap-1.5 sm:text-center',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-pen-600',
                selected
                  ? 'border-ink-900 bg-pen-50 font-semibold shadow-stack ring-1 ring-ink-900 ring-inset'
                  : 'border-paper-400 bg-paper-50 hover:border-ink-500',
              )}
            >
              <input
                type="radio"
                name="category"
                value={c.value}
                checked={selected}
                onChange={() => onChange(c.value)}
                className="sr-only"
              />
              <Icon strokeWidth={1.5} aria-hidden="true" className="size-5.5 shrink-0" />
              <span>{c.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
