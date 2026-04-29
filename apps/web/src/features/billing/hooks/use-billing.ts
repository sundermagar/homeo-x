import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type { 
  Bill, 
  BillWithPatient, 
  DailyCollectionSummary, 
  PatientBillSummary 
} from '@mmc/types';
import type { CreateBillInput, ListBillsQuery, CreateCustomBillInput } from '@mmc/validation';

interface RecordPaymentInput {
  regid: number;
  billId: number;
  amount: number;
  paymentMode: string;
  receivedDate?: string;
}

export function useBills(query: ListBillsQuery) {
  return useQuery({
    queryKey: ['bills', query],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: BillWithPatient[]; total: number }>(
        '/billing',
        { params: query }
      );
      // Return the full envelope because it contains 'total'
      return data;
    },
  });
}

export function usePatientBills(regid: number) {
  return useQuery({
    queryKey: ['bills', 'patient', regid],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: PatientBillSummary }>(
        `/billing/patient/${regid}`
      );
      return data.data;
    },
    enabled: !!regid && regid > 0,
  });
}

export function useDailyCollection(date?: string) {
  return useQuery({
    queryKey: ['billing', 'daily', date],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: DailyCollectionSummary }>(
        '/billing/daily',
        { params: { date } }
      );
      return data.data || null;
    },
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBillInput) => {
      const { data } = await apiClient.post<{ success: boolean; data: Bill }>('/billing', input);
      return data.data;
    },
    onSuccess: (newBill) => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['billing', 'daily'] });
      queryClient.invalidateQueries({ queryKey: ['bills', 'patient', newBill.regid] });
    },
  });
}

export function useCreateCustomBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCustomBillInput) => {
      const { data } = await apiClient.post<{ success: boolean; data: Bill }>('/billing/custom', input);
      return data.data;
    },
    onSuccess: (newBill) => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['billing', 'daily'] });
      queryClient.invalidateQueries({ queryKey: ['bills', 'patient', newBill.regid] });
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecordPaymentInput) => {
      const { data } = await apiClient.post<{ success: boolean; data: any }>('/payments', input);
      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['billing', 'daily'] });
      queryClient.invalidateQueries({ queryKey: ['bills', 'patient', variables.regid] });
    },
  });
}
