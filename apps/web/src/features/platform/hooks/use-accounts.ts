import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type { StaffSummary, CreateAccountInput, UpdateAccountInput } from '@mmc/types';

const QUERY_KEY = 'accounts';

async function fetchAccounts(clinicId?: number, role?: string): Promise<StaffSummary[]> {
  const params = new URLSearchParams();
  if (clinicId) params.append('clinic_id', clinicId.toString());
  if (role) params.append('role', role);
  const q = params.toString() ? `?${params.toString()}` : '';
  const { data } = await apiClient.get<{ success: boolean; data: StaffSummary[] }>(`/clinicadmins${q}`);
  return data.data;
}

async function createAccount(body: CreateAccountInput): Promise<StaffSummary> {
  const { data } = await apiClient.post<{ success: boolean; data: StaffSummary }>('/clinicadmins', body);
  return data.data;
}

async function updateAccount({ id, ...body }: UpdateAccountInput & { id: number }): Promise<StaffSummary> {
  const { data } = await apiClient.put<{ success: boolean; data: StaffSummary }>(`/clinicadmins/${id}`, body);
  return data.data;
}

async function deleteAccount(id: number): Promise<void> {
  await apiClient.delete(`/clinicadmins/${id}`);
}

export function useAccounts(clinicId?: number, role?: string) {
  return useQuery({ queryKey: [QUERY_KEY, clinicId, role], queryFn: () => fetchAccounts(clinicId, role) });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
