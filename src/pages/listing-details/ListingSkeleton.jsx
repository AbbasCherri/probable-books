import { PageShell } from '@/components/layout/PageShell'

/**
 * Loading: ruled-paper placeholders in the shape of the finished page (gallery, then the facts
 * panel), so nothing jumps when the listing arrives. No shimmer (doc 2).
 */
export function ListingSkeleton() {
  return (
    <PageShell chapter="Listing">
      <div
        role="status"
        aria-busy="true"
        className="mt-5 grid gap-8 sm:mt-6 lg:grid-cols-12 lg:gap-x-12"
      >
        <span className="sr-only">Loading the listing</span>
        <div aria-hidden="true" className="-mx-4 sm:mx-0 lg:col-span-7">
          <div className="aspect-4/3 border-y border-dashed border-paper-400 bg-paper-50 sm:mt-2 sm:rounded-paper sm:border" />
        </div>
        <div aria-hidden="true" className="flex flex-col gap-5 lg:col-span-5">
          <span className="h-7 w-24 rounded-t-paper border-b border-paper-400 bg-paper-200" />
          <div className="flex flex-col gap-4 pt-2">
            <span className="h-6 w-11/12 border-b-2 border-paper-300" />
            <span className="h-6 w-2/3 border-b-2 border-paper-300" />
          </div>
          <span className="ruled h-24" />
          <span className="h-12 rounded-paper border border-dashed border-paper-400" />
        </div>
      </div>
    </PageShell>
  )
}
