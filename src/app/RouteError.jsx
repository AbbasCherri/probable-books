import { Link } from 'react-router'
import { PageShell } from '@/components/layout/PageShell'
import { pageTitleClass } from '@/components/layout/pageTitle'
import { Button } from '@/components/ui/Button'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

/**
 * The router's error boundary: a page threw while loading or rendering. Normally it renders
 * inside RootLayout (header and footer stay); `standalone` is the last resort for when the
 * layout itself failed, so it brings its own <main>.
 */
export function RouteError({ standalone = false }) {
  useDocumentTitle('This page didn’t print')

  const page = (
    <PageShell chapter="Misprint">
      <div role="alert" className="max-w-prose py-12">
        <h1 className={pageTitleClass}>This page didn&apos;t print</h1>
        <p className="mt-4 text-ink-700">
          Something jammed on our end. Reload to try again, or start over from the home page.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button onClick={() => window.location.reload()}>Reload</Button>
          <Link to="/" className="inline-flex min-h-11 items-center">
            Back to the home page
          </Link>
        </div>
      </div>
    </PageShell>
  )

  return standalone ? (
    <main id="main" tabIndex={-1} className="outline-none">
      {page}
    </main>
  ) : (
    page
  )
}
