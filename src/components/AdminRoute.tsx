import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isAdminEmail } from '../config/adminWhitelist'
import { AdminPage } from '../pages/AdminPage'

/**
 * Protects /admin in production: only whitelisted email addresses can access.
 * In development, access is still restricted to whitelisted users.
 */
export function AdminRoute() {
  const { user, loading } = useAuth()
  const isProd = import.meta.env.PROD

  if (loading) {
    return (
      <div className="admin-page" style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading…</p>
      </div>
    )
  }

  if (isProd) {
    if (!user || !isAdminEmail(user.email)) {
      return <Navigate to="/" replace />
    }
  }

  return <AdminPage />
}
