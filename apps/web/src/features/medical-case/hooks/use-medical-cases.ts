import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/shared/hooks/use-api';

export function useFullMedicalCase(regid: number) {
  const api = useApi();
  return useQuery({
    queryKey: ['medical-case', 'full', regid],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any }>(`/medical-cases/patient/${regid}/full`);
      return res.data.data;
    },
    enabled: !!regid,
  });
}

export function useMasterVaccines() {
  const api = useApi();
  return useQuery({
    queryKey: ['vaccines', 'master'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>('/medical-cases/vaccines/master');
      return res.data.data;
    },
  });
}

export function useExaminations(regid: number) {
  const api = useApi();
  return useQuery({
    queryKey: ['medical-case', 'examinations', regid],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>(`/medical-cases/examination/${regid}`);
      return res.data.data;
    },
    enabled: !!regid,
  });
}

export function usePackageHistory(regid: number) {
  const api = useApi();
  return useQuery({
    queryKey: ['medical-case', 'packages', regid],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>(`/medical-cases/packages/${regid}`);
      return res.data.data;
    },
    enabled: !!regid,
  });
}

export function useAdditionalCharges(regid: number) {
  const api = useApi();
  return useQuery({
    queryKey: ['medical-case', 'additional-charges', regid],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>(`/medical-cases/additional-charges/${regid}`);
      return res.data.data;
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

  const deleteVitals = useMutation({
    mutationFn: (id: number) => api.delete(`/medical-cases/vitals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'full'] });
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

  const saveHomeoDetails = useMutation({
    mutationFn: (data: any) => api.post('/medical-cases/records/homeo-details', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'full', variables.regid] });
    },
  });

  const saveInvestigation = useMutation({
    mutationFn: (data: any) => api.post('/medical-cases/records/investigations', data),
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

  const saveVaccine = useMutation({
    mutationFn: (data: any) => api.post('/medical-cases/vaccines', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'full', variables.regid] });
    },
  });

  const deleteVaccine = useMutation({
    mutationFn: (id: number) => api.delete(`/medical-cases/vaccines/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'full'] });
    },
  });

  const saveReminder = useMutation({
    mutationFn: (data: any) => api.post('/medical-cases/reminders', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'full', variables.regid] });
    },
  });

  const deleteReminder = useMutation({
    mutationFn: (id: number) => api.delete(`/medical-cases/reminders/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'full'] });
    },
  });

  const saveExamination = useMutation({
    mutationFn: (data: any) => api.post('/medical-cases/records/examination', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'examinations', variables.regid] });
    },
  });

  const deleteExamination = useMutation({
    mutationFn: (id: number) => api.delete(`/medical-cases/records/examination/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'examinations'] });
    },
  });

  const saveAdditionalCharge = useMutation({
    mutationFn: (data: any) => api.post('/medical-cases/additional-charges', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'additional-charges', variables.regid] });
    },
  });

  const deleteAdditionalCharge = useMutation({
    mutationFn: (id: number) => api.delete(`/medical-cases/additional-charges/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'additional-charges'] });
    },
  });

  const saveImage = useMutation({
    mutationFn: (data: FormData) => api.post('/medical-cases/records/images', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    onSuccess: (_, variables) => {
      const regid = (variables as any).get('regid');
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'full', Number(regid)] });
    },
  });

  const deleteImage = useMutation({
    mutationFn: (id: number) => api.delete(`/medical-cases/records/images/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'full'] });
    },
  });
  
  const updateImage = useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/medical-cases/records/images/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'full'] });
    },
  });

  const updateDiagnosis = useMutation({
    mutationFn: ({ regid, condition }: { regid: number; condition: string }) =>
      api.put(`/medical-cases/${regid}/diagnosis`, { condition }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'full', variables.regid] });
    },
  });

  return {
    saveVitals,
    deleteVitals,
    saveSoap,
    saveNote,
    savePrescription,
    saveHomeoDetails,
    saveInvestigation,
    saveExamination,
    deleteExamination,
    saveImage,
    updateImage,
    deleteImage,
    saveVaccine,
    deleteVaccine,
    saveReminder,
    deleteReminder,
    saveAdditionalCharge,
    deleteAdditionalCharge,
    deleteRecord,
    finalizeConsultation,
    updateDiagnosis,
  };
}

export function useCommunicationLogs(regid: number) {
  const api = useApi();
  return useQuery({
    queryKey: ['medical-case', 'communication', regid],
    queryFn: async () => {
      try {
        const res = await api.get<{ success: boolean; data: any[] }>(`/medical-cases/${regid}/communication`);
        return res.data.data;
      } catch {
        // Backend route may not exist yet — gracefully return empty
        return [];
      }
    },
    enabled: !!regid,
  });
}

export function useSendWhatsApp() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { phone: string; message: string; regid: number }) => 
      api.post('/whatsapp/send-text', data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['medical-case', 'communication', variables.regid] });
    },
  });
}
