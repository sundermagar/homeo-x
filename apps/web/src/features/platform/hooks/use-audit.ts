import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';

export interface AuditLogEntry {
  id: number;
  action: string;
  tenantId: string;
  userId: number | null;
  correlationId: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
  ip?: string;
  userAgent?: string;
  oldData?: any;
  newData?: any;
  metadata?: any;
}

const QUERY_KEY = 'audit-logs';

async function fetchAuditLogs(params: { action?: string; userId?: number; tenantId?: string; limit?: number; offset?: number }) {
  const searchParams = new URLSearchParams();
  if (params.action) searchParams.append('action', params.action);
  if (params.userId) searchParams.append('user_id', params.userId.toString());
  if (params.tenantId) searchParams.append('tenant_id', params.tenantId);
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.offset) searchParams.append('offset', params.offset.toString());
  
  const q = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const { data } = await apiClient.get<{ success: boolean; data: AuditLogEntry[]; total: number }>(`/audit${q}`);
  return data;
}

export function useAuditLogs(params: { action?: string; userId?: number; tenantId?: string; limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => fetchAuditLogs(params),
  });
}
