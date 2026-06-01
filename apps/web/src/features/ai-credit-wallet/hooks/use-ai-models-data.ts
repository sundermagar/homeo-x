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
      
      const usageMap = new Map(breakdown.map((b: any) => [b.modelId, b.credits]));

      const uniqueModels = new Map();
      dbModels.forEach((m: any) => {
        if (!uniqueModels.has(m.id)) {
          uniqueModels.set(m.id, m);
        }
      });
      const deduplicatedModels = Array.from(uniqueModels.values());

      return deduplicatedModels.map((m: any) => {
        const p = m.provider?.toLowerCase() || '';
        let modelType: 'Paid API' | 'Self-hosted' | 'Free' = 'Paid API';
        if (p === 'ollama' || m.capabilities?.local) modelType = 'Self-hosted';

        let featuresUsed: string[] = [];
        if (m.id.includes('scout')) featuresUsed = ['Consultation Analysis', 'General QA'];
        else if (m.id.includes('versatile')) featuresUsed = ['Symptom Checker', 'Prescription Gen'];
        else if (m.id.includes('qwen')) featuresUsed = ['Draft Responses'];
        else if (m.id.includes('flash')) featuresUsed = ['Audio Transcription'];
        else if (m.id.includes('haiku')) featuresUsed = ['Fallback Engine'];

        return {
          id: m.id,
          name: m.displayName,
          provider: m.provider.charAt(0).toUpperCase() + m.provider.slice(1),
          status: m.status?.toLowerCase() === 'active' ? 'Active' : 'Inactive',
          modelType,
          pricingBasis: 'Input + Output tokens',
          inputTokenCost: m.costPerInputToken || 0,
          outputTokenCost: m.costPerOutputToken || 0,
          monthlyRequests: 0,
          monthlyCredits: usageMap.get(m.id) || 0,
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
  return useMemo(() => {
    if (!modelId) return null;
    
    // Generate daily requests
    const dailyRequests = [];
    for (let i = 30; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyRequests.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        requests: Math.floor(Math.random() * 500) + 100,
      });
    }

    return {
      dailyRequests,
      tokens: [
        { name: 'Input Tokens', value: 8500000, fill: '#10b981' },
        { name: 'Output Tokens', value: 3200000, fill: '#3b82f6' },
      ],
      topFeatures: [
        { name: 'Consultation AI', percentage: 65 },
        { name: 'Summarisation', percentage: 25 },
        { name: 'Prescription AI', percentage: 10 },
      ],
      errorRate: 0.4,
      latencyP50: 840,
      latencyP95: 2100,
    };
  }, [modelId]);
}
