import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './context'

/** Área admin: solo dueño y superadmin. El personal vuelve a la app móvil. */
export function RequireOwner() {
  const { profile, loading } = useAuth()
  if (loading) return null
  if (profile?.role !== 'owner' && profile?.role !== 'superadmin') return <Navigate to="/app" replace />
  return <Outlet />
}
