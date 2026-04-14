import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type { Patient, PatientSummary, FamilyMember, PatientFormMeta } from '@mmc/types';
import type { CreatePatientInput, UpdatePatientInput } from '@mmc/validation';

const PATIENTS_KEY = 'patients';
const FAMILY_KEY = 'family-members';

// ─── Patient Queries ───

export function usePatients(params: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: [PATIENTS_KEY, params],
    queryFn: async () => {
      const res = await apiClient.get('/patients', { params });
      // Interceptor unwraps success responses: res.data is already the data array
      // For list endpoints, the response shape varies based on interceptor match
      const body = (res as any)._original ?? res.data;
      return { data: body.data ?? res.data ?? [], total: body.total ?? res.data?.length ?? 0 };
    },
  });
}

export function usePatient(regid: number) {
  return useQuery({
    queryKey: [PATIENTS_KEY, regid],
    queryFn: async () => {
      const res = await apiClient.get(`/patients/${regid}`);
      // Interceptor unwraps: res.data is the patient object directly
      return res.data ?? null;
    },
    enabled: !!regid,
  });
}

export function usePatientLookup(query: string) {
  return useQuery({
    queryKey: [PATIENTS_KEY, 'lookup', query],
    queryFn: async () => {
      const res = await apiClient.get('/patients/lookup', { params: { query } });
      return res.data ?? [];
    },
    enabled: query.length >= 2,
  });
}

export function usePatientFormMeta() {
  return useQuery({
    queryKey: [PATIENTS_KEY, 'meta'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean } & PatientFormMeta>('/patients/meta/form');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Patient Mutations ───

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePatientInput) => {
      const { data } = await apiClient.post<{ success: boolean; data: Patient; regid: number }>('/patients', input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PATIENTS_KEY] }),
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ regid, ...input }: UpdatePatientInput & { regid: number }) => {
      const { data } = await apiClient.put<{ success: boolean; data: Patient }>(`/patients/${regid}`, input);
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [PATIENTS_KEY] });
      qc.invalidateQueries({ queryKey: [PATIENTS_KEY, vars.regid] });
    },
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (regid: number) => {
      await apiClient.delete(`/patients/${regid}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PATIENTS_KEY] }),
  });
}

// ─── Family Group ───

export function useFamilyMembers(regid: number) {
  return useQuery({
    queryKey: [FAMILY_KEY, regid],
    queryFn: async () => {
      const res = await apiClient.get(`/patients/${regid}/family`);
      return res.data ?? [];
    },
    enabled: !!regid,
  });
}

export function useFamilyGroups(params: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ['family-groups', params],
    queryFn: async () => {
      const res = await apiClient.get('/patients/family-groups', { params });
      const body = (res as any)._original ?? res.data;
      return { data: body.data ?? res.data ?? [], total: body.total ?? 0 };
    },
  });
}

export function useAddFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ regid, memberRegid, relation }: { regid: number; memberRegid: number; relation: string }) => {
      const { data } = await apiClient.post<{ success: boolean; data: FamilyMember }>(`/patients/${regid}/family`, { memberRegid, relation });
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [FAMILY_KEY, vars.regid] }),
  });
}

export function useRemoveFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ regid, id }: { regid: number; id: number }) => {
      await apiClient.delete(`/patients/${regid}/family/${id}`);
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: [FAMILY_KEY, vars.regid] }),
  });
}
