import { cn } from '@/lib/cn'
import { KeywordFilter } from './KeywordFilter'
import { CourseIndexFilter } from './CourseIndexFilter'
import { CategoryFilter } from './CategoryFilter'
import { ConditionFilter } from './ConditionFilter'
import { PriceFilter } from './PriceFilter'
import { OffersFilter } from './OffersFilter'

/**
 * All Browse filters in one column. Works in a sticky rail or a bottom sheet (fluid width).
 * filters comes from parseFilters; onChange(patch) for scalar keys,
 * onToggle('course' | 'category' | 'condition', value) for list keys.
 */
export function FilterPanel({
  filters = {},
  courses = [],
  onChange,
  onToggle,
  className,
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-6', className)}>
      <section aria-labelledby="filter-search-heading">
        <h3 id="filter-search-heading" className="mb-2">
          Search
        </h3>
        <KeywordFilter
          value={filters.q}
          onChange={(q) => onChange?.({ q: q || undefined })}
        />
      </section>
      <CourseIndexFilter
        courses={courses}
        selected={filters.courses ?? []}
        onToggle={(code) => onToggle?.('course', code)}
      />
      <CategoryFilter
        selected={filters.categories ?? []}
        onToggle={(key) => onToggle?.('category', key)}
      />
      <ConditionFilter
        selected={filters.conditions ?? []}
        onToggle={(key) => onToggle?.('condition', key)}
      />
      <PriceFilter
        minPrice={filters.minPrice}
        maxPrice={filters.maxPrice}
        onChange={(patch) => onChange?.(patch)}
      />
      <section aria-labelledby="filter-offers-heading">
        <h3 id="filter-offers-heading" className="mb-1">
          Offers
        </h3>
        <OffersFilter
          checked={!!filters.openToOffers}
          onChange={(on) => onChange?.({ openToOffers: on || undefined })}
        />
      </section>
    </div>
  )
}
