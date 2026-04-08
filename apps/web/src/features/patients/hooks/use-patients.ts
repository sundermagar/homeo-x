import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type { Patient, PatientSummary, ApiResponse, PaginatedResponse } from '@mmc/types';
import type { CreatePatientInput, UpdatePatientInput } from '@mmc/validation';

const PATIENTS_KEY = 'patients';

export function usePatients(params: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: [PATIENTS_KEY, params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<PatientSummary>>('/patients', { params });
      return data;
    },
  });
}

export function usePatient(regid: number) {
  return useQuery({
    queryKey: [PATIENTS_KEY, regid],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Patient>>(`/patients/${regid}`);
      return data.data!;
    },
    enabled: !!regid,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePatientInput) => {
      const { data } = await apiClient.post<ApiResponse<Patient>>('/patients', input);
      return data.data!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [PATIENTS_KEY] }),
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ regid, ...input }: UpdatePatientInput & { regid: number }) => {
      const { data } = await apiClient.put<ApiResponse<Patient>>(`/patients/${regid}`, input);
      return data.data!;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [PATIENTS_KEY] });
      qc.invalidateQueries({ queryKey: [PATIENTS_KEY, vars.regid] });
    },
  });
}
