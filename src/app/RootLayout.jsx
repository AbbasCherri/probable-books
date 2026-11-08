import { Outlet, ScrollRestoration } from 'react-router'
import { ToastProvider } from '@/components/ui/Toast'

// Header and footer (SiteHeader, SiteFooter) are shared components, built in their own PR.
export function RootLayout() {
  return (
    <ToastProvider>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <main id="main" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <ScrollRestoration />
    </ToastProvider>
  )
}
