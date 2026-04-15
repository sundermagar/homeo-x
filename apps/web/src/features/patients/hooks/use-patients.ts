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
      const res = await apiClient.get<any>('/patients', { params });
      return { 
        data: res.data || [], 
        total: (res as any)._original?.total || 0 
      };
    },
  });
}

export function usePatient(regid: number) {
  return useQuery({
    queryKey: [PATIENTS_KEY, regid],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/patients/${regid}`);
      return data || null;
    },
    enabled: !!regid,
  });
}

export function usePatientLookup(query: string) {
  return useQuery({
    queryKey: [PATIENTS_KEY, 'lookup', query],
    queryFn: async () => {
      const { data } = await apiClient.get<any>('/patients/lookup', { params: { query } });
      return Array.isArray(data) ? data : (data?.data || []);
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
      return data.data;
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
      const { data } = await apiClient.get<any>(`/patients/${regid}/family`);
      return Array.isArray(data) ? data : (data?.data || []);
    },
    enabled: !!regid,
  });
}

export function useFamilyGroups(params: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ['family-groups', params],
    queryFn: async () => {
      const res = await apiClient.get<any>('/patients/family-groups', { params });
      return { 
        data: res.data || [], 
        total: (res as any)._original?.total || 0 
      };
    },
  });
}

export function useAddFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ regid, memberRegid, relation }: { regid: number; memberRegid: number; relation: string }) => {
      const { data } = await apiClient.post<{ success: boolean; data: FamilyMember }>(`/patients/${regid}/family`, { memberRegid, relation });
      return data.data;
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
