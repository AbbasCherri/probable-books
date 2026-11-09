import { Link } from 'react-router'
import { SectionHeading } from '@/components/layout/SectionHeading'
import { codeToSlug, departmentOf } from '@/lib/courses'
import { plural } from '@/lib/format'

function groupByDepartment(courses) {
  const groups = new Map()
  for (const c of courses) {
    const d = departmentOf(c.code)
    groups.set(d, [...(groups.get(d) ?? []), c])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dept, list]) => [dept, list.sort((a, b) => a.code.localeCompare(b.code))])
}

// Ruled placeholder about as tall as a typical index, so loading does not push the page.
function IndexPlaceholder() {
  return (
    <div role="status" className="mt-6">
      <span className="sr-only">Loading courses</span>
      <div aria-hidden="true" className="md:columns-2 md:gap-12 lg:columns-3">
        {[0, 1, 2].map((g) => (
          <div key={g} className="mb-8 break-inside-avoid">
            <div className="h-8 border-b border-paper-400" />
            {[0, 1, 2, 3].map((r) => (
              <div key={r} className="flex h-11 items-center">
                <span className="w-full border-t border-paper-300" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CourseIndex({ courses, loading = false }) {
  const groups = groupByDepartment(courses)
  return (
    <section aria-labelledby="index-heading" id="index" className="scroll-mt-20">
      <SectionHeading title="Browse by course" id="index-heading" />
      {loading ? (
        <IndexPlaceholder />
      ) : (
        <div className="mt-6 md:columns-2 md:gap-12 lg:columns-3">
          {groups.map(([dept, list]) => (
            <div key={dept} className="mb-8 break-inside-avoid">
              <h3 className="border-b border-paper-400 pb-1 font-serif text-h3 font-semibold text-ink-900">
                {dept}
              </h3>
              <ul>
                {list.map((c) => (
                  <li key={c.code}>
                    <Link
                      to={`/courses/${codeToSlug(c.code)}`}
                      className="flex min-h-11 items-baseline gap-2 py-2 text-ink-900 no-underline hover:text-pen-700"
                    >
                      <span>{c.code}</span>
                      <span className="dot-leader" aria-hidden="true" />
                      <span className="font-serif italic">
                        {plural(c.listingCount, 'listing')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
