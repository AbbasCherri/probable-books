import { Outlet, ScrollRestoration, useNavigation } from 'react-router'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { ToastProvider } from '@/components/ui/Toast'
import { useRouteFocus } from '@/hooks/useRouteFocus'

export function RootLayout() {
  const announcement = useRouteFocus('main')
  // The next page's code is loading: the current page stays up, with a pen line along the top.
  const pending = useNavigation().state === 'loading'

  return (
    <ToastProvider>
      {/* Column frame: the footer sits at the bottom of short pages. */}
      <div className="flex min-h-dvh flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {pending && (
          <div aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-0.5 bg-pen-600" />
        )}
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <p
        data-testid="route-announcer"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </p>
      <ScrollRestoration />
    </ToastProvider>
  )
}
