import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type { Lead } from '@mmc/types';

export function useSendOtp() {
  return useMutation({
    mutationFn: async (phone: string) => {
      const res = await apiClient.post('/public/otp/send', { phone });
      return res.data;
    },
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async ({ phone, otp }: { phone: string; otp: string }) => {
      const res = await apiClient.post('/public/otp/verify', { phone, otp });
      return res.data;
    },
  });
}

export function useRegisterPatient() {
  return useMutation({
    mutationFn: async (input: Partial<Lead>) => {
      // In a real system, you might create a Lead first
      const res = await apiClient.post('/crm/leads', input);
      return res.data;
    },
  });
}

export function usePublicFaqs() {
  return useQuery({
    queryKey: ['public', 'faqs'],
    queryFn: async () => {
      const res = await apiClient.get('/public/faqs');
      // Depending on interceptor, might already be array or object
      const unwrapped = (res as any)?._original ?? res.data;
      return unwrapped.data ?? res.data ?? [];
    },
  });
}

export function usePublicPage(slug: string) {
  return useQuery({
    queryKey: ['public', 'page', slug],
    queryFn: async () => {
      const res = await apiClient.get(`/public/cms/pages/${slug}`);
      return res.data ?? null;
    },
    enabled: !!slug,
  });
}

export function usePublicClinicalData(phone: string) {
  return useQuery<any>({
    queryKey: ['public', 'clinical', phone],
    queryFn: async () => {
      const res = await apiClient.get(`/public/clinical/${phone}`);
      return res.data ?? null;
    },
    enabled: !!phone,
  });
}

export function usePatientAppointments(phone: string) {
  return useQuery<any[]>({
    queryKey: ['public', 'appointments', phone],
    queryFn: async () => {
      const res = await apiClient.get(`/public/appointments/${phone}`);
      // The response interceptor unwraps {success, data} -> data
      const result = res.data;
      return Array.isArray(result) ? result : [];
    },
    enabled: !!phone,
  });
}

export function useBookAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: {
      phone: string;
      patientName: string;
      bookingDate: string;
      bookingTime: string;
      doctorId: number;
      visitType?: 'New' | 'FollowUp';
      notes?: string;
    }) => {
      const res = await apiClient.post('/public/appointments/book', input);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate both the booked slots and the patient appointments lists
      queryClient.invalidateQueries({ queryKey: ['public', 'booked-slots'] });
      queryClient.invalidateQueries({ queryKey: ['public', 'appointments'] });
    }
  });
}

export function useUpdatePatientProfile() {
  return useMutation({
    mutationFn: async ({ phone, updates }: { phone: string; updates: Record<string, any> }) => {
      const res = await apiClient.put(`/public/patient/${phone}/profile`, updates);
      return res.data;
    },
  });
}

export function useCancelAppointment() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.patch(`/public/appointments/${id}/cancel`, {});
      return res.data;
    },
  });
}

export function useBookedSlots(date: string) {
  return useQuery<string[]>({
    queryKey: ['public', 'booked-slots', date],
    queryFn: async () => {
      const res = await apiClient.get(`/public/appointments/booked-slots?date=${date}`);
      const result = res.data;
      return Array.isArray(result) ? result : [];
    },
    enabled: !!date,
    staleTime: 30_000,
  });
}

export function usePatientPreferences(phone: string) {
  return useQuery({
    queryKey: ['public', 'patient-preferences', phone],
    queryFn: async () => {
      const res = await apiClient.get(`/public/patient/${phone}/preferences`);
      return res.data;
    },
    enabled: !!phone,
  });
}

export function useUpdatePatientPreferences() {
  return useMutation({
    mutationFn: async ({ phone, prefs }: { phone: string; prefs: any }) => {
      const res = await apiClient.patch(`/public/patient/${phone}/preferences`, prefs);
      return res.data;
    },
  });
}
