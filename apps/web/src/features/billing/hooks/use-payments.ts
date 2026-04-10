import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type { Payment, PaymentWithPatient } from '@mmc/types';
import type { 
  CreatePaymentOrderInput, 
  VerifyPaymentInput, 
  RecordManualPaymentInput, 
  ListPaymentsQuery 
} from '@mmc/validation';

export function usePaymentHistory(query: ListPaymentsQuery) {
  return useQuery({
    queryKey: ['payments', query],
    queryFn: async () => {
      const { data } = await apiClient.get<{ 
        success: boolean; 
        data: PaymentWithPatient[]; 
        pagination: { page: number; limit: number; total: number } 
      }>('/payments/history', { params: query });
      return data;
    },
  });
}

export function useCreatePaymentOrder() {
  return useMutation({
    mutationFn: async (input: CreatePaymentOrderInput) => {
      const { data } = await apiClient.post<{ 
        success: boolean; 
        data: { id: string; amount: number; currency: string } 
      }>('/payments/create-order', input);
      return data.data;
    },
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: VerifyPaymentInput) => {
      const { data } = await apiClient.post<{ success: boolean; data: Payment }>('/payments/verify', input);
      return data.data;
    },
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      if (payment.billId) {
        queryClient.invalidateQueries({ queryKey: ['bills'] });
      }
    },
  });
}

export function useRecordManualPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecordManualPaymentInput) => {
      const { data } = await apiClient.post<{ success: boolean; data: Payment }>('/payments', input);
      return data.data;
    },
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      if (payment.billId) {
        queryClient.invalidateQueries({ queryKey: ['bills'] });
      }
    },
  });
}
