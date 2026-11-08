import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { parseFilters } from '@/lib/filters'
import { codeToSlug, normalizeCode } from '@/lib/courses'

const MULTI_KEYS = ['course', 'category', 'condition']
const VIEWS = ['cards', 'ledger']
const FILTER_PARAMS = [
  'q',
  'course',
  'category',
  'condition',
  'minPrice',
  'maxPrice',
  'openToOffers',
  'page',
]

// Multi-value params may repeat or be comma-joined; return a flat list.
const readList = (sp, key) =>
  sp
    .getAll(key)
    .flatMap((v) => v.split(','))
    .filter(Boolean)

// Compare values the way the URL does (course codes are normalized).
const sameValue = (key, a, b) =>
  key === 'course' ? normalizeCode(a) === normalizeCode(b) : a === b

const isEmpty = (v) =>
  v === undefined ||
  v === null ||
  v === '' ||
  v === false ||
  (Array.isArray(v) && !v.length)

const setList = (sp, param, values) => {
  sp.delete(param)
  values.forEach((v) => sp.append(param, v))
}

// Filter-shaped patch key -> { URL param, writer }. Prices are cents in, dollars out.
const PATCH = {
  q: { param: 'q', write: (sp, v) => sp.set('q', v) },
  minPrice: { param: 'minPrice', write: (sp, v) => sp.set('minPrice', String(v / 100)) },
  maxPrice: { param: 'maxPrice', write: (sp, v) => sp.set('maxPrice', String(v / 100)) },
  openToOffers: { param: 'openToOffers', write: (sp) => sp.set('openToOffers', 'true') },
  sort: {
    param: 'sort',
    write: (sp, v) => (v === 'newest' ? sp.delete('sort') : sp.set('sort', v)),
  },
  courses: {
    param: 'course',
    write: (sp, v) =>
      setList(
        sp,
        'course',
        v.map((c) => codeToSlug(normalizeCode(c) ?? c)),
      ),
  },
  categories: { param: 'category', write: (sp, v) => setList(sp, 'category', v) },
  conditions: { param: 'condition', write: (sp, v) => setList(sp, 'condition', v) },
}

/**
 * Browse page state, all kept in the URL query. Setters merge into the
 * existing params (so unknown params like `view` survive) and delete `page`
 * on any filter or sort change.
 */
export function useBrowseParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Every write starts from the address bar as it is right now, so two edits in one tick (say a
  // debounced keyword and a price landing together) stack instead of one overwriting the other.
  const update = useCallback(
    (build, options) =>
      setSearchParams(build(new URLSearchParams(window.location.search)), options),
    [setSearchParams],
  )

  const filters = useMemo(() => parseFilters(searchParams), [searchParams])
  const view = VIEWS.includes(searchParams.get('view'))
    ? searchParams.get('view')
    : 'cards'

  /**
   * Apply a filter-shaped patch (q, courses, categories, conditions, minPrice
   * and maxPrice in cents, openToOffers, sort). Empty values remove the param.
   * Pass { replace: true } for free-text/number updates.
   */
  const setFilter = useCallback(
    (patch, { replace = false } = {}) => {
      update(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            const entry = PATCH[key]
            if (!entry) continue
            if (isEmpty(value)) next.delete(entry.param)
            else entry.write(next, value)
          }
          next.delete('page')
          return next
        },
        // Typing on page 3 must not overwrite page 3's history entry, so only replace from page 1.
        { replace: replace && !new URLSearchParams(window.location.search).has('page') },
      )
    },
    [update],
  )

  /** Add or remove one value of course | category | condition. */
  const toggleList = useCallback(
    (key, value) => {
      if (!MULTI_KEYS.includes(key)) return
      const stored = key === 'course' ? codeToSlug(normalizeCode(value) ?? value) : value
      update((prev) => {
        const next = new URLSearchParams(prev)
        const current = readList(prev, key)
        const has = current.some((v) => sameValue(key, v, stored))
        setList(
          next,
          key,
          has ? current.filter((v) => !sameValue(key, v, stored)) : [...current, stored],
        )
        next.delete('page')
        return next
      })
    },
    [update],
  )

  /** Go to page n (page 1 removes the param). */
  const setPage = useCallback(
    (n) => {
      update((prev) => {
        const next = new URLSearchParams(prev)
        if (n > 1) next.set('page', String(n))
        else next.delete('page')
        return next
      })
    },
    [update],
  )

  /** 'cards' (default, param omitted) or 'ledger'. */
  const setView = useCallback(
    (v) => {
      update((prev) => {
        const next = new URLSearchParams(prev)
        if (v === 'cards') next.delete('view')
        else next.set('view', v)
        return next
      })
    },
    [update],
  )

  /** Remove every filter and the page; keep view and sort. */
  const clear = useCallback(() => {
    update((prev) => {
      const next = new URLSearchParams(prev)
      FILTER_PARAMS.forEach((k) => next.delete(k))
      return next
    })
  }, [update])

  // Number of active filter groups (price min+max count as one).
  const activeCount = useMemo(
    () =>
      [
        filters.q,
        filters.courses.length,
        filters.categories.length,
        filters.conditions.length,
        filters.minPrice !== undefined || filters.maxPrice !== undefined,
        filters.openToOffers,
      ].filter(Boolean).length,
    [filters],
  )

  return {
    searchParams,
    filters,
    view,
    setFilter,
    toggleList,
    setPage,
    setView,
    clear,
    activeCount,
  }
}
