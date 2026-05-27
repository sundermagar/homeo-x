import { useMemo } from 'react';

export type PricingType = 'Input + Output tokens' | 'Per minute of audio' | 'Configurable';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  status: 'Active' | 'Inactive';
  pricingBasis: PricingType;
  inputTokenCost?: number; // ₹ per 1K
  outputTokenCost?: number; // ₹ per 1K
  perMinuteCost?: number; // ₹
  flatCost?: number; // ₹
  monthlyRequests: number;
  monthlyCredits: number;
  monthlyCost: number;
}

export function useAIModels(): AIModel[] {
  return useMemo(() => [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'OpenAI',
      status: 'Active',
      pricingBasis: 'Input + Output tokens',
      inputTokenCost: 0.41,
      outputTokenCost: 1.25,
      monthlyRequests: 14500,
      monthlyCredits: 12000,
      monthlyCost: 12.00,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'OpenAI',
      status: 'Active',
      pricingBasis: 'Input + Output tokens',
      inputTokenCost: 0.012,
      outputTokenCost: 0.05,
      monthlyRequests: 8200,
      monthlyCredits: 2100,
      monthlyCost: 2.10,
    },
    {
      id: 'claude-sonnet-3.5',
      name: 'Claude Sonnet 3.5',
      provider: 'Anthropic',
      status: 'Active',
      pricingBasis: 'Input + Output tokens',
      inputTokenCost: 0.25,
      outputTokenCost: 1.25,
      monthlyRequests: 5400,
      monthlyCredits: 4800,
      monthlyCost: 4.80,
    },
    {
      id: 'claude-haiku',
      name: 'Claude Haiku 3.5',
      provider: 'Anthropic',
      status: 'Inactive',
      pricingBasis: 'Input + Output tokens',
      inputTokenCost: 0.02,
      outputTokenCost: 0.10,
      monthlyRequests: 0,
      monthlyCredits: 0,
      monthlyCost: 0,
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'Google',
      status: 'Active',
      pricingBasis: 'Input + Output tokens',
      inputTokenCost: 0.29,
      outputTokenCost: 0.87,
      monthlyRequests: 3200,
      monthlyCredits: 2800,
      monthlyCost: 2.80,
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: 'Google',
      status: 'Inactive',
      pricingBasis: 'Input + Output tokens',
      inputTokenCost: 0.01,
      outputTokenCost: 0.03,
      monthlyRequests: 120,
      monthlyCredits: 40,
      monthlyCost: 0.04,
    },
    {
      id: 'whisper-v3',
      name: 'Whisper v3',
      provider: 'OpenAI',
      status: 'Active',
      pricingBasis: 'Per minute of audio',
      perMinuteCost: 0.50,
      monthlyRequests: 7540,
      monthlyCredits: 10500,
      monthlyCost: 10.50,
    },
    {
      id: 'llama-3',
      name: 'Custom / Self-hosted',
      provider: 'Local',
      status: 'Active',
      pricingBasis: 'Configurable',
      flatCost: 0,
      monthlyRequests: 1100,
      monthlyCredits: 0,
      monthlyCost: 0,
    },
  ], []);
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
      errorRate: 0.4, // 0.4%
      latencyP50: 840, // ms
      latencyP95: 2100, // ms
    };
  }, [modelId]);
}
