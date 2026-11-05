import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthContext';

export function ProtectedRoute() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
