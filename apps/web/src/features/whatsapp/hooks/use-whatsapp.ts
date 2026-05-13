import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import type { 
  WhatsAppChannel, 
  WhatsAppTemplate, 
  WhatsAppConversation, 
  WhatsAppMessage, 
  WhatsAppAnalytics, 
  WhatsAppCampaign 
} from '@mmc/types';

export const useWhatsApp = () => {
  const queryClient = useQueryClient();

  return {
    // Channels
    useChannels: () => useQuery({
      queryKey: ['whatsapp', 'channels'],
      queryFn: async () => {
        const { data } = await apiClient.get<{ data: WhatsAppChannel[] }>('/whatsapp/channels');
        return data.data;
      },
      staleTime: 30_000,
    }),
    useCreateChannel: () => useMutation({
      mutationFn: async (payload: any) => {
        const { data } = await apiClient.post<{ data: WhatsAppChannel }>('/whatsapp/channels', payload);
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'channels'] });
      },
    }),
    // Campaigns
    useCampaigns: () => useQuery({
      queryKey: ['whatsapp', 'campaigns'],
      queryFn: async () => {
        const { data } = await apiClient.get<{ data: WhatsAppCampaign[] | { data: WhatsAppCampaign[] } }>('/whatsapp/campaigns');
        return Array.isArray(data.data) ? data.data : (data.data as any).data;
      },
    }),
    useCreateCampaign: () => useMutation({
      mutationFn: async (payload: any) => {
        const { data } = await apiClient.post<{ data: WhatsAppCampaign }>('/whatsapp/campaigns', payload);
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'campaigns'] });
      },
    }),
    useBroadcastCampaign: () => useMutation({
      mutationFn: async (campaignId: number) => {
        const { data } = await apiClient.post<{ data: any }>(`/whatsapp/campaigns/${campaignId}/broadcast`);
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'campaigns'] });
      },
    }),
    // Templates
    useTemplates: (channelId?: number) => useQuery({
      queryKey: ['whatsapp', 'templates', channelId],
      queryFn: async () => {
        if (!channelId) return [] as WhatsAppTemplate[];
        const { data } = await apiClient.get<{ data: WhatsAppTemplate[] }>('/whatsapp/templates', { params: { channelId } });
        return data.data;
      },
      enabled: !!channelId,
    }),
    useSyncTemplates: () => useMutation({
      mutationFn: async (channelId: number) => {
        const { data } = await apiClient.post<{ data: any }>('/whatsapp/templates/sync', { channelId });
        return data.data;
      },
      onSuccess: (_, channelId) => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'templates', channelId] });
      },
    }),
    // Conversations & Messages
    useConversations: (channelId?: number) => useQuery({
      queryKey: ['whatsapp', 'conversations', channelId],
      queryFn: async () => {
        if (!channelId) return [] as WhatsAppConversation[];
        const { data } = await apiClient.get<{ data: WhatsAppConversation[] }>('/whatsapp/conversations', { params: { channelId } });
        return data.data;
      },
      enabled: !!channelId,
    }),
    useMessages: (conversationId?: number) => useQuery({
      queryKey: ['whatsapp', 'messages', conversationId],
      queryFn: async () => {
        if (!conversationId) return [] as WhatsAppMessage[];
        const { data } = await apiClient.get<{ data: WhatsAppMessage[] }>(`/whatsapp/conversations/${conversationId}/messages`);
        return data.data;
      },
      enabled: !!conversationId,
    }),
    useSendMessage: () => useMutation({
      mutationFn: async ({ conversationId, content }: { conversationId: number; content: string }) => {
        const { data } = await apiClient.post<{ data: WhatsAppMessage }>(`/whatsapp/conversations/${conversationId}/messages`, { content });
        return data.data;
      },
      onSuccess: (_, { conversationId }) => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages', conversationId] });
      },
    }),
    useUploadMedia: () => useMutation({
      mutationFn: async ({ channelId, file, title }: { channelId: number; file: File, title?: string }) => {
        const formData = new FormData();
        formData.append('channelId', String(channelId));
        if (title) formData.append('title', title);
        formData.append('file', file);
        const { data } = await apiClient.post<{ data: { mediaId: string } }>('/whatsapp/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        return data.data;
      },
    }),
    // Contacts
    useContacts: (clinicId?: number) => useQuery({
      queryKey: ['wa-contacts', clinicId],
      queryFn: async () => {
        const { data } = await apiClient.get<{ data: any[] | { data: any[] } }>('/whatsapp/contacts');
        const d = data.data;
        return Array.isArray(d) ? d : (d as any).data;
      },
      enabled: !!clinicId,
    }),
    useGroups: (clinicId?: number) => useQuery({
      queryKey: ['wa-groups', clinicId],
      queryFn: async () => {
        const { data } = await apiClient.get<{ data: any[] }>('/whatsapp/groups');
        return data.data;
      },
      enabled: !!clinicId,
    }),
    useCreateContact: () => useMutation({
      mutationFn: async (data: any) => {
        const { data: res } = await apiClient.post<{ data: any }>('/whatsapp/contacts', data);
        return res.data;
      },
    }),
    // Media
    useMedia: (clinicId?: number) => useQuery({
      queryKey: ['wa-media', clinicId],
      queryFn: async () => {
        const { data } = await apiClient.get<{ data: any[] | { data: any[] } }>('/whatsapp/media');
        const d = data.data;
        return Array.isArray(d) ? d : (d as any).data;
      },
      enabled: !!clinicId,
    }),
    // Chatbots
    useChatbots: (clinicId?: number) => useQuery({
      queryKey: ['wa-chatbots', clinicId],
      queryFn: async () => {
        const { data } = await apiClient.get<{ data: any[] | { data: any[] } }>('/whatsapp/chatbots');
        const d = data.data;
        return Array.isArray(d) ? d : (d as any).data;
      },
      enabled: !!clinicId,
    }),
    // Automations
    useAutomations: (clinicId?: number) => useQuery({
      queryKey: ['wa-automations', clinicId],
      queryFn: async () => {
        const { data } = await apiClient.get<{ data: any[] | { data: any[] } }>('/whatsapp/automations');
        const d = data.data;
        return Array.isArray(d) ? d : (d as any).data;
      },
      enabled: !!clinicId,
    }),
    useCreateAutomation: () => useMutation({
      mutationFn: async (data: any) => {
        const { data: res } = await apiClient.post<{ data: any }>('/whatsapp/automations', data);
        return res.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['wa-automations'] });
      },
    }),
    useCreateChatbot: () => useMutation({
      mutationFn: async (data: any) => {
        const { data: res } = await apiClient.post<{ data: any }>('/whatsapp/chatbots', data);
        return res.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['wa-chatbots'] });
      },
    }),
    useCreateMedia: () => useMutation({
      mutationFn: async (data: any) => {
        const { data: res } = await apiClient.post<{ data: any }>('/whatsapp/media', data);
        return res.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['wa-media'] });
      },
    }),
    // Analytics
    useAnalytics: () => useQuery({
      queryKey: ['whatsapp', 'analytics'],
      queryFn: async () => {
        const { data } = await apiClient.get<{ data: WhatsAppAnalytics }>('/whatsapp/analytics');
        return data.data;
      },
      staleTime: 30_000,
    }),
    // Send a template message from the Inbox
    useSendTemplate: () => useMutation({
      mutationFn: async (payload: {
        conversationId: number;
        phone: string;
        templateName: string;
        language?: string;
        components?: any[];
      }) => {
        const { data } = await apiClient.post<{ data: any }>('/whatsapp/send-template', {
          phone: payload.phone,
          templateName: payload.templateName,
          language: payload.language || 'en_US',
          components: payload.components || [],
        });
        return data.data;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages', vars.conversationId] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
      },
    }),
    // Check if a default WABA channel is configured for the clinic
    useDefaultChannel: () => useQuery({
      queryKey: ['whatsapp', 'default-channel'],
      queryFn: async () => {
        const { data } = await apiClient.get<{ data: { configured: boolean; channel: WhatsAppChannel | null } }>('/whatsapp/default-channel');
        return data.data;
      },
      staleTime: 60_000,
    }),
    // Campaigns Paginated
    useCampaignsPaginated: (params: { page: number, limit: number, search?: string }) => useQuery({
      queryKey: ['whatsapp', 'campaigns', params],
      queryFn: async () => {
        const { data } = await apiClient.get<{ data: { data: WhatsAppCampaign[], total: number } }>('/whatsapp/campaigns', { params });
        return data.data;
      },
      staleTime: 30_000,
    }),
    // Contacts Paginated
    useContactsPaginated: (params: { page: number, limit: number, search?: string }) => useQuery({
      queryKey: ['whatsapp', 'contacts', params],
      queryFn: async () => {
        const { data } = await apiClient.get<{ data: { data: any[], total: number } }>('/whatsapp/contacts', { params });
        return data.data;
      },
      staleTime: 30_000,
    }),
    // Media Paginated
    useMediaPaginated: (params: { page: number, limit: number, search?: string }) => useQuery({
      queryKey: ['whatsapp', 'media', params],
      queryFn: async () => {
        const { data } = await apiClient.get<{ data: { data: any[], total: number } }>('/whatsapp/media', { params });
        return data.data;
      },
      staleTime: 30_000,
    }),
    // Chatbots Paginated
    useChatbotsPaginated: (params: { page: number, limit: number, search?: string }) => useQuery({
      queryKey: ['whatsapp', 'chatbots', params],
      queryFn: async () => {
        const { data } = await apiClient.get<{ data: { data: any[], total: number } }>('/whatsapp/chatbots', { params });
        return data.data;
      }
    }),
    // Automations Paginated
    useAutomationsPaginated: (params: { page: number, limit: number, search?: string }) => useQuery({
      queryKey: ['whatsapp', 'automations', params],
      queryFn: async () => {
        const { data } = await apiClient.get<{ data: { data: any[], total: number } }>('/whatsapp/automations', { params });
        return data.data;
      }
    }),
  };
};

