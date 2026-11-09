import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthProvider } from '@/context/AuthContext'

/**
 * Render `ui` as the element of a route inside a memory data router, wrapped like the app is.
 *   const { user, router } = renderWithRouter(<BrowsePage />, {
 *     route: '/browse?category=textbook',   // the URL the router starts on
 *     path: '/browse',                       // the route pattern `ui` is mounted at
 *   })
 * Options:
 *   routes   extra route objects (e.g. a stub `/listings/:id` to land on after navigate())
 *   auth     wrap in <AuthProvider> (it reads pb.session through the mock API, so seed
 *            localStorage first and await what the component renders once it is ready)
 * Returns Testing Library's render result plus `router` and a userEvent `user`.
 */
export function renderWithRouter(
  ui,
  { route = '/', path = '/', routes = [], auth = false } = {},
) {
  const router = createMemoryRouter([{ path, element: ui }, ...routes], {
    initialEntries: [route],
  })
  let tree = (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  )
  if (auth) tree = <AuthProvider>{tree}</AuthProvider>
  return { user: userEvent.setup(), router, ...render(tree) }
}
