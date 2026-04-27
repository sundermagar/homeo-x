// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { API } from '../lib/constants';
import type { SpecialtyConfig } from '../types/specialty';

export function useSpecialties() {
  return useQuery({
    queryKey: ['specialties'],
    queryFn: () => api.get<SpecialtyConfig[]>(API.SPECIALTIES),
  });
}

export function useSpecialtyConfig(specialty: string | undefined) {
  return useQuery({
    queryKey: ['specialty-config', specialty],
    queryFn: () => api.get<SpecialtyConfig>(`${API.SPECIALTIES}/${specialty}/config`),
    enabled: !!specialty,
  });
}

export function useSoapTemplate(specialty: string | undefined) {
  return useQuery({
    queryKey: ['soap-template', specialty],
    queryFn: () => api.get<Record<string, unknown>>(`${API.SPECIALTIES}/${specialty}/soap-template`),
    enabled: !!specialty,
  });
}
