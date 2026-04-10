import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/shared/hooks/use-api';
import type { 
  AnalyticsSummary, PatientTrendResult, MonthWiseResult, 
  MonthWiseDueSummary, MonthWiseDueDetail, BirthdayListResult, 
  ReferenceListResult 
} from '@mmc/types';

export function useAnalyticsSummary() {
  const api = useApi();
  return useQuery({
    queryKey: ['analytics', 'summary'],
    queryFn: async () => {
      const { data } = await api.get<AnalyticsSummary>('/analytics/summary');
      return data ?? null;
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
      const { data } = await api.get<PatientTrendResult>(`/analytics/patients?${params.toString()}`);
      return data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCaseMonthWise(fromYearMth: string, toYearMth: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['analytics', 'casemonthwise', fromYearMth, toYearMth],
    queryFn: async () => {
      const { data } = await api.get<MonthWiseResult[]>(`/analytics/casemonthwise?from_date=${fromYearMth}&to_date=${toYearMth}`);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMonthWiseDues(year: number) {
  const api = useApi();
  return useQuery({
    queryKey: ['analytics', 'monthwisedue', year],
    queryFn: async () => {
      const { data } = await api.get<MonthWiseDueSummary[]>(`/analytics/monthwisedue?year=${year}`);
      return data ?? [];
    },
  });
}

export function useDueDetails(year: number, month: number) {
  const api = useApi();
  return useQuery({
    queryKey: ['analytics', 'monthwisedue', 'details', year, month],
    queryFn: async () => {
      const { data } = await api.get<MonthWiseDueDetail[]>(`/analytics/monthwisedue/details?year=${year}&month=${month}`);
      return data ?? [];
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
      const { data } = await api.get<{ patients: any[], smsSentIds: number[] }>(`/analytics/birthdaylist?${params.toString()}`);
      return data ?? { patients: [], smsSentIds: [] };
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
      const { data } = await api.get<ReferenceListResult[]>(`/analytics/referencelisting?${params.toString()}`);
      return data ?? [];
    },
  });
}


