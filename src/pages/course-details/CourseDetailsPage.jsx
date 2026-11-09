import { Link, useParams, useSearchParams } from 'react-router'
import { CourseTab } from '@/components/annotate/CourseTab'
import { PageShell } from '@/components/layout/PageShell'
import { pageTitleClass } from '@/components/layout/pageTitle'
import { SectionHeading } from '@/components/layout/SectionHeading'
import { Button } from '@/components/ui/Button'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/cn'
import { SORTS } from '@/lib/constants'
import { normalizeCode, tabColorFor } from '@/lib/courses'
import { formatPrice } from '@/lib/format'
import * as api from '@/services/api'
import { CourseListings } from './CourseListings'
import { RequiredMaterials } from './RequiredMaterials'

const GRID_SIZE = 12

// Full class names so Tailwind finds them. Same department, same colour as its CourseTab.
const BAND_CLASSES = {
  sage: 'bg-tab-sage',
  sky: 'bg-tab-sky',
  butter: 'bg-tab-butter',
  rose: 'bg-tab-rose',
  lilac: 'bg-tab-lilac',
  sand: 'bg-tab-sand',
}

function statsLine({ listingCount, minCents, medianCents }) {
  // listingCount is active listings only, so say "for sale"; the section below counts sold too.
  if (!listingCount) return 'Nothing for sale yet'
  return `${listingCount} for sale, from ${formatPrice(minCents)}, median ${formatPrice(medianCents)}`
}

function NotInIndex({ code, closest }) {
  return (
    <PageShell chapter="Syllabus">
      <div className="max-w-prose py-12">
        <h1 className={pageTitleClass}>No {code} in the index</h1>
        <p className="mt-4 text-ink-700">
          Check the code on your timetable. These are the closest we have:
        </p>
        <ul className="mt-4 flex flex-wrap gap-3">
          {closest.map((c) => (
            <li key={c}>
              <CourseTab code={c} asLink className="h-11 px-3 text-body" />
            </li>
          ))}
        </ul>
        <Button as={Link} to="/browse" variant="outline" className="mt-8">
          Browse all listings
        </Button>
      </div>
    </PageShell>
  )
}

export default function CourseDetailsPage() {
  const { courseCode } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const sort = SORTS[searchParams.get('sort')] ? searchParams.get('sort') : 'newest'
  const code = normalizeCode(courseCode) ?? courseCode

  const course = useAsync(() => api.getCourse(courseCode), [courseCode])
  // Every listing for the course, to match against the required materials.
  const all = useAsync(() => api.getListings({ courses: [code], pageSize: 1000 }), [code])
  const grid = useAsync(
    () => api.getListings({ courses: [code], sort, pageSize: GRID_SIZE }),
    [code, sort],
  )

  useDocumentTitle(course.data ? `${course.data.code} ${course.data.title}` : code)

  function onSort(next) {
    setSearchParams(
      (sp) => {
        if (next === 'newest') sp.delete('sort')
        else sp.set('sort', next)
        return sp
      },
      { replace: true, preventScrollReset: true },
    )
  }

  if (course.loading) {
    return (
      <PageShell chapter={`Syllabus, ${code}`}>
        <div role="status" className="mt-6">
          <span className="sr-only">Loading course…</span>
          <div className="h-36 rounded-paper border border-dashed border-paper-400" />
          <div className="mt-10 h-48 ruled" />
        </div>
      </PageShell>
    )
  }

  if (course.error?.status === 404) {
    return <NotInIndex code={code} closest={course.error.closest ?? []} />
  }

  if (course.error) {
    return (
      <PageShell chapter={`Syllabus, ${code}`}>
        <div role="alert" className="max-w-prose py-12">
          <h1 className={pageTitleClass}>This page didn&apos;t print</h1>
          <p className="mt-4 text-ink-700">Something jammed on our end. Try again.</p>
          <Button className="mt-6" onClick={course.retry}>
            Retry
          </Button>
        </div>
      </PageShell>
    )
  }

  const c = course.data

  return (
    <PageShell chapter={`Syllabus, ${c.code}`} annotated>
      <header className="mt-5 sm:mt-6">
        <div
          className={cn(
            'rounded-paper border border-paper-400 px-5 pt-5 pb-6 sm:px-8',
            BAND_CLASSES[tabColorFor(c.code)],
          )}
        >
          <h1 className="font-serif font-semibold text-on-mark">
            <span className="block text-display-sm tracking-tight lg:text-display">
              {c.code}
            </span>
            <span className="mt-2 block text-h3 sm:text-h2">{c.title}</span>
          </h1>
        </div>
        <p className="mt-4 text-ink-700">{statsLine(c.stats)}</p>
      </header>

      <div className="mt-12 flex flex-col gap-12 lg:mt-16 lg:gap-20">
        <RequiredMaterials
          key={c.code}
          course={c}
          listings={all.data?.items ?? []}
          loading={all.loading}
        />

        <CourseListings
          code={c.code}
          result={grid.data}
          loading={grid.loading}
          error={grid.error}
          onRetry={grid.retry}
          unavailable={
            all.data?.items.filter((l) => l.status === 'sold' || l.status === 'reserved')
              .length
          }
          sort={sort}
          onSort={onSort}
        />

        {c.relatedCodes.length > 0 && (
          <section aria-labelledby="related-heading">
            <SectionHeading title="Often taken with" id="related-heading" />
            <ul className="mt-5 flex flex-wrap gap-3">
              {c.relatedCodes.map((r) => (
                <li key={r}>
                  <CourseTab code={r} asLink className="h-11 px-3 text-body" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </PageShell>
  )
}
