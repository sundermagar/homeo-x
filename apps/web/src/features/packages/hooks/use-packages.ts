import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/hooks/use-api';
import type { PackagePlan, PatientPackage, AssignPackageDto, CreatePackagePlanDto } from '@mmc/types';

// ─── Package Plans ────────────────────────────────────────────────────────────

export function usePackagePlans() {
  const api = useApi();
  return useQuery<PackagePlan[]>({
    queryKey: ['package-plans'],
    queryFn: async () => {
      const { data } = await api.get('/packages');
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
  });
}

export function useCreatePackagePlan() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePackagePlanDto) => api.post('/packages', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['package-plans'] }),
  });
}

export function useUpdatePackagePlan() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreatePackagePlanDto> & { isActive?: boolean } }) =>
      api.put(`/packages/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['package-plans'] }),
  });
}

export function useDeletePackagePlan() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/packages/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['package-plans'] }),
  });
}

// ─── Patient Packages / Subscriptions ────────────────────────────────────────

export function usePatientPackages(regid: number) {
  const api = useApi();
  return useQuery<PatientPackage[]>({
    queryKey: ['patient-packages', regid],
    queryFn: async () => {
      const { data } = await api.get(`/packages/patient/${regid}`);
      return Array.isArray(data) ? data : (data?.data ?? []);
    },
    enabled: !!regid,
  });
}

export function useActivePackage(regid: number) {
  const api = useApi();
  return useQuery<PatientPackage | null>({
    queryKey: ['active-package', regid],
    queryFn: async () => {
      const { data } = await api.get(`/packages/patient/${regid}/active`);
      return data?.data ?? null;
    },
    enabled: !!regid,
  });
}

export function useAssignPackage() {
  const api = useApi();
  const qc  = useQueryClient();
  return useMutation({
    mutationFn: (dto: AssignPackageDto & { patientId: number }) =>
      api.post('/packages/assign', dto),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['patient-packages', vars.regid] });
      qc.invalidateQueries({ queryKey: ['active-package', vars.regid] });
    },
  });
}

export function useCancelSubscription() {
  const api = useApi();
  const qc  = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionId: number) => api.delete(`/packages/subscription/${subscriptionId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patient-packages'] }),
  });
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export function usePackageExpiryReport(fromDate?: string, toDate?: string) {
  const api = useApi();
  const params = new URLSearchParams();
  if (fromDate) params.set('from_date', fromDate);
  if (toDate)   params.set('to_date', toDate);
  return useQuery({
    queryKey: ['package-expiry', fromDate, toDate],
    queryFn: async () => {
      const { data } = await api.get(`/packages/analytics/expiry?${params.toString()}`);
      return data?.data ?? { from: '', to: '', records: [] };
    },
  });
}

export function usePackageRevenueStats() {
  const api = useApi();
  return useQuery({
    queryKey: ['package-stats'],
    queryFn: async () => {
      const { data } = await api.get('/packages/analytics/stats');
      return data?.data ?? { totalRevenue: 0, activeCount: 0, expiredCount: 0 };
    },
  });
}
