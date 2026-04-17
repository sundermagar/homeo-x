import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type { Lead } from '@mmc/types';

export function useSendOtp() {
  return useMutation({
    mutationFn: async (phone: string) => {
      const res = await apiClient.post<{ success: boolean; data: any }>('/public/otp/send', { phone });
      return res.data;
    },
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async ({ phone, otp }: { phone: string; otp: string }) => {
      const res = await apiClient.post<{ success: boolean; data: any }>('/public/otp/verify', { phone, otp });
      return res.data;
    },
  });
}

export function useRegisterPatient() {
  return useMutation({
    mutationFn: async (input: Partial<Lead>) => {
      // In a real system, you might create a Lead first
      const res = await apiClient.post<{ success: boolean; data: any }>('/crm/leads', input);
      return res.data;
    },
  });
}

export function usePublicFaqs() {
  return useQuery({
    queryKey: ['public', 'faqs'],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: any[] }>('/public/faqs');
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
      const res = await apiClient.get<{ success: boolean; data: any }>(`/public/cms/pages/${slug}`);
      return res.data ?? null;
    },
    enabled: !!slug,
  });
}

export function usePublicClinicalData(phone: string) {
  return useQuery({
    queryKey: ['public', 'clinical', phone],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: any }>(`/public/clinical/${phone}`);
      return res.data ?? null;
    },
    enabled: !!phone,
  });
}
