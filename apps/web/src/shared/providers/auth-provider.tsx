import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/shared/stores/auth-store';
import { prefetchDashboard } from '@/features/dashboard/hooks/use-dashboard';
import { prefetchClinicAdminDashboard } from '@/features/dashboard/hooks/use-clinic-admin-dashboard';
import { apiClient } from '@/infrastructure/api-client';

export function AuthProvider({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userType = useAuthStore((s) => s.user?.type);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);
  const finishLoading = useAuthStore((s) => s.finishLoading);
  const queryClient = useQueryClient();

  // Initial session check on mount
  useEffect(() => {
    const checkSession = async () => {
      if (isAuthenticated) {
        finishLoading();
        return;
      }
      try {
        const { data } = await apiClient.get('/auth/me', { skipErrorToast: true } as any);
        if (data.success && data.data?.user) {
          setAuth(data.data.user);
        } else {
          finishLoading();
        }
      } catch (err) {
        // Not logged in or token expired
        logout();
      }
    };
    checkSession();
  }, [isAuthenticated, setAuth, logout, finishLoading]);

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
