import { useUser } from '@clerk/clerk-react'
import { Navigate, useLocation } from 'react-router-dom'

export default function ProtectedRoute({ children, role }) {
  const { isLoaded, isSignedIn, user } = useUser()
  const location = useLocation()

  if (!isLoaded) return <div>Loading...</div>

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />
  }

  const userRole = user.publicMetadata?.role

  if (location.pathname === '/choose-role' && userRole) {
    return <Navigate to={`/${userRole}-dashboard`} replace />
  }

  if (!userRole && location.pathname !== '/choose-role') {
    return <Navigate to="/choose-role" replace />
  }

  if (role && userRole && role !== userRole) {
    return <Navigate to={`/${userRole}-dashboard`} replace />
  }

  return children
}
