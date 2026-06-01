import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { useMemo } from 'react';

export type PricingType = 'Input + Output tokens' | 'Per minute of audio' | 'Configurable';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  status: 'Active' | 'Inactive';
  modelType: 'Paid API' | 'Self-hosted' | 'Free';
  pricingBasis: PricingType;
  inputTokenCost?: number; // ₹ per 1K
  outputTokenCost?: number; // ₹ per 1K
  perMinuteCost?: number; // ₹
  flatCost?: number; // ₹
  monthlyRequests: number;
  monthlyCredits: number;
  monthlyCost: number;
  featuresUsed: string[];
}

const USD_TO_INR = 84;

export function useAIModels() {
  const { data, isLoading } = useQuery({
    queryKey: ['aiOpsModels'],
    queryFn: async () => {
      const [modelsRes, breakdownRes] = await Promise.all([
        apiClient.get('/ai-ops/models'),
        apiClient.get('/ai-ops/breakdown/models')
      ]);
      const dbModels = modelsRes.data.data || [];
      const breakdown = breakdownRes.data.data || [];

      // Build lookup maps for requests and credits per model
      const requestsMap = new Map(breakdown.map((b: any) => [b.modelId, b.requests]));
      const creditsMap = new Map(breakdown.map((b: any) => [b.modelId, b.credits]));

      const uniqueModels = new Map();
      dbModels.forEach((m: any) => {
        if (!uniqueModels.has(m.id)) {
          uniqueModels.set(m.id, m);
        }
      });
      const deduplicatedModels = Array.from(uniqueModels.values());

      return deduplicatedModels.map((m: any) => {
        const p = m.provider?.toLowerCase() || '';
        let modelType: 'Paid API' | 'Self-hosted' | 'Free' = 'Free';
        if ((m.costPerInputToken && m.costPerInputToken > 0) || (m.costPerOutputToken && m.costPerOutputToken > 0)) {
          modelType = 'Paid API';
        }
        if (p === 'ollama' || m.capabilities?.local) {
          modelType = 'Self-hosted';
        }
        if (m.id.includes('flash')) {
          modelType = 'Free';
        }

        let featuresUsed: string[] = [];
        if (m.id.includes('scout')) featuresUsed = ['Consultation Analysis', 'General QA'];
        else if (m.id.includes('versatile')) featuresUsed = ['Symptom Checker', 'Prescription Gen'];
        else if (m.id.includes('qwen')) featuresUsed = ['Draft Responses'];
        else if (m.id.includes('flash')) featuresUsed = ['Audio Transcription'];
        else if (m.id.includes('haiku')) featuresUsed = ['Fallback Engine'];
        else if (m.id.includes('stt') || m.id.includes('google-stt')) featuresUsed = ['Transcription'];

        return {
          id: m.id,
          name: m.displayName,
          provider: m.provider.charAt(0).toUpperCase() + m.provider.slice(1),
          status: m.status?.toLowerCase() === 'active' ? 'Active' : 'Inactive',
          modelType,
          pricingBasis: 'Input + Output tokens',
          inputTokenCost: (m.costPerInputToken || 0) * USD_TO_INR,
          outputTokenCost: (m.costPerOutputToken || 0) * USD_TO_INR,
          monthlyRequests: requestsMap.get(m.id) || 0,
          monthlyCredits: creditsMap.get(m.id) || 0,
          monthlyCost: 0,
          featuresUsed
        };
      }) as AIModel[];
    },
    staleTime: 120_000,
    gcTime: 600_000,
  });

  return { data: data || [], loading: isLoading };
}

export function useModelDetails(modelId: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ['aiOpsModelDetails', modelId],
    queryFn: async () => {
      if (!modelId) return null;
      const res = await apiClient.get(`/ai-ops/models/${modelId}/stats`);
      return res.data.data;
    },
    enabled: !!modelId,
    staleTime: 60_000,
  });

  return { data, loading: isLoading };
}
