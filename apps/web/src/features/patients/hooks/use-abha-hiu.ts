import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useRequestConsentMutation() {
  return useMutation({
    mutationFn: async (data: { abhaId: string; purpose: string }) => {
      const response = await api.post('/api/abha/consents/request', data);
      return response.data; // { consentId, status, message }
    },
  });
}

export function usePollConsentStatusQuery(consentId: string | null) {
  return useQuery({
    queryKey: ['abha-consent-status', consentId],
    queryFn: async () => {
      if (!consentId) return null;
      const response = await api.get(`/api/abha/consents/${consentId}/status`);
      return response.data; // { consentId, status, consentArtifactId }
    },
    enabled: !!consentId,
    refetchInterval: (query) => {
      // Poll every 3 seconds if it's still REQUESTED
      const data = query.state?.data as any;
      if (data && data.status === 'GRANTED') return false;
      return 3000;
    },
  });
}

export function useFetchHealthInfoMutation() {
  return useMutation({
    mutationFn: async (data: { consentArtifactId: string }) => {
      const response = await api.post('/api/abha/health-information/fetch', data);
      return response.data; // { transactionId }
    },
  });
}

export interface ParsedMedicalRecord {
  id: string;
  patientName: string;
  doctorName: string;
  date: string;
  hospitalName: string;
  diagnoses: string[];
  medications: Array<{
    name: string;
    dosage?: string;
  }>;
}

export function useAbhaHistoryQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['abha-history-records'],
    queryFn: async () => {
      const response = await api.get('/api/abha/health-information/records');
      return response.data as ParsedMedicalRecord[];
    },
    enabled,
  });
}
