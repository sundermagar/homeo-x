// @ts-nocheck
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { API } from '../lib/constants';
import type {
  ScribingSession,
  CreateSessionInput,
  AddSegmentsInput,
  GenerateSoapFromTranscriptInput,
  UpdateSessionInput,
} from '../types/scribing';
import type { SoapSuggestion, HomeopathyConsultResult } from '../types/ai';

export function useScribingSession(visitId: string | undefined) {
  return useQuery({
    queryKey: ['scribing-session', visitId],
    queryFn: () => api.get<ScribingSession>(API.SCRIBING.SESSION(visitId!)),
    enabled: false, // Backend session CRUD not yet migrated — prevents 404 console spam
    retry: false,
  });
}

export function useCreateScribingSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSessionInput) =>
      api.post<ScribingSession>(API.SCRIBING.SESSIONS, data),
    onSuccess: (result) => {
      qc.setQueryData(['scribing-session', result.visitId], result);
    },
  });
}

export function useAddSegments() {
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: AddSegmentsInput }) =>
      api.post<void>(API.SCRIBING.SEGMENTS(sessionId), data),
  });
}

export function usePauseSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      api.patch<ScribingSession>(API.SCRIBING.PAUSE(sessionId)),
    onSuccess: (result) => {
      qc.setQueryData(['scribing-session', result.visitId], result);
    },
  });
}

export function useResumeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      api.patch<ScribingSession>(API.SCRIBING.RESUME(sessionId)),
    onSuccess: (result) => {
      qc.setQueryData(['scribing-session', result.visitId], result);
    },
  });
}

export function useEndSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      api.patch<ScribingSession>(API.SCRIBING.END(sessionId)),
    onSuccess: (result) => {
      qc.setQueryData(['scribing-session', result.visitId], result);
    },
  });
}

export function useUpdateScribingSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: UpdateSessionInput }) =>
      api.patch(`${API.SCRIBING.UPDATE(sessionId)}`, data),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ['scribing-session', sessionId] });
    },
  });
}

export function usePublicScribingSession(visitId: string) {
  return useQuery({
    queryKey: ['scribing-session-public', visitId],
    queryFn: () => api.get<ScribingSession>(API.SCRIBING.PUBLIC(visitId)),
    enabled: !!visitId,
    refetchInterval: 5000, 
  });
}

export function useGenerateSoapFromTranscript() {
  return useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: GenerateSoapFromTranscriptInput }) =>
      api.post<SoapSuggestion>(API.SCRIBING.GENERATE_SOAP(sessionId), data),
  });
}

export function useHomeopathyConsult() {
  return useMutation({
    mutationFn: (data: {
      transcript: string;
      visitId: string;
      patientAge?: number;
      patientGender?: string;
      thermalReaction?: string;
      miasm?: string;
      labReports?: Record<string, string>;
    }) => api.post<HomeopathyConsultResult>(API.AI.CONSULT_HOMEOPATHY, data),
  });
}
