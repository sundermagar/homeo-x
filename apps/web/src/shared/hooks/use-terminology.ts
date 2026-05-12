import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/shared/hooks/use-api';

export interface IcdCodeResult {
  id: number;
  code: string;
  version: string;
  description: string;
  chapter?: string | null;
  category?: string | null;
}

export interface LoincCodeResult {
  id: number;
  loincNum: string;
  component: string;
  system?: string | null;
  units?: string | null;
  description: string;
}

export interface ProcedureCodeResult {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
}

export interface SnomedConceptResult {
  id: number;
  conceptId: string;
  fsn: string;
  term: string;
  conceptType?: string | null;
  active?: boolean | null;
}

export function useSearchIcd(query: string, limit = 20) {
  const api = useApi();
  return useQuery({
    queryKey: ['terminology', 'icd', 'search', query, limit],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: IcdCodeResult[] }>(
        '/terminology/icd/search',
        { params: { q: query, limit } }
      );
      return res.data.data;
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    placeholderData: (prev) => prev,
  });
}

export function useSearchLoinc(query: string, limit = 20) {
  const api = useApi();
  return useQuery({
    queryKey: ['terminology', 'loinc', 'search', query, limit],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: LoincCodeResult[] }>(
        '/terminology/loinc/search',
        { params: { q: query, limit } }
      );
      return res.data.data;
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useSearchProcedures(query: string, limit = 20) {
  const api = useApi();
  return useQuery({
    queryKey: ['terminology', 'procedures', 'search', query, limit],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: ProcedureCodeResult[] }>(
        '/terminology/procedures/search',
        { params: { q: query, limit } }
      );
      return res.data.data;
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useSearchSnomed(query: string, limit = 20) {
  const api = useApi();
  return useQuery({
    queryKey: ['terminology', 'snomed', 'search', query, limit],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: SnomedConceptResult[] }>(
        '/terminology/snomed/search',
        { params: { q: query, limit } }
      );
      return res.data.data;
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useGetSnomedDetails(conceptId: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['terminology', 'snomed', conceptId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: SnomedConceptResult }>(
        `/terminology/snomed/${conceptId}`
      );
      return res.data.data;
    },
    enabled: !!conceptId && conceptId.length > 0,
  });
}
