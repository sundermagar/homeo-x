import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';

export interface Role {
  id: number;
  name: string;
  displayName: string;
  description: string;
  parent?: number;
  dept?: number;
}

export interface Permission {
  id: number;
  name: string;
  slug: string;
  module: string;
  description?: string;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

// ─── Roles ───

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await apiClient.get<Role[]>('/roles');
      return data;
    },
  });
}

export function useRole(id: number | null) {
  return useQuery({
    queryKey: ['roles', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await apiClient.get<RoleWithPermissions>(`/roles/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (role: Omit<Role, 'id'>) => {
      const { data } = await apiClient.post('/roles', role);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...role }: Role) => {
      const { data } = await apiClient.put(`/roles/${id}`, role);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['roles', variables.id] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.delete(`/roles/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

// ─── Permissions & Assignment ───

export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data } = await apiClient.get<Permission[]>('/permissions');
      return data;
    },
  });
}

export function useAssignPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: number; permissionIds: number[] }) => {
      const { data } = await apiClient.post(`/roles/${roleId}/permissions`, { permissionIds });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roles', variables.roleId] });
    },
  });
}
