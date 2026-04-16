import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type { ClinicAdminDashboardData } from '@mmc/types';

export const clinicAdminKeys = {
  all: ['clinicAdminDashboard'] as const,
  detail: (period: string) => [...clinicAdminKeys.all, 'detail', period] as const,
};

export function useClinicAdminDashboard(period: string = 'month') {
  return useQuery({
    queryKey: clinicAdminKeys.detail(period),
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: ClinicAdminDashboardData }>('/dashboard/clinic-admin', { params: { period } });
      return res.data.data;
    },
    staleTime: 60_000,
    refetchInterval: 300_000,
  });
}
