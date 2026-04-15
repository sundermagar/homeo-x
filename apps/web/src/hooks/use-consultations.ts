// @ts-nocheck
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { API } from '../lib/constants';
import type {
  StartConsultationResponse,
  CompleteConsultationInput,
  CompleteConsultationResponse,
  ConsultationSummary,
} from '../types/consultation';

export function useStartConsultation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (visitId: string) =>
      api.post<StartConsultationResponse>(`${API.CONSULTATIONS}/start`, { visitId }),
    onSuccess: (_, visitId) => {
      qc.invalidateQueries({ queryKey: ['visit', visitId] });
      qc.invalidateQueries({ queryKey: ['queue'] });
    },
  });
}

export function useCompleteConsultation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CompleteConsultationInput) =>
      api.post<CompleteConsultationResponse>(`${API.CONSULTATIONS}/complete`, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['visit', variables.visitId] });
      qc.invalidateQueries({ queryKey: ['consultation-summary', variables.visitId] });
      qc.invalidateQueries({ queryKey: ['queue'] });
      qc.invalidateQueries({ queryKey: ['visits'] });
    },
  });
}

export function useConsultationSummary(visitId: string | undefined) {
  return useQuery({
    queryKey: ['consultation-summary', visitId],
    queryFn: () => api.get<ConsultationSummary>(`${API.CONSULTATIONS}/${visitId}/summary`),
    enabled: !!visitId,
  });
}
