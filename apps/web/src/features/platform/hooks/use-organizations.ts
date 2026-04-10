import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type { Organization, CreateOrganizationInput, UpdateOrganizationInput } from '@mmc/types';

const QUERY_KEY = 'organizations';

async function fetchOrganizations(): Promise<Organization[]> {
  const { data } = await apiClient.get('/organizations');
  return data;
}

async function fetchOrganization(id: number): Promise<Organization> {
  const { data } = await apiClient.get(`/organizations/${id}`);
  return data;
}

async function createOrganization(body: CreateOrganizationInput): Promise<Organization> {
  const { data } = await apiClient.post('/organizations', body);
  return data;
}

async function updateOrganization({ id, ...body }: UpdateOrganizationInput & { id: number }): Promise<Organization> {
  const { data } = await apiClient.put(`/organizations/${id}`, body);
  return data;
}

async function deleteOrganization(id: number): Promise<void> {
  await apiClient.delete(`/organizations/${id}`);
}

export function useOrganizations() {
  return useQuery({ queryKey: [QUERY_KEY], queryFn: fetchOrganizations });
}

export function useOrganization(id: number) {
  return useQuery({ queryKey: [QUERY_KEY, id], queryFn: () => fetchOrganization(id) });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createOrganization,
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateOrganization,
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useDeleteOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteOrganization,
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}
