// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { API } from '../lib/constants';

export interface RubricItem {
  id: string;
  category: 'MIND' | 'GENERAL' | 'PARTICULAR';
  description: string;
  chapter: string | null;
  remedyCount: number;
}

export interface RubricRemedy {
  id: string;
  name: string;
  commonName: string | null;
  weight: number;
  constitutionType: string | null;
  thermalType: string | null;
  commonPotencies: string[];
}

export interface RemedyItem {
  id: string;
  name: string;
  commonName: string | null;
  constitutionType: string | null;
  thermalType: string | null;
  miasm: string | null;
  commonPotencies: string[];
}

export function useRubrics(category?: string, search?: string) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (search) params.set('search', search);
  const qs = params.toString();

  return useQuery({
    queryKey: ['rubrics', category, search],
    queryFn: () => api.get<RubricItem[]>(`${API.RUBRICS}${qs ? `?${qs}` : ''}`),
  });
}

export function useRubricRemedies(rubricId: string | undefined) {
  return useQuery({
    queryKey: ['rubric-remedies', rubricId],
    queryFn: () => api.get<RubricRemedy[]>(`${API.RUBRICS}/${rubricId}/remedies`),
    enabled: !!rubricId,
  });
}

export function useRemedies(search?: string) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return useQuery({
    queryKey: ['remedies', search],
    queryFn: () => api.get<RemedyItem[]>(`${API.REMEDIES}${qs}`),
  });
}

// AI-powered Kent's Repertory search
export function useSearchKentRubrics(query?: string) {
  return useQuery({
    queryKey: ['kent-rubric-search', query],
    queryFn: () => api.get<Array<{
      rubricId: string;
      description: string;
      category: 'MIND' | 'GENERAL' | 'PARTICULAR';
      chapter: string | null;
      importance: number;
      source: string;
      confidence: number;
      remedyCount: number;
    }>>(`${API.AI.KENT_SEARCH}?q=${encodeURIComponent(query || '')}`),
    enabled: !!query && query.length >= 2,
    staleTime: 60000, // Cache for 1 minute
  });
}

