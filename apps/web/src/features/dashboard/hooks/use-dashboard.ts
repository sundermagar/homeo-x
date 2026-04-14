import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type { UnifiedDashboardData } from '@mmc/types';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  detail: (period: string) => [...dashboardKeys.all, 'detail', period] as const,
};

export function useDashboard(period: string = 'month') {
  return useQuery({
    queryKey: dashboardKeys.detail(period),
    queryFn: async () => {
      const res = await apiClient.get('/dashboard', { params: { period } });
      return res.data as UnifiedDashboardData;
    },
    staleTime: 60_000, // 1 minute stale time
    refetchInterval: 300_000, // Auto refresh every 5 minutes
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
