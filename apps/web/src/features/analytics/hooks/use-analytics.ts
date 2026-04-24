import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/shared/hooks/use-api';
import type { 
  AnalyticsSummary, PatientTrendResult, MonthWiseResult, 
  MonthWiseDueSummary, MonthWiseDueDetail, BirthdayListResult, 
  ReferenceListResult 
} from '@mmc/types';

// Helper: safely unwrap the nested API envelope { success, data }
function unwrap<T>(res: any, fallback: T): T {
  const inner = res?.data?.data;
  return inner !== undefined && inner !== null ? inner : fallback;
}

export function useAnalyticsSummary() {
  const api = useApi();
  return useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => {
      const res = await api.get('/analytics/summary');
      return unwrap<AnalyticsSummary | null>(res, null);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePatientTrends(from?: Date, to?: Date) {
  const api = useApi();
  return useQuery({
    queryKey: ['analytics', 'trends', from?.toISOString(), to?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.append('from', from.toISOString());
      if (to) params.append('to', to.toISOString());
      const res = await api.get(`/analytics/patients?${params.toString()}`);
      return unwrap<PatientTrendResult | null>(res, null);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCaseMonthWise(fromYearMth: string, toYearMth: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['analytics', 'casemonthwise', fromYearMth, toYearMth],
    queryFn: async () => {
      const res = await api.get(`/analytics/casemonthwise?from_date=${fromYearMth}&to_date=${toYearMth}`);
      const inner = unwrap<any>(res, []);
      return Array.isArray(inner) ? inner as MonthWiseResult[] : [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMonthWiseDues(year: number) {
  const api = useApi();
  return useQuery({
    queryKey: ['analytics', 'monthwisedue', year],
    queryFn: async () => {
      const res = await api.get(`/analytics/monthwisedue?year=${year}`);
      const inner = unwrap<any>(res, []);
      return Array.isArray(inner) ? inner as MonthWiseDueSummary[] : [];
    },
  });
}

export function useDueDetails(year: number, month: number) {
  const api = useApi();
  return useQuery({
    queryKey: ['analytics', 'monthwisedue', 'details', year, month],
    queryFn: async () => {
      const res = await api.get(`/analytics/monthwisedue/details?year=${year}&month=${month}`);
      const inner = unwrap<any>(res, []);
      return Array.isArray(inner) ? inner as MonthWiseDueDetail[] : [];
    },
    enabled: !!year && !!month,
  });
}

export function useBirthdayList(fromDate?: string, toDate?: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['analytics', 'birthdays', fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      const res = await api.get(`/analytics/birthdaylist?${params.toString()}`);
      const inner = unwrap<any>(res, { patients: [], smsSentIds: [] });
      return (inner && typeof inner === 'object' && !Array.isArray(inner))
        ? inner as { patients: any[]; smsSentIds: number[] }
        : { patients: [], smsSentIds: [] };
    },
  });
}

export function useReferenceListing(from?: Date, to?: Date) {
  const api = useApi();
  return useQuery({
    queryKey: ['analytics', 'references', from?.toISOString(), to?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.append('from_date', from.toISOString());
      if (to) params.append('to_date', to.toISOString());
      const res = await api.get(`/analytics/referencelisting?${params.toString()}`);
      const inner = unwrap<any>(res, []);
      return Array.isArray(inner) ? inner as ReferenceListResult[] : [];
    },
  });
}

