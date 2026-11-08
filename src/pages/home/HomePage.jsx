import { PageShell } from '@/components/layout/PageShell'
import { Button } from '@/components/ui/Button'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import * as api from '@/services/api'
import { TitlePage } from './TitlePage'
import { FeaturedSpread } from './FeaturedSpread'
import { FreshShelf } from './FreshShelf'
import { CourseIndex } from './CourseIndex'
import { HowSellingWorks } from './HowSellingWorks'

export default function HomePage() {
  useDocumentTitle('Used course gear by course code')
  const featured = useAsync(() => api.getFeaturedListings())
  const fresh = useAsync(() => api.getNewListings(10))
  const courses = useAsync(() => api.getCourses())

  const error = featured.error || fresh.error || courses.error
  if (error) {
    return (
      <PageShell chapter="Contents">
        <div role="alert" className="max-w-prose py-12">
          <h1 className="font-serif text-display-sm font-semibold text-ink-900 lg:text-display">
            This page didn&apos;t print
          </h1>
          <p className="mt-4 text-body text-ink-700">
            Something jammed on our end. Try again.
          </p>
          <Button
            className="mt-6"
            onClick={() => {
              featured.retry()
              fresh.retry()
              courses.retry()
            }}
          >
            Retry
          </Button>
        </div>
      </PageShell>
    )
  }

  const showFeatured = !featured.loading && (featured.data?.length ?? 0) > 0
  const contents = [
    showFeatured && { id: 'featured', title: 'Featured' },
    { id: 'fresh', title: 'Fresh this week' },
    { id: 'index', title: 'Browse by course' },
    { id: 'selling', title: 'How selling works' },
  ].filter(Boolean)

  return (
    <PageShell chapter="Contents">
      <div className="space-y-16 py-8 lg:space-y-24">
        <TitlePage courses={courses.data} loading={courses.loading} contents={contents} />
        {showFeatured && <FeaturedSpread listings={featured.data} />}
        <FreshShelf listings={fresh.data ?? []} loading={fresh.loading} />
        {courses.data && <CourseIndex courses={courses.data} />}
        <HowSellingWorks />
      </div>
    </PageShell>
  )
}
