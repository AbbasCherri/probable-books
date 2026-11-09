import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { Sheet } from '@/components/ui/Sheet'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import * as api from '@/services/api'
import { getActiveFilters, mostRestrictive, removeFilter } from './activeFilters'
import { FilterPanel } from './filters/FilterPanel'
import { ActiveFilters } from './results/ActiveFilters'
import { NoResults } from './results/NoResults'
import { ResultsError } from './results/ResultsError'
import { ResultsGrid } from './results/ResultsGrid'
import { ResultsHeader } from './results/ResultsHeader'
import { useBrowseParams } from './useBrowseParams'

/** Browse listings (doc 5.2). Every filter, the sort, the view and the page live in the URL. */
export default function BrowsePage() {
  useDocumentTitle('Browse used course gear')
  const [, setSearchParams] = useSearchParams()
  const {
    searchParams,
    filters,
    view,
    setFilter,
    toggleList,
    setView,
    clear,
    activeCount,
  } = useBrowseParams()
  const isWide = useMediaQuery('(min-width: 64rem)')
  const [sheetOpen, setSheetOpen] = useState(false)
  // Widening past lg swaps the sheet for the rail; forget it was open so narrowing does not reopen it.
  if (isWide && sheetOpen) setSheetOpen(false)

  const query = searchParams.toString()
  const listings = useAsync(() => api.getListings(filters), [query])
  const courses = useAsync(() => api.getCourses(), [])

  const total = listings.data?.total ?? 0
  const pageCount = Math.max(
    1,
    Math.ceil(total / (listings.data?.pageSize ?? filters.pageSize)),
  )
  const active = getActiveFilters(filters)
  const restrictive = mostRestrictive(filters, total)

  // New page of results: start at the top of the list, not mid-scroll. Only when the page number
  // really changed (not on mount, including StrictMode's second effect run).
  const shownPage = useRef(filters.page)
  useEffect(() => {
    if (shownPage.current === filters.page) return
    shownPage.current = filters.page
    window.scrollTo({ top: 0 })
    // Keyboard users land at the new results, not back at the pagination they just used.
    document.getElementById('browse-title')?.focus({ preventScroll: true })
  }, [filters.page])

  // A shared link to a page that no longer exists lands on the last real page.
  const outOfRange = !listings.loading && !listings.error && filters.page > pageCount
  useEffect(() => {
    if (!outOfRange) return
    const next = new URLSearchParams(window.location.search)
    if (pageCount > 1) next.set('page', String(pageCount))
    else next.delete('page')
    setSearchParams(next, { replace: true })
  }, [outOfRange, pageCount, setSearchParams])

  const removeActive = (f) =>
    setSearchParams(removeFilter(new URLSearchParams(window.location.search), f))
  const onChange = (patch) =>
    setFilter(patch, {
      replace: 'q' in patch || 'minPrice' in patch || 'maxPrice' in patch,
    })
  const panel = (
    <FilterPanel
      filters={filters}
      courses={courses.data ?? []}
      onChange={onChange}
      onToggle={toggleList}
    />
  )
  const pageHref = (n) => {
    const next = new URLSearchParams(searchParams)
    if (n > 1) next.set('page', String(n))
    else next.delete('page')
    const qs = next.toString()
    return qs ? `?${qs}` : '?'
  }

  let results
  if (listings.error) {
    results = <ResultsError onRetry={listings.retry} />
  } else if (!listings.loading && total === 0) {
    results = (
      <NoResults
        restrictive={restrictive}
        onRemoveRestrictive={removeActive}
        onClearAll={clear}
      />
    )
  } else {
    results = (
      <>
        <ResultsGrid
          items={listings.data?.items ?? []}
          loading={listings.loading}
          view={isWide ? view : 'cards'}
        />
        {!listings.loading && (
          <Pagination
            page={filters.page}
            pageCount={pageCount}
            buildHref={pageHref}
            className="mt-10"
          />
        )}
      </>
    )
  }

  return (
    <PageShell chapter="Index">
      <div className="py-8 lg:grid lg:grid-rail lg:gap-10">
        {isWide && (
          // A sticky rail as tall as the screen; its padding keeps 1rem clear above and below.
          <aside
            aria-label="Filters"
            className="sticky top-0 -mt-3 max-h-dvh self-start overflow-y-auto py-4 pr-3 pl-1"
          >
            {panel}
          </aside>
        )}
        <div className="min-w-0 space-y-6">
          <ResultsHeader
            total={total}
            loading={listings.loading}
            sort={filters.sort}
            onSortChange={(sort) => setFilter({ sort })}
            view={isWide ? view : 'cards'}
            onViewChange={setView}
            actions={
              !isWide && (
                <Button
                  variant="outline"
                  aria-haspopup="dialog"
                  onClick={() => setSheetOpen(true)}
                  className="min-h-12"
                >
                  {activeCount ? `Filters (${activeCount})` : 'Filters'}
                </Button>
              )
            }
          />
          <ActiveFilters filters={active} onRemove={removeActive} onClearAll={clear} />
          {results}
        </div>
      </div>
      {!isWide && (
        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Filters"
          footer={
            <Button className="w-full" onClick={() => setSheetOpen(false)}>
              {listings.loading || listings.error
                ? 'Show listings'
                : `Show ${total} ${total === 1 ? 'listing' : 'listings'}`}
            </Button>
          }
        >
          {panel}
        </Sheet>
      )}
    </PageShell>
  )
}
