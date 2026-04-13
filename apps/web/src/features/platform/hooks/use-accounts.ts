import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type { Account, CreateAccountInput, UpdateAccountInput } from '@mmc/types';

const QUERY_KEY = 'accounts';

async function fetchAccounts(clinicId?: number, role?: string): Promise<Account[]> {
  const params = new URLSearchParams();
  if (clinicId) params.append('clinic_id', clinicId.toString());
  if (role) params.append('role', role);
  const q = params.toString() ? `?${params.toString()}` : '';
  const { data } = await apiClient.get(`/accounts${q}`);
  return data;
}

async function createAccount(body: CreateAccountInput): Promise<Account> {
  const { data } = await apiClient.post('/accounts', body);
  return data;
}

async function updateAccount({ id, ...body }: UpdateAccountInput & { id: number }): Promise<Account> {
  const { data } = await apiClient.put(`/accounts/${id}`, body);
  return data;
}

async function deleteAccount(id: number): Promise<void> {
  await apiClient.delete(`/accounts/${id}`);
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
