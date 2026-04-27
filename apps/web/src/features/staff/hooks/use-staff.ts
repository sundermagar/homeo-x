import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type { StaffMember, StaffSummary, StaffCategory } from '@mmc/types';
import type { CreateStaffInput, UpdateStaffInput } from '@mmc/validation';

const STAFF_KEY = 'staff';

interface StaffListResponse {
  data: StaffSummary[];
  total: number;
}

// ─── Staff Queries ───

export function useStaffList(category: StaffCategory, params: { page?: number; limit?: number; search?: string }) {
  return useQuery<StaffListResponse>({
    queryKey: [STAFF_KEY, category, params],
    queryFn: async () => {
      const res = await apiClient.get('/staff', {
        params: { category, ...params },
      });
      // Interceptor unwraps success responses: res.data might be just the array
      // Use _original to get the full response body containing 'total'
      const body = (res as any)._original ?? res.data;
      return { 
        data: (body.data ?? res.data ?? []) as StaffSummary[], 
        total: (body.total ?? (Array.isArray(res.data) ? res.data.length : 0)) as number
      };
    },
  });
}

export function useStaffMember(category: StaffCategory, id: number) {
  return useQuery<StaffMember | null>({
    queryKey: [STAFF_KEY, category, id],
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get<any>(`/staff/${id}`, {
        params: { category },
      });
      const body = (res as any)._original ?? res.data;
      return (body.data ?? res.data) as StaffMember;
    },
    enabled: !!id && !!category,
  });
}

// ─── Staff Mutations ───

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStaffInput) => {
      const res = await apiClient.post<any>('/staff', input);
      const body = (res as any)._original ?? res.data;
      return body.data ?? res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [STAFF_KEY] }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ category, id, ...input }: UpdateStaffInput & { category: StaffCategory; id: number }) => {
      if (!id || isNaN(id)) {
        throw new Error('Invalid staff member ID');
      }
      const res = await apiClient.put<any>(`/staff/${id}`, input, {
        params: { category },
      });
      const body = (res as any)._original ?? res.data;
      return body.data ?? res.data;
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
