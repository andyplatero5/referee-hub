import { Navigate, Outlet } from 'react-router';
import { useAuth, type Role } from '../auth/AuthContext';
import { ForbiddenPage } from '../pages/ForbiddenPage';

interface ProtectedRouteProps {
  /** Si se indica, solo esos roles ven la ruta; el resto ve "acceso denegado". */
  roles?: Role[];
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <p role="status" className="p-8 text-center" data-testid="session-loading">
        Cargando…
      </p>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <ForbiddenPage />;
  return <Outlet />;
}
