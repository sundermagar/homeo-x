import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type {
  SmsTemplate, SmsReport,
  CreateSmsTemplateDto, UpdateSmsTemplateDto,
  SendSmsDto, BroadcastSmsDto,
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

// ─── WhatsApp (Meta Cloud API) ──────────────────────────────────────────────────────────
// All hooks now route through /api/whatsapp/* (Meta Cloud API, channel from wa_channels)

/** Send a single WhatsApp text message via Meta Cloud API */
export function useSendWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ phone, message }: { phone: string; message: string }) =>
      apiClient.post('/whatsapp/send-text', { phone, message }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: commKeys.whatsappLogs }),
  });
}

/** Broadcast a WhatsApp text message to multiple phones via Meta Cloud API (unified WABA) */
export function useBroadcastWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ phones, message }: { phones: string[]; message: string }) => {
      // Send each phone through the unified WABA endpoint
      const results = await Promise.allSettled(
        phones.map(phone =>
          apiClient.post('/whatsapp/send-text', { phone, message }).then(r => r.data)
        )
      );
      const sent = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      return { success: true, sent, failed };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: commKeys.whatsappLogs }),
  });
}


/** Fetch legacy WhatsApp send logs */
export function useWhatsAppLogs() {
  return useQuery({
    queryKey: commKeys.whatsappLogs,
    queryFn: () => apiClient.get('/communications/whatsapp/logs').then(r => (r.data as any).data ?? []),
    staleTime: 60_000,
  });
}
