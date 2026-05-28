import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { getAiModuleColor } from '../constants/aiModuleColors';

// ─── Shared stale time constants ───
// Summary rarely changes (wallet balance). 60s stale = 1 API call per minute max.
const SUMMARY_STALE_MS = 60_000;
// Timeline data is historical aggregates. 2 min stale is plenty.
const TIMELINE_STALE_MS = 120_000;
// Transactions change more often, but 30s is enough.
const TRANSACTIONS_STALE_MS = 30_000;

export function useCreditSummary() {
  const { data, isLoading } = useQuery({
    queryKey: ['aiOpsSummary'],
    queryFn: async () => {
      const res = await apiClient.get('/ai-ops/summary');
      return res.data.data;
    },
    staleTime: SUMMARY_STALE_MS,
    gcTime: SUMMARY_STALE_MS * 5,
  });

  return {
    ...(data || {
      totalAllocated: 0,
      consumed: 0,
      remaining: 0,
      percentageUsed: '0',
      dailyBurnRate: 0,
      burnRateTrend: 0,
      resetDate: new Date().toISOString(),
    }),
    loading: isLoading,
  };
}

export function useCreditTimeline(days: number = 7, endDateStr?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['aiOpsTimeline', days, endDateStr],
    queryFn: async () => {
      let url = `/ai-ops/timeline?days=${days}`;
      if (endDateStr) url += `&endDate=${endDateStr}`;
      const res = await apiClient.get(url);
      return res.data.data;
    },
    staleTime: TIMELINE_STALE_MS,
    gcTime: TIMELINE_STALE_MS * 5,
  });

  return { data: data || [], loading: isLoading };
}

export function useModuleBreakdown() {
  const { data, isLoading } = useQuery({
    queryKey: ['aiOpsModelBreakdown'],
    queryFn: async () => {
      const res = await apiClient.get('/ai-ops/breakdown/features');
      const rawData = res.data.data || [];
      
      const totalCredits = rawData.reduce((sum: number, item: any) => sum + (item.credits || 0), 0);
      
      if (totalCredits === 0) return [];
      
      return rawData
        .filter((item: any) => item.credits > 0)
        .sort((a: any, b: any) => b.credits - a.credits)
        .map((item: any) => {
          const featureName = item.feature || 'Unknown';
          const pct = Math.round((item.credits / totalCredits) * 100);
          return {
            name: featureName,
            value: item.credits,
            percent: pct,
            color: getAiModuleColor(featureName),
          };
        });
    },
    staleTime: SUMMARY_STALE_MS,
    gcTime: SUMMARY_STALE_MS * 5,
  });

  return { data: data || [], loading: isLoading };
}

export function useRecentTransactions() {
  const { data, isLoading } = useQuery({
    queryKey: ['aiOpsTransactions'],
    queryFn: async () => {
      const res = await apiClient.get('/ai-ops/transactions/recent');
      const rawData = res.data.data || [];
      return rawData.map((tx: any) => ({
        ...tx,
        title: tx.description || (tx.type === 'DEPOSIT' ? 'Credit Top-up' : 'AI Request'),
        time: tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        // Map DEDUCTION/DEPOSIT to specific UI types for icons
        type: tx.type === 'DEPOSIT' ? 'add' : (tx.description?.toLowerCase().includes('prescription') ? 'prescription' : 
              tx.description?.toLowerCase().includes('summary') ? 'summary' : 
              tx.description?.toLowerCase().includes('transcription') ? 'stt' : 'consultation'),
      }));
    },
    staleTime: TRANSACTIONS_STALE_MS,
    gcTime: TRANSACTIONS_STALE_MS * 5,
  });

  return { data: data || [], loading: isLoading };
}

export function useBurnForecast() {
  // This hook derives everything from useCreditSummary — no extra API call.
  // Because useCreditSummary has staleTime, this won't trigger a refetch.
  const summary = useCreditSummary();
  
  if (summary.loading || summary.totalAllocated === 0) {
    return {
      daysRemainingCredits: 0,
      daysUntilReset: 0,
      projectedShortfall: 0,
      exhaustionDate: '',
    };
  }

  const daysRemainingCredits = summary.dailyBurnRate > 0 
    ? Math.floor(summary.remaining / summary.dailyBurnRate) 
    : 999;
  
  const resetDate = new Date(summary.resetDate);
  const today = new Date();
  const diffTime = Math.max(0, resetDate.getTime() - today.getTime());
  const daysUntilReset = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let projectedShortfall = 0;
  if (daysRemainingCredits < daysUntilReset && summary.dailyBurnRate > 0) {
    projectedShortfall = (daysUntilReset - daysRemainingCredits) * summary.dailyBurnRate;
  }
  
  const exhaustionDateObj = new Date();
  exhaustionDateObj.setDate(exhaustionDateObj.getDate() + daysRemainingCredits);
  
  return {
    daysRemainingCredits,
    daysUntilReset,
    projectedShortfall,
    exhaustionDate: exhaustionDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
}
