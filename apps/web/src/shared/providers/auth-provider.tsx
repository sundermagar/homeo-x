import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/shared/stores/auth-store';
import { prefetchDashboard } from '@/features/dashboard/hooks/use-dashboard';
import { prefetchClinicAdminDashboard } from '@/features/dashboard/hooks/use-clinic-admin-dashboard';

export function AuthProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userType = useAuthStore((s) => s.user?.type);
  const queryClient = useQueryClient();

  // When the app boots with a hydrated auth (page reload, returning visitor),
  // start fetching the single dashboard variant matching this user's role.
  // Firing both 'month' and 'day' simultaneously doubled pool pressure and
  // made the first load slower — pick one based on the role.
  useEffect(() => {
    if (!isAuthenticated) return;
    const role = String(userType || '').toLowerCase();

    if (role === 'clinicadmin') {
      // Clinic admins use a separate, heavier endpoint — prefetch it
      // with 'year' period (default landing view).
      prefetchClinicAdminDashboard(queryClient, 'year');
    } else {
      const period = role === 'doctor' ? 'day' : 'month';
      prefetchDashboard(queryClient, period);
    }
  }, [isAuthenticated, userType, queryClient]);

  return <>{children}</>;
}
