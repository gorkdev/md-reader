import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const ROLE_ORDER = { viewer: 0, editor: 1, admin: 2 }

export default function ProtectedRoute({ children, minRole }) {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Yükleniyor...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (minRole) {
    const userLevel = ROLE_ORDER[user?.role] ?? -1
    const needed = ROLE_ORDER[minRole] ?? 99
    if (userLevel < needed) {
      return <Navigate to="/" replace />
    }
  }

  return children
}
