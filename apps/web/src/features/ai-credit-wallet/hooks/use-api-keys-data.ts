import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { useMemo } from 'react';

export type KeyStatus = 'Valid' | 'Expiring soon' | 'Expired' | 'Revoked';

export interface ApiKey {
  id: string;
  provider: string;
  keyName: string;
  maskedPreview: string;
  status: KeyStatus;
  expiresAt: string | null;
  createdAt: string;
  lastRotatedAt: string | null;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'VIEWED_MASKED' | 'KEY_ADDED' | 'KEY_ROTATED' | 'KEY_REVOKED';
  provider: string;
  adminId: string;
  ipAddress: string;
}

export function useApiKeys() {
  const { data, isLoading } = useQuery({
    queryKey: ['aiOpsApiKeys'],
    queryFn: async () => {
      const res = await apiClient.get('/ai-ops/keys');
      const dbKeys = res.data.data;
      return dbKeys.map((k: any) => ({
        id: k.id.toString(),
        provider: k.provider.charAt(0).toUpperCase() + k.provider.slice(1),
        keyName: k.label,
        maskedPreview: k.maskedKey,
        status: k.status === 'active' ? 'Valid' : 'Revoked',
        expiresAt: null,
        createdAt: k.createdAt,
        lastRotatedAt: k.lastRotated,
        createdBy: 'admin',
      })) as ApiKey[];
    },
    staleTime: 120_000, // Keys rarely change — 2 min stale
    gcTime: 600_000,
  });

  return { data: data || [], loading: isLoading };
}

export function useAddApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { provider: string; label: string; key: string }) => {
      const res = await apiClient.post('/ai-ops/keys', params);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiOpsApiKeys'] });
    },
  });
}

export function useKeyAuditLogs(): AuditLog[] {
  return useMemo(() => [], []);
}
