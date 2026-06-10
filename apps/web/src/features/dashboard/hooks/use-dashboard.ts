import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import type { UnifiedDashboardData } from '@mmc/types';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  detail: (period: string) => [...dashboardKeys.all, 'detail', period] as const,
};

const fetchDashboard = async (period: string): Promise<UnifiedDashboardData> => {
  const res = await apiClient.get<{ success: boolean; data: UnifiedDashboardData }>(
    '/dashboard',
    { params: { period } },
  );
  return res.data.data;
};

let dashboardSocket: any = null;

export function useDashboard(period: string = 'month', options?: { refetchInterval?: number }) {
  const qc = useQueryClient();

  // Socket listener for real-time updates to staff/dashboard status
  useEffect(() => {
    if (!dashboardSocket) {
      const baseUrl = (import.meta.env['VITE_API_URL'] || '').replace(/\/api\/?$/, '');
      dashboardSocket = io(baseUrl || window.location.origin, {
        withCredentials: true,
      });
    }

    const handler = (data: any) => {
      console.log('Real-time doctor update received in dashboard:', data);
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
      qc.invalidateQueries({ queryKey: ['doctors'] });
    };

    dashboardSocket.on('doctorStatusChanged', handler);
    return () => {
      dashboardSocket.off('doctorStatusChanged', handler);
    };
  }, [qc]);

  return useQuery({
    queryKey: dashboardKeys.detail(period),
    queryFn: () => fetchDashboard(period),
    staleTime: 10_000,      // 10s — dashboard reflects live queue/appointments
    gcTime: 15 * 60_000,    // keep in cache 15 min after unmount
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: true,
  });
}

/**
 * Kick off the dashboard query in the background. Returns immediately so callers
 * (login, app-boot) don't wait — by the time the dashboard route mounts the data
 * is already in flight or cached, hiding the network RTT behind the navigation.
 */
export function prefetchDashboard(qc: QueryClient, period: string = 'month'): void {
  void qc.prefetchQuery({
    queryKey: dashboardKeys.detail(period),
    queryFn: () => fetchDashboard(period),
    staleTime: 10_000,
  });
}

export function useMarkReminderDone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.post(`/dashboard/reminder/${id}/done`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
