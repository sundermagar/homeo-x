import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/auth-store';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    // If the user was on a portal-related page (or came from portal flow),
    // redirect to /portal instead of /login
    const lastRole = localStorage.getItem('mmc-last-role');
    const isPatientContext = 
      lastRole === 'patient' || 
      location.pathname.startsWith('/portal') ||
      document.referrer.includes('/portal');
      
    return <Navigate to={isPatientContext ? '/portal' : '/login'} replace />;
  }

  return <Outlet />;
}
