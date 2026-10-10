import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth'

export function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="loading-state">Memeriksa sesi pengguna...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (allowedRoles && !allowedRoles.includes(user.peran)) {
    return <Navigate to="/" replace />
  }

  return children
}
