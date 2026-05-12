import { useQuery, type QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type { ClinicAdminDashboardData } from '@mmc/types';

export const clinicAdminKeys = {
  all: ['clinicAdminDashboard'] as const,
  detail: (period: string) => [...clinicAdminKeys.all, 'detail', period] as const,
};

const fetchClinicAdminDashboard = async (period: string): Promise<ClinicAdminDashboardData> => {
  const res = await apiClient.get<{ success: boolean; data: ClinicAdminDashboardData }>('/dashboard/clinic-admin', { params: { period } });
  return res.data.data;
};

export function useClinicAdminDashboard(period: string = 'month') {
  return useQuery({
    queryKey: clinicAdminKeys.detail(period),
    queryFn: () => fetchClinicAdminDashboard(period),
    staleTime: 2 * 60_000,   // 2 min — financial aggregates don't need real-time refresh
    gcTime: 10 * 60_000,     // keep in cache 10 min after unmount
  });
}

/**
 * Kick off the clinic-admin dashboard query in the background.
 * Called from auth-provider on app boot so the data is already
 * in-flight by the time the dashboard component mounts.
 */
export function prefetchClinicAdminDashboard(qc: QueryClient, period: string = 'year'): void {
  void qc.prefetchQuery({
    queryKey: clinicAdminKeys.detail(period),
    queryFn: () => fetchClinicAdminDashboard(period),
    staleTime: 2 * 60_000,
  });
}
