import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router'
import { RootLayout } from './RootLayout'
import { RequireAuth } from './RequireAuth'

const page = (loader) => {
  const Page = lazy(loader)
  return (
    <Suspense
      fallback={<div className="ruled mx-auto my-12 h-48 max-w-page" aria-busy="true" />}
    >
      <Page />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: page(() => import('@/pages/home/HomePage')) },
      { path: '/browse', element: page(() => import('@/pages/browse/BrowsePage')) },
      {
        path: '/listings/:listingId',
        element: page(() => import('@/pages/listing-details/ListingDetailsPage')),
      },
      {
        path: '/courses/:courseCode',
        element: page(() => import('@/pages/course-details/CourseDetailsPage')),
      },
      { path: '/login', element: page(() => import('@/pages/auth/LoginPage')) },
      { path: '/register', element: page(() => import('@/pages/auth/RegisterPage')) },
      {
        path: '/styleguide',
        element: page(() => import('@/pages/styleguide/StyleguidePage')),
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: '/sell',
            element: page(() => import('@/pages/listing-form/ListingFormPage')),
          },
          {
            path: '/listings/:listingId/edit',
            element: page(() => import('@/pages/listing-form/ListingFormPage')),
          },
          {
            path: '/dashboard',
            element: page(() => import('@/pages/dashboard/DashboardPage')),
          },
        ],
      },
      { path: '*', element: page(() => import('@/pages/not-found/NotFoundPage')) },
    ],
  },
])
