import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { useMemo } from 'react';

export type FeatureColor = '#10B981' | '#3B82F6' | '#F59E0B' | '#93C5FD' | '#F43F5E';

export interface RoutingRule {
  id: string;
  feature: string;
  color: FeatureColor;
  primaryModel: string;
  fallbackModels: string[];
  dailyBudget: number;
  isEnabled: boolean;
}

export interface ClinicWallet {
  id: string;
  name: string;
  monthlyLimit: number;
  spentThisMonth: number;
}

export interface AlertRule {
  id: string;
  title: string;
  description: string;
  type: 'threshold' | 'event' | 'days';
  threshold?: number;
  inApp: boolean;
  email: boolean;
  sms: boolean;
}

// Map strings back to colors based on features roughly, or assign dynamically
function getColorForFeature(feature: string): FeatureColor {
  const map: Record<string, FeatureColor> = {
    'consultation': '#10B981',
    'transcription': '#3B82F6',
    'symptoms': '#F59E0B',
    'prescription': '#F43F5E'
  };
  return map[feature] || '#93C5FD';
}

export function useRoutingRules() {
  const { data, isLoading } = useQuery({
    queryKey: ['aiOpsRoutingRules'],
    queryFn: async () => {
      const res = await apiClient.get('/ai-ops/routing-rules');
      const dbRules = res.data.data;
      return dbRules.map((r: any) => ({
        id: r.id.toString(),
        feature: r.feature,
        color: getColorForFeature(r.feature),
        primaryModel: r.primaryModel,
        fallbackModels: r.fallbackModels || [],
        dailyBudget: 0,
        isEnabled: r.isActive,
      })) as RoutingRule[];
    },
    staleTime: 60_000, // 1 min stale
    gcTime: 300_000,
  });

  return { data: data || [], loading: isLoading };
}

export function useClinicWallets() {
  const { data, isLoading } = useQuery({
    queryKey: ['aiOpsClinicWallets'],
    queryFn: async () => {
      const res = await apiClient.get('/ai-ops/clinic-wallets');
      return res.data.data as ClinicWallet[];
    },
    staleTime: 60_000,
    gcTime: 300_000,
  });

  return { data: data || [], loading: isLoading };
}

export function useAlertRules() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['aiOpsBudgetAlerts'],
    queryFn: async () => {
      const res = await apiClient.get('/ai-ops/budget-alerts');
      return res.data.data as AlertRule[];
    },
    staleTime: 60_000,
    gcTime: 300_000,
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AlertRule> }) => {
      const res = await apiClient.put(`/ai-ops/budget-alerts/${id}`, updates);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiOpsBudgetAlerts'] });
    },
  });

  return { 
    data: data || [], 
    loading: isLoading,
    updateRule: updateRuleMutation.mutate,
    isUpdating: updateRuleMutation.isPending
  };
}
