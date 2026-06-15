import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/auth'

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
