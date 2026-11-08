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

  // New page of results: start at the top of the list, not mid-scroll. Skip the first render.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo({ top: 0 })
  }, [filters.page])

  const removeActive = (f) => setSearchParams(removeFilter(searchParams, f))
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
          view={view}
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
      <div className="py-8 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
        {isWide && (
          <aside
            aria-label="Filters"
            className="sticky top-4 max-h-[calc(100dvh-2rem)] self-start overflow-y-auto pr-2"
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
            view={view}
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
              {`Show ${total} ${total === 1 ? 'listing' : 'listings'}`}
            </Button>
          }
        >
          {panel}
        </Sheet>
      )}
    </PageShell>
  )
}
