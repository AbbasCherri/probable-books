/**
 * Shown while a page's code (or the session, in RequireAuth) is still loading: the same frame as
 * PageShell, a running-header line over ruled paper, never a blank screen. It is at least a
 * screen tall and hides the footer (index.css), so nothing below it jumps when the page arrives.
 * Spacing is padding, not margin, so nothing collapses into the page around it.
 */
export function PageFallback() {
  return (
    <div
      data-page-fallback
      aria-busy="true"
      className="mx-auto w-full max-w-page px-4 pb-20 sm:px-8"
    >
      <div className="flex items-center gap-4 pt-5 sm:pt-6">
        <p className="font-serif text-small text-ink-500 italic">Loading</p>
        <span aria-hidden="true" className="flex-1 border-t border-paper-300" />
      </div>
      <div aria-hidden="true" className="min-h-dvh pt-5 sm:pt-6">
        <div className="h-48 ruled" />
      </div>
    </div>
  )
}
