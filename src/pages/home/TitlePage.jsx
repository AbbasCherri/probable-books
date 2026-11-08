import { CourseTab } from '@/components/annotate/CourseTab'
import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton'

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
          className="font-serif text-display-sm font-semibold tracking-tight text-ink-900 lg:text-display"
        >
          Everything on your syllabus, secondhand.
        </h1>
        <p className="mt-4 max-w-prose text-body text-ink-700">
          Textbooks, calculators and lab gear from students one year ahead of you.
        </p>
        <div className="mt-8">
          <h2 className="font-serif text-h3 text-ink-900">Popular this term</h2>
          {loading ? (
            <ListingCardSkeleton className="mt-3 h-12" />
          ) : (
            <ul className="mt-3 flex flex-wrap gap-3">
              {popular.map((c) => (
                <li key={c.code}>
                  <CourseTab code={c.code} asLink />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <nav aria-label="Contents" className="mt-10 lg:col-span-5 lg:mt-2">
        <h2 className="font-serif text-h3 text-ink-900">Contents</h2>
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
