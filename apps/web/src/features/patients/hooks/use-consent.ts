import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';

const CONSENT_KEY = 'consent';

export interface ConsentRecord {
  id: number;
  patientRegid: number;
  consentType: string;
  purpose: string;
  granted: boolean;
  grantedAt?: string;
  revokedAt?: string;
}

export interface GrantConsentInput {
  patientRegid: number;
  consentType: string;
  purpose: string;
  granted: boolean;
  consentVersion?: number;
}

export function useConsentStatus(regid: number) {
  return useQuery({
    queryKey: [CONSENT_KEY, regid],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: ConsentRecord[] }>(`/consent/${regid}`);
      return res.data.data ?? [];
    },
    enabled: !!regid,
  });
}

export function useGrantConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GrantConsentInput) => {
      const { data } = await apiClient.post<{ success: boolean; data: ConsentRecord }>('/consent', input);
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [CONSENT_KEY, vars.patientRegid] }),
  });
}

export function useRevokeConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ regid, type }: { regid: number; type: string }) => {
      await apiClient.delete(`/consent/${regid}/${type}`);
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [CONSENT_KEY, vars.regid] }),
  });
}
