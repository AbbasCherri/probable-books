import { Outlet, ScrollRestoration } from 'react-router'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { ToastProvider } from '@/components/ui/Toast'

export function RootLayout() {
  return (
    <ToastProvider>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <SiteFooter />
      <ScrollRestoration />
    </ToastProvider>
  )
}
