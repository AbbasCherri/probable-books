import { CATEGORIES, CONDITIONS } from '@/lib/constants'
import { codeToSlug } from '@/lib/courses'
import { formatPrice } from '@/lib/format'

/**
 * @typedef {object} ActiveFilter
 * @property {'q'|'course'|'category'|'condition'|'price'|'openToOffers'} key  filter group
 * @property {string} value   raw URL value (course slug, enum key, "min-max" cents for price)
 * @property {string} label   text for the chip
 * @property {string} removeKey  URL param to edit ('price' means minPrice and maxPrice)
 */

/**
 * Flatten parsed filters (see parseFilters) into chip-ready entries.
 * @returns {ActiveFilter[]}
 */
export function getActiveFilters(filters) {
  const out = []
  if (filters.q) {
    out.push({ key: 'q', value: filters.q, label: `Search: ${filters.q}`, removeKey: 'q' })
  }
  filters.courses?.forEach((c) =>
    out.push({ key: 'course', value: codeToSlug(c), label: c, removeKey: 'course' }),
  )
  filters.categories?.forEach((c) =>
    out.push({
      key: 'category',
      value: c,
      label: CATEGORIES[c]?.label ?? c,
      removeKey: 'category',
    }),
  )
  filters.conditions?.forEach((c) => {
    const cond = CONDITIONS[c]
    out.push({
      key: 'condition',
      value: c,
      label: cond ? `Grade ${cond.grade} (${cond.label})` : c,
      removeKey: 'condition',
    })
  })
  const { minPrice: min, maxPrice: max } = filters
  if (min !== undefined || max !== undefined) {
    const label =
      min === undefined
        ? `Under ${formatPrice(max)}`
        : max === undefined
          ? `Over ${formatPrice(min)}`
          : `${formatPrice(min)} to ${formatPrice(max)}`
    out.push({ key: 'price', value: `${min ?? ''}-${max ?? ''}`, label, removeKey: 'price' })
  }
  if (filters.openToOffers) {
    out.push({
      key: 'openToOffers',
      value: 'true',
      label: 'Open to offers',
      removeKey: 'openToOffers',
    })
  }
  return out
}

// Most to least likely to remove results: a grade cuts deepest, free text least.
const PRIORITY = ['condition', 'price', 'openToOffers', 'category', 'course', 'q']

/**
 * The single active filter most likely to be why results are thin or empty.
 * Heuristic priority: condition > price > openToOffers > category > course > q.
 * Meant for the low/empty-results hint, so a positive `total` returns null.
 * @param {object} filters parsed filters
 * @param {number} [total=0] current result count
 * @returns {ActiveFilter|null}
 */
export function mostRestrictive(filters, total = 0) {
  if (total > 0) return null
  const active = getActiveFilters(filters)
  for (const key of PRIORITY) {
    const hit = active.find((f) => f.key === key)
    if (hit) return hit
  }
  return null
}

/**
 * New URLSearchParams with one active filter removed and `page` deleted.
 * Other params (view, sort, other filters) are untouched.
 * @param {URLSearchParams} searchParams
 * @param {ActiveFilter} activeFilter
 * @returns {URLSearchParams}
 */
export function removeFilter(searchParams, activeFilter) {
  const next = new URLSearchParams(searchParams)
  const { key, value, removeKey } = activeFilter
  if (key === 'course' || key === 'category' || key === 'condition') {
    const norm = (v) => (key === 'course' ? v.toUpperCase().replace(/\s/g, '-') : v)
    const kept = next
      .getAll(removeKey)
      .flatMap((v) => v.split(','))
      .filter((v) => v && norm(v) !== norm(value))
    next.delete(removeKey)
    kept.forEach((v) => next.append(removeKey, v))
  } else if (key === 'price') {
    next.delete('minPrice')
    next.delete('maxPrice')
  } else {
    next.delete(removeKey)
  }
  next.delete('page')
  return next
}
