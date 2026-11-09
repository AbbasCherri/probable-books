import { createBrowserRouter } from 'react-router'
import { RootLayout } from './RootLayout'
import { RequireAuth } from './RequireAuth'
import { RouteError } from './RouteError'

/**
 * A lazily loaded page with its folio (the page number SiteFooter prints, numbered like the
 * page specs in design doc section 5). Route-level `lazy` means the router fetches the page's
 * code before it commits the navigation, so the current page stays on screen meanwhile.
 */
const page = (load, folio) => ({
  lazy: () => load().then((m) => ({ Component: m.default })),
  handle: { folio },
})

// First load only: the router is fetching the first page's code. Ruled paper, not a blank screen.
function PageFallback() {
  return <div className="mx-auto my-12 h-48 max-w-page ruled" aria-busy="true" />
}

export const routes = [
  {
    element: <RootLayout />,
    // Last resort, when the layout itself fails.
    errorElement: <RouteError standalone />,
    HydrateFallback: PageFallback,
    children: [
      {
        // A failing page renders here, inside the header and footer.
        errorElement: <RouteError />,
        children: [
          { path: '/', ...page(() => import('@/pages/home/HomePage'), 1) },
          { path: '/browse', ...page(() => import('@/pages/browse/BrowsePage'), 2) },
          {
            path: '/listings/:listingId',
            ...page(() => import('@/pages/listing-details/ListingDetailsPage'), 3),
          },
          {
            path: '/courses/:courseCode',
            ...page(() => import('@/pages/course-details/CourseDetailsPage'), 4),
          },
          { path: '/login', ...page(() => import('@/pages/auth/LoginPage'), 7) },
          { path: '/register', ...page(() => import('@/pages/auth/RegisterPage'), 8) },
          // Development only: the component sheet is not part of the product.
          ...(import.meta.env.DEV
            ? [
                {
                  path: '/styleguide',
                  ...page(() => import('@/pages/styleguide/StyleguidePage'), 10),
                },
              ]
            : []),
          {
            element: <RequireAuth />,
            children: [
              {
                path: '/sell',
                ...page(() => import('@/pages/listing-form/ListingFormPage'), 5),
              },
              {
                path: '/listings/:listingId/edit',
                ...page(() => import('@/pages/listing-form/ListingFormPage'), 5),
              },
              {
                path: '/dashboard',
                ...page(() => import('@/pages/dashboard/DashboardPage'), 6),
              },
            ],
          },
          { path: '*', ...page(() => import('@/pages/not-found/NotFoundPage'), 9) },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
