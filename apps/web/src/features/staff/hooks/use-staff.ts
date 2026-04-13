import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type { StaffMember, StaffSummary, StaffCategory } from '@mmc/types';
import type { CreateStaffInput, UpdateStaffInput } from '@mmc/validation';

const STAFF_KEY = 'staff';

// ─── Staff Queries ───

export function useStaffList(category: StaffCategory, params: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: [STAFF_KEY, category, params],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: StaffSummary[]; total: number }>('/staff', {
        params: { category, ...params },
      });
      return { data: data.data, total: data.total };
    },
  });
}

export function useStaffMember(category: StaffCategory, id: number) {
  return useQuery({
    queryKey: [STAFF_KEY, category, id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: StaffMember }>(`/staff/${id}`, {
        params: { category },
      });
      return data.data;
    },
    enabled: !!id && !!category,
  });
}

// ─── Staff Mutations ───

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStaffInput) => {
      const { data } = await apiClient.post<{ success: boolean; data: StaffMember }>('/staff', input);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [STAFF_KEY] }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ category, id, ...input }: UpdateStaffInput & { category: StaffCategory; id: number }) => {
      const { data } = await apiClient.put<{ success: boolean; data: StaffMember }>(`/staff/${id}`, input, {
        params: { category },
      });
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [STAFF_KEY] }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ category, id }: { category: StaffCategory; id: number }) => {
      await apiClient.delete(`/staff/${id}`, { params: { category } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [STAFF_KEY] }),
  });
}
