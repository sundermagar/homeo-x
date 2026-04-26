// @ts-nocheck
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { API } from '../lib/constants';
import type {
  Visit,
  CreateVisitInput,
  UpdateVisitStatusInput,
  RecordVitalsInput,
  QueryVisitParams,
  VisitListResponse,
  Vitals,
} from '../types/visit';

function buildQuery(params: QueryVisitParams): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export function useVisits(params: QueryVisitParams = {}) {
  return useQuery({
    queryKey: ['visits', params],
    queryFn: () => api.get<VisitListResponse>(`${API.VISITS}${buildQuery(params)}`),
  });
}

export function useVisit(id: string | undefined) {
  return useQuery({
    queryKey: ['visit', id],
    queryFn: () => api.get<Visit>(`${API.VISITS}/${id}`),
    enabled: !!id,
    retry: false,
  });
}

export function useTodayQueue() {
  return useQuery({
    queryKey: ['queue'],
    queryFn: () => api.get<Visit[]>(`${API.VISITS}/queue`),
    refetchInterval: 30000,
  });
}

export function useCreateVisit() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVisitInput) =>
      api.post<Visit>(API.VISITS, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visits'] });
      qc.invalidateQueries({ queryKey: ['queue'] });
    },
  });
}

export function useUpdateVisitStatus(id: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateVisitStatusInput) =>
      api.patch<Visit>(`${API.VISITS}/${id}/status`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visits'] });
      qc.invalidateQueries({ queryKey: ['visit', id] });
      qc.invalidateQueries({ queryKey: ['queue'] });
    },
  });
}

export function useRecordVitals(visitId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: RecordVitalsInput) =>
      api.post<Vitals>(`${API.VISITS}/${visitId}/vitals`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visit', visitId] });
      qc.invalidateQueries({ queryKey: ['queue'] });
    },
  });
}
