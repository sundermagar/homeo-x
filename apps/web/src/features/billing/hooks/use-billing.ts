import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type {
  Bill,
  BillWithPatient,
  DailyCollectionSummary,
  PatientBillSummary
} from '@mmc/types';
import type { CreateBillInput, ListBillsQuery, CreateCustomBillInput } from '@mmc/validation';

export interface PatientBalance {
  regid: number;
  patientName: string;
  doctorName: string | null;
  balance: number;
  notes: string | null;
  lastBillDate: string | null;
}

interface RecordPaymentInput {
  regid: number;
  billId?: number;
  amount?: number;
  paymentMode: string;
  receivedDate?: string;
  splitPayments?: { billId: number; amount: number; paymentMode: string }[];
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
  upiReceived: number;
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
        upiReceived: records.filter((r: any) => r.paymentMode === 'UPI').reduce((s: number, r: any) => s + (r.received || 0), 0) || 0,
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

export function useUpdateCharges() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ billId, amount }: { billId: number; amount: number }) => {
      const { data } = await apiClient.patch<{ success: boolean; data: Bill }>(`/billing/${billId}/charges`, { amount });
      return data.data;
    },
    onSuccess: (updatedBill) => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['billing', 'daily'] });
      if (updatedBill.regid) {
        queryClient.invalidateQueries({ queryKey: ['bills', 'patient', updatedBill.regid] });
      }
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

// ─── ViewCollection Legacy Parity Hooks ───────────────────────────────────────

export interface ExtendedDailySummaryData {
  date: string;
  collection: number;
  cash: number;
  card: number;
  cheque: number;
  online: number;
  upi: number;
  productCharges: number;
  expenses: number;
  cashDeposited: number;
  deficit: number;
  bankDeposit: number;
  cashInHand: number;
  recordCount: number;
}

export interface PaymentDrilldownRecordData {
  regid: number;
  patientName: string;
  amount: number;
  chargeName?: string;
  quantity?: number;
  date?: string;
}

export interface MonthListRowData extends ExtendedDailySummaryData {}

export interface CollectionTargetRowData {
  date: string;
  collection: number;
  dailyTarget: number;
  difference: number;
  cumulativeCollection: number;
  cumulativeTarget: number;
  cumulativeDifference: number;
  isSunday: boolean;
}

export interface CollectionTargetResponseData {
  monthlyTarget: number;
  workingDays: number;
  dailyTarget: number;
  rows: CollectionTargetRowData[];
}

export function useExtendedDailySummary(date?: string) {
  return useQuery({
    queryKey: ['billing', 'extended-summary', date],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: ExtendedDailySummaryData }>(
        '/billing/extended-summary',
        { params: { date } }
      );
      return data.data;
    },
  });
}

export function usePaymentDrilldown(date: string, mode: string, enabled = false) {
  return useQuery({
    queryKey: ['billing', 'payment-drilldown', date, mode],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: PaymentDrilldownRecordData[] }>(
        '/billing/payment-drilldown',
        { params: { date, mode } }
      );
      return data.data || [];
    },
    enabled,
  });
}

export function useMonthList(endDate?: string, days = 32) {
  return useQuery({
    queryKey: ['billing', 'month-list', endDate, days],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: MonthListRowData[] }>(
        '/billing/month-list',
        { params: { endDate, days } }
      );
      return data.data || [];
    },
  });
}

export function useCollectionTarget(month?: string) {
  return useQuery({
    queryKey: ['billing', 'collection-target', month],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: CollectionTargetResponseData }>(
        '/billing/collection-target',
        { params: { month } }
      );
      return data.data;
    },
  });
}

export function useSetTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (amount: number) => {
      const { data } = await apiClient.post<{ success: boolean; data: { amount: number } }>(
        '/billing/set-target',
        { amount }
      );
      return data.data;
    },
    onSuccess: async (_, amount) => {
      // Optimistically update all collection-target queries with the new monthly target
      queryClient.setQueriesData({ queryKey: ['billing', 'collection-target'] }, (oldData: any) => {
        if (!oldData) return oldData;
        const newDaily = oldData.workingDays > 0 ? Math.round(amount / oldData.workingDays) : 0;
        
        let cumulativeCollection = 0;
        let cumulativeTarget = 0;
        
        const newRows = (oldData.rows || []).map((row: any) => {
          if (row.isSunday) {
            return {
              ...row,
              cumulativeCollection,
              cumulativeTarget,
              cumulativeDifference: cumulativeCollection - cumulativeTarget,
            };
          }
          cumulativeCollection += row.collection || 0;
          cumulativeTarget += newDaily;
          return {
            ...row,
            dailyTarget: newDaily,
            difference: (row.collection || 0) - newDaily,
            cumulativeCollection,
            cumulativeTarget,
            cumulativeDifference: cumulativeCollection - cumulativeTarget,
          };
        });

        return {
          ...oldData,
          monthlyTarget: amount,
          dailyTarget: newDaily,
          rows: newRows
        };
      });
      await queryClient.invalidateQueries({ queryKey: ['billing', 'collection-target'] });
    },
  });
}

export function useDeleteBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (billId: number) => {
      const { data } = await apiClient.delete<{ success: boolean }>(`/billing/${billId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['billing', 'daily'] });
    },
  });
}

export function usePatientBalances() {
  return useQuery({
    queryKey: ['billing', 'balances'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: PatientBalance[] }>('/billing/balances');
      return data.data;
    },
  });
}

export function useUpdateBalanceNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ regid, note }: { regid: number; note: string }) => {
      const { data } = await apiClient.post<{ success: boolean }>(`/billing/balances/${regid}/notes`, { note });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'balances'] });
    },
  });
}
