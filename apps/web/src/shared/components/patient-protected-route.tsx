import { Navigate, Outlet } from 'react-router-dom';
import { usePatientAuthStore } from '@/shared/stores/patient-auth-store';

export function PatientProtectedRoute() {
  const isAuthenticated = usePatientAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/patient/login" replace />;
  return <Outlet />;
}
