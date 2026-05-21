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

// Extended collection data with targets
export interface CollectionSummary {
  date: string;
  totalCharges: number;
  totalReceived: number;
  totalBalance: number;
  cashReceived: number;
  cardReceived: number;
  chequeReceived: number;
  onlineReceived: number;
  recordCount: number;
  targetAmount?: number;
  targetAchieved?: number;
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

// Collection summary with payment mode breakdown
export function useCollectionSummary(date?: string) {
  return useQuery({
    queryKey: ['billing', 'collection', date],
    queryFn: async () => {
      const collection = await apiClient.get<{ success: boolean; data: DailyCollectionSummary }>(
        '/billing/daily',
        { params: { date } }
      );

      const deposits = await apiClient.get<{ success: boolean; data: any[] }>(
        '/deposits/cash',
        { params: { date } }
      ).catch(() => ({ data: { data: [] as any[] } }));

      const expenses = await apiClient.get<{ success: boolean; data: any[] }>(
        '/expenses',
        { params: { date } }
      ).catch(() => ({ data: { data: [] as any[] } }));

      const records = collection.data?.data?.records || [];
      const summary: CollectionSummary = {
        date: (date || new Date().toISOString().split('T')[0]) as string,
        totalCharges: collection.data?.data?.totalCharges || 0,
        totalReceived: collection.data?.data?.totalReceived || 0,
        totalBalance: collection.data?.data?.totalBalance || 0,
        cashReceived: records.filter((r: any) => r.paymentMode === 'Cash').reduce((s: number, r: any) => s + (r.received || 0), 0) || 0,
        cardReceived: records.filter((r: any) => r.paymentMode === 'Card').reduce((s: number, r: any) => s + (r.received || 0), 0) || 0,
        chequeReceived: records.filter((r: any) => r.paymentMode === 'Cheque').reduce((s: number, r: any) => s + (r.received || 0), 0) || 0,
        onlineReceived: records.filter((r: any) => r.paymentMode === 'Online').reduce((s: number, r: any) => s + (r.received || 0), 0) || 0,
        recordCount: collection.data?.data?.recordCount || 0,
      };

      return summary;
    },
    enabled: true,
  });
}

// Balance summary
export function useBalanceSummary(date?: string) {
  return useQuery({
    queryKey: ['billing', 'balance', date],
    queryFn: async () => {
      const collection = await apiClient.get<{ success: boolean; data: DailyCollectionSummary }>(
        '/billing/daily',
        { params: date ? { date } : {} }
      );
      return {
        totalReceived: collection.data?.data?.totalReceived || 0,
        totalDeposits: 0, // TODO: sum from deposits
        totalExpenses: 0, // TODO: sum from expenses
        cashInHand: 0, // totalReceived - totalDeposits
      };
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
      queryClient.refetchQueries({ queryKey: ['medical-case', 'full', newBill.regid] });
      queryClient.refetchQueries({ queryKey: ['medical-case', 'full', String(newBill.regid)] });
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
      queryClient.refetchQueries({ queryKey: ['medical-case', 'full', newBill.regid] });
      queryClient.refetchQueries({ queryKey: ['medical-case', 'full', String(newBill.regid)] });
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
      queryClient.refetchQueries({ queryKey: ['medical-case', 'full', variables.regid] });
      queryClient.refetchQueries({ queryKey: ['medical-case', 'full', String(variables.regid)] });
    },
  });
}
