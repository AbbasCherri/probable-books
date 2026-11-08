import { PAGE_SIZE } from './constants'
import { normalizeCode, codeToSlug } from './courses'

const list = (sp, key) =>
  sp
    .getAll(key)
    .flatMap((v) => v.split(','))
    .filter(Boolean)
const num = (v) =>
  v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined

// URL query -> getListings(filters). Prices in the URL are dollars; filters use cents.
export function parseFilters(sp) {
  const dollarsToCents = (v) =>
    num(v) === undefined ? undefined : Math.round(Number(v) * 100)
  return {
    q: sp.get('q') || undefined,
    courses: list(sp, 'course').map(normalizeCode).filter(Boolean),
    categories: list(sp, 'category'),
    conditions: list(sp, 'condition'),
    minPrice: dollarsToCents(sp.get('minPrice')),
    maxPrice: dollarsToCents(sp.get('maxPrice')),
    openToOffers: sp.get('openToOffers') === 'true' || undefined,
    sort: sp.get('sort') || 'newest',
    page: Math.max(1, Number.parseInt(sp.get('page') ?? '1', 10) || 1),
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
