// @ts-nocheck
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { API } from '../lib/constants';
import type { Patient, CreatePatientInput, UpdatePatientInput, QueryPatientParams, PatientListResponse } from '../types/patient';

function buildQuery(params: QueryPatientParams): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export function usePatients(params: QueryPatientParams = {}) {
  return useQuery({
    queryKey: ['patients', params],
    queryFn: () => api.get<PatientListResponse>(`${API.PATIENTS}${buildQuery(params)}`),
  });
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.get<Patient>(`${API.PATIENTS}/${id}`),
    enabled: !!id,
  });
}

export function usePatientHistory(id: string | undefined) {
  return useQuery({
    queryKey: ['patient', id, 'history'],
    queryFn: () => api.get<{ visits: unknown[] }>(`${API.PATIENTS}/${id}/history`),
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePatientInput) =>
      api.post<Patient>(API.PATIENTS, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useUpdatePatient(id: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePatientInput) =>
      api.patch<Patient>(`${API.PATIENTS}/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      qc.invalidateQueries({ queryKey: ['patient', id] });
    },
  });
}
