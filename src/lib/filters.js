import { CATEGORIES, CONDITIONS, PAGE_SIZE, SORTS } from './constants'
import { normalizeCode, codeToSlug } from './courses'

const unique = (values) => [...new Set(values)]
const list = (sp, key) =>
  unique(
    sp
      .getAll(key)
      .flatMap((v) => v.split(','))
      .filter(Boolean),
  )
// A usable price: plain decimal text, finite, not negative. Anything else counts as unset.
const num = (v) =>
  v !== null && /^\s*\d+(\.\d+)?\s*$/.test(v) && Number.isFinite(Number(v))
    ? Number(v)
    : undefined

// URL query -> getListings(filters). Prices in the URL are dollars; filters use cents.
export function parseFilters(sp) {
  const dollarsToCents = (v) =>
    num(v) === undefined ? undefined : Math.round(Number(v) * 100)
  let minPrice = dollarsToCents(sp.get('minPrice'))
  let maxPrice = dollarsToCents(sp.get('maxPrice'))
  // A range typed backwards in the URL means the same thing the other way round.
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    ;[minPrice, maxPrice] = [maxPrice, minPrice]
  }
  const sort = sp.get('sort')
  const page = /^\d+$/.test(sp.get('page') ?? '')
    ? Number.parseInt(sp.get('page'), 10)
    : 1
  return {
    q: sp.get('q')?.trim() || undefined,
    courses: unique(list(sp, 'course').map(normalizeCode).filter(Boolean)),
    categories: list(sp, 'category').filter((c) => Object.hasOwn(CATEGORIES, c)),
    conditions: list(sp, 'condition').filter((c) => Object.hasOwn(CONDITIONS, c)),
    minPrice,
    maxPrice,
    openToOffers: sp.get('openToOffers') === 'true' || undefined,
    sort: Object.hasOwn(SORTS, sort) ? sort : 'newest',
    page: Math.min(Math.max(1, page), 100000),
    pageSize: PAGE_SIZE,
  }
}

// Inverse: filters -> URLSearchParams
export function filtersToParams(f) {
  const sp = new URLSearchParams()
  if (f.q) sp.set('q', f.q)
  f.courses?.forEach((c) => sp.append('course', codeToSlug(c)))
  f.categories?.forEach((c) => sp.append('category', c))
  f.conditions?.forEach((c) => sp.append('condition', c))
  if (f.minPrice !== undefined) sp.set('minPrice', String(f.minPrice / 100))
  if (f.maxPrice !== undefined) sp.set('maxPrice', String(f.maxPrice / 100))
  if (f.openToOffers) sp.set('openToOffers', 'true')
  if (f.sort && f.sort !== 'newest') sp.set('sort', f.sort)
  if (f.page > 1) sp.set('page', String(f.page))
  return sp
}
