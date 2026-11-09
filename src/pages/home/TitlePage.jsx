import { CourseTab } from '@/components/annotate/CourseTab'
import { CourseLookup } from '@/components/layout/CourseLookup'
import { cn } from '@/lib/cn'

// Two fixed columns on phones so the row count never depends on when the condensed font loads.
const tabRow = 'grid grid-cols-2 gap-3 sm:flex sm:flex-wrap'

export function TitlePage({ courses, loading, contents }) {
  const popular = (courses ?? [])
    .filter((c) => c.listingCount > 0)
    .sort((a, b) => b.listingCount - a.listingCount)
    .slice(0, 4)

  return (
    <section aria-labelledby="home-title" className="lg:grid lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-7">
        <h1
          id="home-title"
          lang="en"
          className="font-serif text-h1-sm font-semibold tracking-tight break-words hyphens-auto text-ink-900 sm:text-display-sm lg:text-display"
        >
          Everything on your syllabus, secondhand.
        </h1>
        <p className="mt-4 max-w-prose text-body text-ink-700">
          Textbooks, calculators and lab gear from students one year ahead of you.
        </p>
        <CourseLookup courses={courses} className="mt-6 max-w-prose" />
        <div className="mt-8">
          <h2 className="font-serif text-h3 font-semibold text-ink-900">
            Popular this term
          </h2>
          {loading ? (
            <div role="status" className="mt-3">
              <span className="sr-only">Loading courses</span>
              <ul aria-hidden="true" className={tabRow}>
                {[0, 1, 2, 3].map((i) => (
                  <li key={i}>
                    <span className="block h-11 w-20 rounded-t-paper border-b border-paper-400 bg-paper-200" />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ul className={cn('mt-3', tabRow)}>
              {popular.map((c) => (
                <li key={c.code}>
                  <CourseTab code={c.code} asLink size="lg" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <nav aria-label="Contents" className="mt-10 lg:col-span-5 lg:mt-2">
        <h2 className="font-serif text-h3 font-semibold text-ink-900">Contents</h2>
        <ol className="mt-3 space-y-1">
          {contents.map((item, i) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="flex min-h-11 items-baseline gap-2 py-2 text-body text-ink-900 no-underline hover:text-pen-700"
              >
                <span className="font-serif">{item.title}</span>
                <span className="dot-leader" aria-hidden="true" />
                <span className="font-serif italic">{i + 2}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </section>
  )
}
