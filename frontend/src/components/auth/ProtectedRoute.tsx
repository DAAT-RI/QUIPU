import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  // DEBUG: Log estado del ProtectedRoute
  console.log('[ProtectedRoute] Estado:', { user: user?.email ?? null, loading })

  if (loading) {
    console.log('[ProtectedRoute] Mostrando spinner (loading=true)')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    console.log('[ProtectedRoute] Redirigiendo a /login (no user)')
    return <Navigate to="/login" replace />
  }

  console.log('[ProtectedRoute] Mostrando contenido protegido')
  return <Outlet />
}
