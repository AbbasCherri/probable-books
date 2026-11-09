import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/context/AuthContext'
import { PageFallback } from './PageFallback'

export function RequireAuth() {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <PageFallback />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
