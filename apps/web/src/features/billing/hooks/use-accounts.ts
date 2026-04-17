import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type {
  AdditionalChargeWithPatient,
  DayCharge,
  BankDeposit,
  CashDeposit,
  ExpenseWithHead,
  ExpenseHead,
} from '@mmc/types';
import type {
  CreateAdditionalChargeInput,
  UpdateAdditionalChargeInput,
  ListAdditionalChargesQuery,
  CreateDayChargeInput,
  UpdateDayChargeInput,
  CreateBankDepositInput,
  CreateCashDepositInput,
  UpdateBankDepositInput,
  UpdateCashDepositInput,
  ListDepositsQuery,
  CreateExpenseInput,
  UpdateExpenseInput,
  ListExpensesQuery,
  CreateExpenseHeadInput,
  UpdateExpenseHeadInput,
} from '@mmc/validation';


// ─── Additional Charges Hooks ──────────────────────────────────────────────────

export function useAdditionalCharges(query: ListAdditionalChargesQuery) {
  return useQuery({
    queryKey: ['additional-charges', query],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: AdditionalChargeWithPatient[]; total: number }>(
        '/accounts/additional-charges',
        { params: query }
      );
      return data;
    },
  });
}

export function useAdditionalCharge(id: number) {
  return useQuery({
    queryKey: ['additional-charges', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: AdditionalChargeWithPatient }>(
        `/accounts/additional-charges/${id}`
      );
      return data.data;
    },
    enabled: !!id && id > 0,
  });
}

export function useCreateAdditionalCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAdditionalChargeInput) => {
      const { data } = await apiClient.post<{ success: boolean; data: AdditionalChargeWithPatient }>(
        '/accounts/additional-charges',
        input
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['additional-charges'] }),
  });
}

export function useUpdateAdditionalCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateAdditionalChargeInput & { id: number }) => {
      const { data } = await apiClient.put<{ success: boolean; data: AdditionalChargeWithPatient }>(
        `/accounts/additional-charges/${id}`,
        input
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['additional-charges'] }),
  });
}

export function useDeleteAdditionalCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/accounts/additional-charges/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['additional-charges'] }),
  });
}

// ─── Day Charges Hooks ─────────────────────────────────────────────────────────

export function useDayCharges() {
  return useQuery({
    queryKey: ['day-charges'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: DayCharge[] }>('/day-charges');
      return data.data ?? [];
    },
  });
}

export function useCreateDayCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDayChargeInput) => {
      const { data } = await apiClient.post<{ success: boolean; data: DayCharge }>('/day-charges', input);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['day-charges'] }),
  });
}

export function useUpdateDayCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateDayChargeInput & { id: number }) => {
      const { data } = await apiClient.put<{ success: boolean; data: DayCharge }>(`/day-charges/${id}`, input);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['day-charges'] }),
  });
}

export function useDeleteDayCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/day-charges/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['day-charges'] }),
  });
}

// ─── Bank Deposits Hooks ───────────────────────────────────────────────────────

export function useBankDeposits(query: ListDepositsQuery) {
  return useQuery({
    queryKey: ['bank-deposits', query],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: BankDeposit[]; total: number }>(
        '/deposits/bank',
        { params: query }
      );
      return data;
    },
  });
}

export function useCreateBankDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBankDepositInput) => {
      const { data } = await apiClient.post<{ success: boolean; data: BankDeposit }>('/deposits/bank', input);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-deposits'] }),
  });
}

export function useUpdateBankDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateBankDepositInput & { id: number }) => {
      const { data } = await apiClient.put<{ success: boolean; data: BankDeposit }>(`/deposits/bank/${id}`, input);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-deposits'] }),
  });
}

export function useDeleteBankDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/deposits/bank/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-deposits'] }),
  });
}

// ─── Cash Deposits Hooks ───────────────────────────────────────────────────────

export function useCashDeposits(query: ListDepositsQuery) {
  return useQuery({
    queryKey: ['cash-deposits', query],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: CashDeposit[]; total: number }>(
        '/deposits/cash',
        { params: query }
      );
      return data;
    },
  });
}

export function useCreateCashDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCashDepositInput) => {
      const { data } = await apiClient.post<{ success: boolean; data: CashDeposit }>('/deposits/cash', input);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash-deposits'] }),
  });
}

export function useUpdateCashDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateCashDepositInput & { id: number }) => {
      const { data } = await apiClient.put<{ success: boolean; data: CashDeposit }>(`/deposits/cash/${id}`, input);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash-deposits'] }),
  });
}

export function useDeleteCashDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/deposits/cash/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cash-deposits'] }),
  });
}

// ─── Expense Transactions Hooks ────────────────────────────────────────────────

export function useExpenses(query: ListExpensesQuery) {
  return useQuery({
    queryKey: ['expenses', query],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: ExpenseWithHead[]; total: number }>(
        '/expenses',
        { params: query }
      );
      return data;
    },
  });
}

export function useExpense(id: number) {
  return useQuery({
    queryKey: ['expenses', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: ExpenseWithHead }>(`/expenses/${id}`);
      return data.data;
    },
    enabled: !!id && id > 0,
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const { data } = await apiClient.post<{ success: boolean; data: ExpenseWithHead }>('/expenses', input);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateExpenseInput & { id: number }) => {
      const { data } = await apiClient.put<{ success: boolean; data: ExpenseWithHead }>(`/expenses/${id}`, input);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/expenses/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

// ─── Expense Heads Hooks ───────────────────────────────────────────────────────

export function useExpenseHeads() {
  return useQuery({
    queryKey: ['expense-heads'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: ExpenseHead[] }>(
        '/accounts/expense-heads'
      );
      return data.data ?? [];
    },
  });
}

export function useExpenseHead(id: number) {
  return useQuery({
    queryKey: ['expense-heads', id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ success: boolean; data: ExpenseHead }>(
        `/accounts/expense-heads/${id}`
      );
      return data.data;
    },
    enabled: !!id && id > 0,
  });
}

export function useCreateExpenseHead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateExpenseHeadInput) => {
      const { data } = await apiClient.post<{ success: boolean; data: ExpenseHead }>(
        '/accounts/expense-heads',
        input
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense-heads'] }),
  });
}

export function useUpdateExpenseHead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateExpenseHeadInput & { id: number }) => {
      const { data } = await apiClient.put<{ success: boolean; data: ExpenseHead }>(
        `/accounts/expense-heads/${id}`,
        input
      );
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense-heads'] }),
  });
}

export function useDeleteExpenseHead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/accounts/expense-heads/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense-heads'] }),
  });
}