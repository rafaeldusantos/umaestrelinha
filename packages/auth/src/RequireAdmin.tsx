import { Navigate } from 'react-router-dom'
import { useAuthContext } from './AuthContext'
import { Skeleton } from '@estrelinha/ui/skeleton'

const RequireAdmin = ({
  children,
  loginPath = '/login',
}: {
  children: React.ReactNode
  loginPath?: string
}) => {
  const { isAdmin, loading } = useAuthContext()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-estrelinha-admin-bg">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-8 w-48 bg-estrelinha-admin-border rounded" />
          <Skeleton className="h-4 w-full bg-estrelinha-admin-border rounded" />
          <Skeleton className="h-4 w-3/4 bg-estrelinha-admin-border rounded" />
        </div>
      </div>
    )
  }

  if (!isAdmin) return <Navigate to={loginPath} replace />

  return <>{children}</>
}

export default RequireAdmin
