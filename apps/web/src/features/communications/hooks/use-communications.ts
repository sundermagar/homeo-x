import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type {
  SmsTemplate, SmsReport,
  CreateSmsTemplateDto, UpdateSmsTemplateDto,
  SendSmsDto, BroadcastSmsDto,
  SendWhatsAppDto, BroadcastWhatsAppDto,
  WhatsAppLog,
} from '@mmc/types';

// ─── Query Keys ──────────────────────────────────────────────────────────────
const ALL_KEY = ['communications'] as const;

export const commKeys = {
  all:          ALL_KEY,
  templates:    [...ALL_KEY, 'templates'] as const,
  template:     (id: number) => [...ALL_KEY, 'template', id] as const,
  reports:      (f: Record<string, any>) => [...ALL_KEY, 'reports', f] as const,
  whatsappLogs: [...ALL_KEY, 'whatsapp-logs'] as const,
};

// ─── SMS Templates ────────────────────────────────────────────────────────────
export function useSmsTemplates() {
  return useQuery({
    queryKey: commKeys.templates,
    queryFn: () => apiClient.get<{ success: boolean; data: SmsTemplate[] }>('/communications/templates').then(r => r.data.data ?? []),
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSmsTemplateDto) =>
      apiClient.post('/communications/templates', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: commKeys.templates }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateSmsTemplateDto }) =>
      apiClient.put(`/communications/templates/${id}`, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: commKeys.templates }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/communications/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: commKeys.templates }),
  });
}

// ─── SMS Reports ──────────────────────────────────────────────────────────────
export function useSmsReports(filters: {
  sms_type?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  phone?: string;
  page?: number;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: commKeys.reports(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '') params.set(k, String(v)); });
      return apiClient.get<{ success: boolean; data: { data: SmsReport[]; total: number } }>(`/communications/reports?${params}`).then(r => r.data.data);
    },
    staleTime: 30_000,
  });
}

// ─── Send SMS ─────────────────────────────────────────────────────────────────
export function useSendSms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: SendSmsDto) => apiClient.post('/communications/sms/send', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: commKeys.reports({}) }),
  });
}

export function useBroadcastSms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: BroadcastSmsDto) => apiClient.post('/communications/sms/broadcast', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: commKeys.reports({}) }),
  });
}

// ─── WhatsApp ──────────────────────────────────────────────────────────────────
export function useSendWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: SendWhatsAppDto) => apiClient.post('/communications/whatsapp/send', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: commKeys.whatsappLogs }),
  });
}

export function useBroadcastWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: BroadcastWhatsAppDto) => apiClient.post('/communications/whatsapp/broadcast', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: commKeys.whatsappLogs }),
  });
}

export function useWhatsAppLogs() {
  return useQuery({
    queryKey: commKeys.whatsappLogs,
    queryFn: () => apiClient.get<{ success: boolean; data: WhatsAppLog[] }>('/communications/whatsapp/logs').then(r => r.data.data ?? []),
    staleTime: 60_000,
  });
}
