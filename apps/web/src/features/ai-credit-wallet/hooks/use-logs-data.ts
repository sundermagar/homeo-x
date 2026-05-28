import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { useMemo } from 'react';

export type LogStatus = 'SUCCESS' | 'FAILED' | 'FALLBACK_USED' | 'DEPOSIT_COMPLETED';
export type LogType = 'DEDUCTION' | 'DEPOSIT';

export interface RequestLog {
  id: string;
  type: LogType;
  createdAt: string;
  feature: string;
  modelId: string;
  isFallback: boolean;
  tenantId: string;
  userId: string;
  userName?: string;
  prompt: string;
  responseText: string;
  inputTokens?: number;
  outputTokens?: number;
  audioMinutes?: number;
  creditsDeducted: number;
  costInr: number;
  runningBalance?: number;
  latencyMs?: number;
  status: LogStatus;
  errorCode?: string;
  sessionId: string;
}

export function useRequestLogs(page = 1, limit = 20, search = '') {
  const { data, isLoading } = useQuery({
    queryKey: ['aiOpsLogs', page, limit, search],
    queryFn: async () => {
      const res = await apiClient.get(`/ai-ops/logs?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
      const { logs, total } = res.data.data;
      return {
        total,
        logs: logs.map((l: any) => ({
          id: l.id.toString(),
          type: 'DEDUCTION' as LogType,
          createdAt: l.createdAt,
          feature: l.feature,
          modelId: l.modelId,
          isFallback: l.isFallback,
          tenantId: l.tenantId,
          userId: l.userId,
          userName: l.userName,
          prompt: l.promptText || '',
          responseText: l.responseText || '',
          inputTokens: l.inputTokens || 0,
          outputTokens: l.outputTokens || 0,
          creditsDeducted: l.creditsDeducted || 0,
          costInr: Number(l.costInr) || 0,
          latencyMs: l.latencyMs || 0,
          status: l.status as LogStatus,
          errorCode: l.errorCode,
          sessionId: l.id.toString(),
        })) as RequestLog[],
      };
    },
    staleTime: 30_000, // Logs change more often — 30s stale
    gcTime: 150_000,
  });

  return { data: data?.logs || [], total: data?.total || 0, loading: isLoading };
}

export function useFailedRequestsData() {
  return useMemo(() => {
    return [];
  }, []);
}
