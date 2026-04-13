import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';

// ─── Generic CRUD factory ─────────────────────────────────────────────────────
function makeSettingsHooks<T>(resource: string) {
  const LIST_KEY = ['settings', resource];

  const api = {
    list: async (): Promise<T[]> => {
      const { data } = await apiClient.get(`/settings/${resource}`);
      return data.data ?? data;
    },
    get: async (id: number): Promise<T> => {
      const { data } = await apiClient.get(`/settings/${resource}/${id}`);
      return data.data ?? data;
    },
    create: async (body: Partial<T>): Promise<T> => {
      const { data } = await apiClient.post(`/settings/${resource}`, body);
      return data.data ?? data;
    },
    update: async ({ id, ...body }: Partial<T> & { id: number }): Promise<T> => {
      const { data } = await apiClient.put(`/settings/${resource}/${id}`, body);
      return data.data ?? data;
    },
    remove: async (id: number): Promise<void> => {
      await apiClient.delete(`/settings/${resource}/${id}`);
    },
  };

  return {
    useList: () => useQuery({ queryKey: LIST_KEY, queryFn: api.list }),
    useGet: (id: number) => useQuery({ queryKey: [...LIST_KEY, id], queryFn: () => api.get(id) }),
    useCreate: () => {
      const qc = useQueryClient();
      return useMutation({ mutationFn: api.create, onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }) });
    },
    useUpdate: () => {
      const qc = useQueryClient();
      return useMutation({ mutationFn: api.update, onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }) });
    },
    useRemove: () => {
      const qc = useQueryClient();
      return useMutation({ mutationFn: api.remove, onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }) });
    },
  };
}

// ─── Per-Entity Hooks ─────────────────────────────────────────────────────────

export const departmentHooks = makeSettingsHooks<any>('departments');
export const dispensaryHooks = makeSettingsHooks<any>('dispensaries');
export const referralHooks   = makeSettingsHooks<any>('referrals');
export const stickerHooks    = makeSettingsHooks<any>('stickers');
export const medicineHooks   = makeSettingsHooks<any>('medicines');
export const potencyHooks    = makeSettingsHooks<any>('potencies');
export const frequencyHooks  = makeSettingsHooks<any>('frequencies');
export const faqHooks        = makeSettingsHooks<any>('cms/faqs');
export const staticPageHooks = makeSettingsHooks<any>('cms/pages');
export const pdfHooks        = makeSettingsHooks<any>('pdf');
export const expenseHooks    = makeSettingsHooks<any>('expense-heads');
export const messageHooks    = makeSettingsHooks<any>('message-templates');
export const packageHooks    = makeSettingsHooks<any>('packages');
export const courierHooks    = makeSettingsHooks<any>('couriers');

export function useStockLogs(medicineId?: number) {
  return useQuery({
    queryKey: ['settings', 'stock-logs', medicineId],
    queryFn: async () => {
      const q = medicineId ? `?medicineId=${medicineId}` : '';
      const { data } = await apiClient.get(`/settings/stock-logs${q}`);
      return data.data ?? data;
    }
  });
}

// ─── Named convenience exports (recommended way to use) ───────────────────────
export const { useList: useDepartments, useCreate: useCreateDepartment, useUpdate: useUpdateDepartment, useRemove: useDeleteDepartment } = departmentHooks;
export const { useList: useDispensaries, useCreate: useCreateDispensary, useUpdate: useUpdateDispensary, useRemove: useDeleteDispensary } = dispensaryHooks;
export const { useList: useReferrals, useCreate: useCreateReferral, useUpdate: useUpdateReferral, useRemove: useDeleteReferral } = referralHooks;
export const { useList: useStickers, useCreate: useCreateSticker, useUpdate: useUpdateSticker, useRemove: useDeleteSticker } = stickerHooks;
export const { useList: useMedicines, useCreate: useCreateMedicine, useUpdate: useUpdateMedicine, useRemove: useDeleteMedicine } = medicineHooks;
export const { useList: usePotencies, useCreate: useCreatePotency, useUpdate: useUpdatePotency, useRemove: useDeletePotency } = potencyHooks;
export const { useList: useFrequencies, useCreate: useCreateFrequency, useUpdate: useUpdateFrequency, useRemove: useDeleteFrequency } = frequencyHooks;
export const { useList: useFaqs, useCreate: useCreateFaq, useUpdate: useUpdateFaq, useRemove: useDeleteFaq } = faqHooks;
export const { useList: useStaticPages, useCreate: useCreateStaticPage, useUpdate: useUpdateStaticPage, useRemove: useDeleteStaticPage } = staticPageHooks;
export const { useList: usePdfSettings, useCreate: useCreatePdfSetting, useUpdate: useUpdatePdfSetting, useRemove: useDeletePdfSetting } = pdfHooks;
export const { useList: useExpenseHeads, useCreate: useCreateExpenseHead, useUpdate: useUpdateExpenseHead, useRemove: useDeleteExpenseHead } = expenseHooks;
export const { useList: useMessageTemplates, useCreate: useCreateMessageTemplate, useUpdate: useUpdateMessageTemplate, useRemove: useDeleteMessageTemplate } = messageHooks;
export const { useList: usePackagePlans, useCreate: useCreatePackagePlan, useUpdate: useUpdatePackagePlan, useRemove: useDeletePackagePlan } = packageHooks;
export const { useList: useCouriers, useCreate: useCreateCourier, useUpdate: useUpdateCourier, useRemove: useDeleteCourier } = courierHooks;
