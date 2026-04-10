import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/hooks/use-api';

export function useFullMedicalCase(regid: number) {
  const api = useApi();
  return useQuery({
    queryKey: ['medical-case', 'full', regid],
    queryFn: async () => {
      const res = await api.get(`/medical-cases/patient/${regid}/full`);
      return res.data;
    },
    enabled: !!regid,
  });
}

export function useManageClinicalRecords() {
  const api = useApi();
  const queryClient = useQueryClient();

  const saveVitals = useMutation({
    mutationFn: (data: any) => api.post('/medical-cases/vitals', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'full', variables.regid] });
    },
  });

  const saveSoap = useMutation({
    mutationFn: (data: any) => api.post('/medical-cases/soap', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'full', variables.regid] });
    },
  });

  const saveNote = useMutation({
    mutationFn: (data: any) => api.post('/medical-cases/records/notes', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'full', variables.regid] });
    },
  });

  const savePrescription = useMutation({
    mutationFn: (data: any) => api.post('/medical-cases/records/prescriptions', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'full', variables.regid] });
    },
  });

  const deleteRecord = useMutation({
    mutationFn: ({ type, id }: { type: string; id: number }) => api.delete(`/medical-cases/records/${type}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'full'] });
    },
  });

  const finalizeConsultation = useMutation({
    mutationFn: ({ regid, ...data }: any) => api.post(`/medical-cases/${regid}/finalize`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'full', variables.regid] });
    },
  });

  return {
    saveVitals,
    saveSoap,
    saveNote,
    savePrescription,
    deleteRecord,
    finalizeConsultation,
  };
}
