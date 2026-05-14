import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/auth-store';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return null; // Or a full-page spinner
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
