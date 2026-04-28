// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { API } from '../lib/constants';
import type { Icd10Code } from '../types/ai';

export function useIcd10Search(query: string) {
  return useQuery({
    queryKey: ['icd10', 'search', query],
    queryFn: () => api.get<Icd10Code[]>(`${API.ICD10.SEARCH}?q=${encodeURIComponent(query)}&limit=15`),
    enabled: query.length >= 2,
    staleTime: 60000,
  });
}
