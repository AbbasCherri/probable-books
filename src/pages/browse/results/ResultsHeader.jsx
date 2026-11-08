import { SelectField } from '@/components/ui/SelectField'
import { cn } from '@/lib/cn'
import { SORTS } from '@/lib/constants'
import { plural } from '@/lib/format'

const VIEWS = [
  { key: 'cards', label: 'Cards' },
  { key: 'ledger', label: 'Ledger' },
]

/** Title, live count, sort and view toggle for the Browse results column. */
export function ResultsHeader({
  title = 'Browse',
  total,
  loading,
  sort,
  onSortChange,
  view,
  onViewChange,
  className,
}) {
  return (
    <header className={cn('flex flex-col gap-4', className)}>
      <div>
        <h1 className="text-h1-sm font-semibold text-ink-900 sm:text-h1">{title}</h1>
        <p aria-live="polite" aria-atomic="true" className="mt-1 text-ink-500">
          {loading ? 'Loading listings' : plural(total ?? 0, 'listing')}
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <SelectField
          label="Sort"
          value={sort}
          onChange={(e) => onSortChange?.(e.target.value)}
          className="min-w-0 flex-1 sm:max-w-64 sm:flex-none"
        >
          {Object.entries(SORTS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <div role="group" aria-label="View" className="flex">
          {VIEWS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => onViewChange?.(key)}
              className={cn(
                'min-h-12 min-w-11 border border-ink-900 px-4 font-medium transition-colors duration-150 ease-out first:rounded-l-paper last:rounded-r-paper last:border-l-0',
                view === key
                  ? 'bg-ink-900 text-paper-50'
                  : 'bg-paper-50 text-ink-900 hover:bg-paper-200',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
