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
      const response = await apiClient.get<{ success: boolean, data: Role[] }>('/roles');
      return response.data.data || [];
    },
  });
}

export function useRole(id: number | null) {
  return useQuery({
    queryKey: ['roles', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get<{ success: boolean, data: RoleWithPermissions }>(`/roles/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (role: Omit<Role, 'id'>) => {
      const response = await apiClient.post<{ success: boolean, data: Role }>('/roles', role);
      return response.data.data;
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
      const response = await apiClient.put<{ success: boolean, data: Role }>(`/roles/${id}`, role);
      return response.data.data;
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
      const response = await apiClient.delete<{ success: boolean }>(`/roles/${id}`);
      return response.data;
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
      const response = await apiClient.get<{ success: boolean, data: Permission[] }>('/permissions');
      return response.data.data || [];
    },
  });
}

export function useAssignPermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: number; permissionIds: number[] }) => {
      const response = await apiClient.post<{ success: boolean }>(`/roles/${roleId}/permissions`, { permissionIds });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roles', variables.roleId] });
    },
  });
}

export function useCreatePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (permission: Omit<Permission, 'id' | 'slug'>) => {
      const response = await apiClient.post<{ success: boolean, data: Permission }>('/permissions', permission);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}

export function useUpdatePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...permission }: Permission) => {
      const response = await apiClient.put<{ success: boolean, data: Permission }>(`/permissions/${id}`, permission);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] }); // Invalidate roles since they might contain updated permission info
    },
  });
}

export function useDeletePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete<{ success: boolean }>(`/permissions/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}
