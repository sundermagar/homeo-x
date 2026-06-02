import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { API } from '@/lib/constants';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AbhaStatus {
  regid: number;
  patientName: string;
  abhaId: string | null;
  isLinked: boolean;
  profile: AbhaProfile | null;
}

export interface AbhaProfile {
  healthIdNumber: string;
  healthId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string | null;
  status: string;
  kycVerified?: boolean;
}

export interface AbhaSearchResult {
  txnId: string;
  message: string;
  _sandbox?: { note: string; otp: string };
}

export interface AbhaVerifyResult {
  verified: boolean;
  profile: AbhaProfile;
}

export interface AbhaLinkResult {
  regid: number;
  patientName: string;
  abhaId: string;
  abhaAddress: string | null;
  linkedAt: string;
  message: string;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** Fetch the ABHA linking status for a patient */
export function useAbhaStatus(regid: number) {
  return useQuery<AbhaStatus>({
    queryKey: ['abha-status', regid],
    queryFn: async () => {
      const res = await apiClient.get(API.ABHA.RECORD(String(regid)));
      return res.data.data;
    },
    enabled: !!regid,
  });
}

/** Step 1: Search for ABHA by Aadhaar or Mobile (initiates OTP) */
export function useAbhaSearch() {
  return useMutation<AbhaSearchResult, Error, { identifier: string; type: 'aadhaar' | 'mobile' }>({
    mutationFn: async (input) => {
      const res = await apiClient.post(API.ABHA.SEARCH, input);
      return res.data.data;
    },
  });
}

/** Step 2: Verify OTP and get ABHA profile */
export function useAbhaVerify(regid: number) {
  return useMutation<AbhaVerifyResult, Error, { txnId: string; otp: string }>({
    mutationFn: async (input) => {
      const res = await apiClient.post(API.ABHA.VERIFY(String(regid)), input);
      return res.data.data;
    },
  });
}

/** Step 3: Link ABHA to patient record */
export function useAbhaLink(regid: number) {
  const qc = useQueryClient();
  return useMutation<AbhaLinkResult, Error, { abhaNumber: string; abhaAddress?: string }>({
    mutationFn: async (input) => {
      const res = await apiClient.post(API.ABHA.LINK(String(regid)), input);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['abha-status', regid] });
      qc.invalidateQueries({ queryKey: ['patient', regid] });
      qc.invalidateQueries({ queryKey: ['medical-case', 'full', regid] });
    },
  });
}

/** Unlink ABHA from patient record */
export function useAbhaUnlink(regid: number) {
  const qc = useQueryClient();
  return useMutation<any, Error>({
    mutationFn: async () => {
      const res = await apiClient.post(API.ABHA.UNLINK(String(regid)));
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['abha-status', regid] });
      qc.invalidateQueries({ queryKey: ['patient', regid] });
      qc.invalidateQueries({ queryKey: ['medical-case', 'full', regid] });
    },
  });
}
