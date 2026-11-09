import { pageTitleClass } from '@/components/layout/pageTitle'
import { SelectField } from '@/components/ui/SelectField'
import { cn } from '@/lib/cn'
import { SORTS } from '@/lib/constants'
import { plural } from '@/lib/format'

const VIEWS = [
  { key: 'cards', label: 'Cards' },
  { key: 'ledger', label: 'Ledger' },
]

/** Title, live count, sort and view toggle. `actions` sits beside Sort (the phone Filters button). */
export function ResultsHeader({
  title = 'Browse',
  total,
  loading,
  sort,
  onSortChange,
  view,
  onViewChange,
  actions,
  className,
}) {
  return (
    <header className={cn('flex flex-col gap-4', className)}>
      <div>
        <h1
          id="browse-title"
          tabIndex={-1}
          className={cn(pageTitleClass, 'outline-none')}
        >
          {title}
        </h1>
        <p aria-live="polite" aria-atomic="true" className="mt-1 text-ink-500">
          {loading ? 'Loading listings' : plural(total ?? 0, 'listing')}
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        {actions}
        <SelectField
          label="Sort"
          value={sort}
          onChange={(e) => onSortChange?.(e.target.value)}
          className="min-w-0 grow basis-36 sm:max-w-64 sm:flex-none"
          inputClassName="min-w-0 max-w-full"
        >
          {Object.entries(SORTS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <div role="group" aria-label="View" className="hidden lg:flex">
          {VIEWS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => onViewChange?.(key)}
              className={cn(
                'min-h-12 min-w-11 border border-ink-900 px-4 transition-paper first:rounded-l-paper last:rounded-r-paper last:border-l-0',
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
