import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/context/AuthContext'

export function RequireAuth() {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready)
    return <div className="ruled mx-auto my-12 h-48 max-w-page" aria-busy="true" />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
