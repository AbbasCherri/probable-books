import { PageShell } from '@/components/layout/PageShell'

/**
 * Loading: ruled-paper placeholders on the finished page's grid (same columns, gaps, padding
 * and gallery box as ListingDetailsPage and ImageGallery), so nothing moves when the listing
 * arrives. min-h-screen keeps the footer out of view until then. No shimmer (doc 2).
 */
export function ListingSkeleton() {
  return (
    <PageShell chapter="Listing" className="pb-0 lg:pb-20">
      <h1 className="sr-only">Listing details</h1>
      <div
        role="status"
        aria-busy="true"
        className="mt-5 grid min-h-screen grid-cols-1 content-start gap-8 sm:mt-6 lg:grid-cols-12 lg:gap-x-0 lg:gap-y-14"
      >
        <span className="sr-only">Loading the listing</span>
        {/* Left page: the gallery's box (ImageGallery root, stage and photo frame). */}
        <div aria-hidden="true" className="min-w-0 lg:col-span-7 lg:pr-12">
          <div className="-mx-4 sm:mx-0">
            <div data-testid="gallery-skeleton" className="sm:mt-2">
              <div className="overflow-hidden border-y border-dashed border-paper-400 bg-paper-50 sm:rounded-paper sm:border">
                <div className="aspect-4/3 w-full" />
              </div>
            </div>
          </div>
        </div>
        {/* Right page: course tabs, title, price, the main action. */}
        <div
          aria-hidden="true"
          className="min-w-0 lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:border-l lg:border-paper-300 lg:pl-12"
        >
          <div className="flex flex-col gap-5">
            <span className="-mb-2 flex min-h-11 items-end">
              <span className="h-7 w-24 rounded-t-paper border-b border-paper-400 bg-paper-200" />
            </span>
            <div className="flex flex-col gap-4 pt-2">
              <span className="h-6 w-11/12 border-b-2 border-paper-300" />
              <span className="h-6 w-2/3 border-b-2 border-paper-300" />
            </div>
            <span className="ruled h-24" />
            <span className="hidden h-12 rounded-paper border border-dashed border-paper-400 lg:block" />
          </div>
        </div>
      </div>
    </PageShell>
  )
}
