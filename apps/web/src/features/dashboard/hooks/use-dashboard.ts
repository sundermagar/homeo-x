import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
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

export function useDashboard(period: string = 'month') {
  return useQuery({
    queryKey: dashboardKeys.detail(period),
    queryFn: () => fetchDashboard(period),
    staleTime: 5 * 60_000,  // 5 min — dashboards don't change second-by-second
    gcTime: 15 * 60_000,    // keep in cache 15 min after unmount
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
    staleTime: 5 * 60_000,
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
