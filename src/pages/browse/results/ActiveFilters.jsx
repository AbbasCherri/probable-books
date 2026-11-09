import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Removable chips for the filters in force, plus Clear all. Renders nothing when empty. */
export function ActiveFilters({ filters, onRemove, onClearAll, className }) {
  if (!filters || filters.length === 0) return null
  return (
    <div
      role="group"
      aria-label="Active filters"
      className={cn(
        'flex items-center gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible',
        className,
      )}
    >
      {filters.map((filter) => (
        <button
          key={`${filter.key}:${filter.value}`}
          type="button"
          aria-label={`Remove filter: ${filter.label}`}
          onClick={() => onRemove?.(filter)}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 hl px-3 whitespace-nowrap text-on-mark hl-yellow"
        >
          <span className="max-w-64 truncate">{filter.label}</span>
          <X strokeWidth={1.5} aria-hidden="true" className="size-4 shrink-0" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => onClearAll?.()}
        className="inline-flex min-h-11 shrink-0 items-center px-2 whitespace-nowrap text-pen-600 underline underline-offset-4 hover:text-pen-700"
      >
        Clear all
      </button>
    </div>
  )
}
