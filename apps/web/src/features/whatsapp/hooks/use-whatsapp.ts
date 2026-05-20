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
      staleTime: 5 * 60 * 1000, // channels rarely change, cache for 5 minutes
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
      staleTime: 30_000, // cache for 30 seconds
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
    useDeleteCampaign: () => useMutation({
      mutationFn: async (campaignId: number) => {
        const { data } = await apiClient.delete<{ data: any }>(`/whatsapp/campaigns/${campaignId}`);
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
      staleTime: 5 * 60 * 1000, // approved templates change rarely, cache for 5 minutes
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
    useCreateTemplate: () => useMutation({
      mutationFn: async (payload: { channelId: number; name: string; category: string; language?: string; body: string; header?: string; footer?: string; buttons?: any[] }) => {
        const { data } = await apiClient.post<{ data: any }>('/whatsapp/templates', payload);
        return data.data;
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'templates', variables.channelId] });
      },
    }),
    useUpdateTemplate: () => useMutation({
      mutationFn: async (payload: { id: number; channelId?: number; name?: string; category?: string; language?: string; body: string; header?: string; footer?: string; buttons?: any[]; status?: string }) => {
        const { id, ...rest } = payload;
        const { data } = await apiClient.put<{ data: any }>(`/whatsapp/templates/${id}`, rest);
        return data.data;
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'templates', variables.channelId] });
      },
    }),
    // Conversations & Messages
    useMarkAsRead: () => useMutation({
      mutationFn: async (conversationId: number) => {
        const { data } = await apiClient.post<{ data: any }>(`/whatsapp/conversations/${conversationId}/read`);
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
      },
    }),
    useConversations: (channelId?: number) => useQuery({
      queryKey: ['whatsapp', 'conversations', channelId],
      queryFn: async () => {
        if (!channelId) return [] as WhatsAppConversation[];
        const { data } = await apiClient.get<{ data: WhatsAppConversation[] }>('/whatsapp/conversations', { params: { channelId } });
        return data.data;
      },
      enabled: !!channelId,
      refetchInterval: 5000, // Poll conversations every 5 seconds to show new chats/unread badges
    }),
    useCreateConversation: () => useMutation({
      mutationFn: async (payload: { channelId: number; contactPhone: string; contactName: string }) => {
        const { data } = await apiClient.post<{ data: WhatsAppConversation }>('/whatsapp/conversations', payload);
        return data.data;
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations', variables.channelId] });
      },
    }),
    useMessages: (conversationId?: number) => useQuery({
      queryKey: ['whatsapp', 'messages', conversationId],
      queryFn: async () => {
        if (!conversationId) return [] as WhatsAppMessage[];
        const { data } = await apiClient.get<{ data: WhatsAppMessage[] }>(`/whatsapp/conversations/${conversationId}/messages`);
        return data.data;
      },
      enabled: !!conversationId,
      refetchInterval: 3000, // Poll messages of active conversation every 3 seconds for real-time delivery from phone
    }),
    useSendMessage: () => useMutation({
      mutationFn: async ({ 
        conversationId, 
        content, 
        mediaId, 
        mediaType, 
        fileName,
        metadata
      }: { 
        conversationId: number; 
        content?: string; 
        mediaId?: string; 
        mediaType?: string; 
        fileName?: string; 
        metadata?: any;
      }) => {
        const { data } = await apiClient.post<{ data: WhatsAppMessage }>(`/whatsapp/conversations/${conversationId}/messages`, { 
          content, 
          mediaId, 
          mediaType, 
          fileName,
          metadata
        });
        return data.data;
      },
      onMutate: async ({ conversationId, content, mediaId, mediaType, fileName }) => {
        // Cancel outgoing refetches so they don't overwrite optimistic update
        await queryClient.cancelQueries({ queryKey: ['whatsapp', 'messages', conversationId] });
 
        // Snapshot previous messages
        const previousMessages = queryClient.getQueryData<WhatsAppMessage[]>(['whatsapp', 'messages', conversationId]) || [];
 
        // Optimistically insert message (outbound, sending status)
        const optimisticMessage = {
          id: -Date.now(),
          conversationId,
          content: content || `Sent ${mediaType || 'file'}: ${fileName || ''}`,
          direction: 'outbound',
          status: 'sent',
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
 
        // Prepend optimistic message to cache (API returns descending order)
        queryClient.setQueryData<WhatsAppMessage[]>(
          ['whatsapp', 'messages', conversationId],
          [optimisticMessage as any, ...previousMessages]
        );
 
        return { previousMessages };
      },
      onError: (err, { conversationId }, context) => {
        if (context?.previousMessages) {
          queryClient.setQueryData(['whatsapp', 'messages', conversationId], context.previousMessages);
        }
      },
      onSuccess: (_, { conversationId }) => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
      },
    }),
    useDeleteMessage: () => useMutation({
      mutationFn: async ({ messageId }: { messageId: number }) => {
        const { data } = await apiClient.delete<{ data: any }>(`/whatsapp/messages/${messageId}`);
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages'] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
      },
    }),
    useUploadConversationMedia: () => useMutation({
      mutationFn: async ({ conversationId, file }: { conversationId: number; file: File }) => {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await apiClient.post<{ 
          data: { 
            mediaId: string; 
            type: 'document' | 'image' | 'video' | 'audio'; 
            fileName: string; 
          } 
        }>(`/whatsapp/conversations/${conversationId}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        return data.data;
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
      staleTime: 5 * 60 * 1000, // cache contacts static list for 5 minutes
    }),
    useGroups: (clinicId?: number) => useQuery({
      queryKey: ['wa-groups', clinicId],
      queryFn: async () => {
        const { data } = await apiClient.get<{ data: any[] }>('/whatsapp/groups');
        return data.data;
      },
      enabled: !!clinicId,
      staleTime: 5 * 60 * 1000, // cache contact groups for 5 minutes
    }),
    useCreateContact: () => useMutation({
      mutationFn: async (data: any) => {
        const { data: res } = await apiClient.post<{ data: any }>('/whatsapp/contacts', data);
        return res.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'contacts'] });
      },
    }),
    useDeleteContact: () => useMutation({
      mutationFn: async (id: string | number) => {
        const { data: res } = await apiClient.delete<{ data: any }>(`/whatsapp/contacts/${id}`);
        return res.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'contacts'] });
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
      staleTime: 60_000, // cache for 1 minute
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
      staleTime: 60_000, // cache for 1 minute
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
      staleTime: 60_000, // cache for 1 minute
    }),
    useCreateAutomation: () => useMutation({
      mutationFn: async (data: any) => {
        const { data: res } = await apiClient.post<{ data: any }>('/whatsapp/automations', data);
        return res.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['wa-automations'] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'automations'] });
      },
    }),
    useUpdateAutomation: () => useMutation({
      mutationFn: async ({ id, ...payload }: { id: number; status?: string; name?: string; description?: string; trigger?: string; triggerConfig?: any; nodes?: any[]; edges?: any[] }) => {
        const { data } = await apiClient.patch<{ data: any }>(`/whatsapp/automations/${id}`, payload);
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['wa-automations'] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'automations'] });
      },
    }),
    useDeleteAutomation: () => useMutation({
      mutationFn: async (id: number) => {
        const { data } = await apiClient.delete<{ data: any }>(`/whatsapp/automations/${id}`);
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['wa-automations'] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'automations'] });
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
    useAnalytics: (days: number = 7) => useQuery({
      queryKey: ['whatsapp', 'analytics', days],
      queryFn: async () => {
        const { data } = await apiClient.get<{ data: WhatsAppAnalytics }>('/whatsapp/analytics', { params: { days } });
        return data.data;
      },
      staleTime: 5 * 60 * 1000, // dashboard analytics cache for 5 minutes
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
    // Send a direct text message via the unified send-text endpoint
    useSendText: () => useMutation({
      mutationFn: async (payload: {
        phone: string;
        message: string;
      }) => {
        const { data } = await apiClient.post<{ data: any }>('/whatsapp/send-text', {
          phone: payload.phone,
          message: payload.message,
        });
        return data.data;
      },
      onSuccess: () => {
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
      staleTime: 10 * 60 * 1000, // default configured channel is static, cache for 10 minutes
    }),
    
    // --- AI Chatbot & Training Hooks ---
    useAiSettings: (channelId: number | null) => useQuery({
      queryKey: ['whatsapp', 'ai-settings', channelId],
      queryFn: async () => {
        if (!channelId) return null;
        const { data } = await apiClient.get<{ data: any }>(`/whatsapp/ai-settings/${channelId}`);
        return data.data;
      },
      enabled: !!channelId,
    }),
    
    useSaveAiSettings: () => useMutation({
      mutationFn: async (payload: { channelId: number; data: any }) => {
        const { data } = await apiClient.put<{ data: any }>(`/whatsapp/ai-settings/${payload.channelId}`, payload.data);
        return data.data;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'ai-settings', vars.channelId] });
      },
    }),

    useTrainingSources: (channelId: number | null) => useQuery({
      queryKey: ['whatsapp', 'training-sources', channelId],
      queryFn: async () => {
        if (!channelId) return [];
        const { data } = await apiClient.get<{ data: any[] }>(`/whatsapp/training/sources/${channelId}`);
        return data.data;
      },
      enabled: !!channelId,
    }),

    useAddTrainingSource: () => useMutation({
      mutationFn: async (payload: any) => {
        const { data } = await apiClient.post<{ data: any }>('/whatsapp/training/sources', payload);
        return data.data;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'training-sources', vars.channelId] });
      },
    }),

    useProcessTrainingSource: () => useMutation({
      mutationFn: async (id: number) => {
        const { data } = await apiClient.post<{ data: any }>(`/whatsapp/training/sources/${id}/process`);
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'training-sources'] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'training-stats'] });
      },
    }),

    useDeleteTrainingSource: () => useMutation({
      mutationFn: async (id: number) => {
        const { data } = await apiClient.delete<{ data: any }>(`/whatsapp/training/sources/${id}`);
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'training-sources'] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'training-stats'] });
      },
    }),

    useTrainingQaPairs: (channelId: number | null) => useQuery({
      queryKey: ['whatsapp', 'training-qa', channelId],
      queryFn: async () => {
        if (!channelId) return [];
        const { data } = await apiClient.get<{ data: any[] }>(`/whatsapp/training/qa/${channelId}`);
        return data.data;
      },
      enabled: !!channelId,
    }),

    useSaveTrainingQaPair: () => useMutation({
      mutationFn: async (payload: any) => {
        const { data } = await apiClient.post<{ data: any }>('/whatsapp/training/qa', payload);
        return data.data;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'training-qa', vars.channelId] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'training-stats'] });
      },
    }),

    useDeleteTrainingQaPair: () => useMutation({
      mutationFn: async (id: number) => {
        const { data } = await apiClient.delete<{ data: any }>(`/whatsapp/training/qa/${id}`);
        return data.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'training-qa'] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'training-stats'] });
      },
    }),

    useTrainingStats: (channelId: number | null) => useQuery({
      queryKey: ['whatsapp', 'training-stats', channelId],
      queryFn: async () => {
        if (!channelId) return null;
        const { data } = await apiClient.get<{ data: any }>(`/whatsapp/training/stats/${channelId}`);
        return data.data;
      },
      enabled: !!channelId,
      refetchInterval: 10000, // Poll every 10s to update chunk counts when processing
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
      },
      staleTime: 30_000, // cache paginated chatbots for 30s
    }),
    // Automations Paginated
    useAutomationsPaginated: (params: { page: number, limit: number, search?: string }) => useQuery({
      queryKey: ['whatsapp', 'automations', params],
      queryFn: async () => {
        const { data } = await apiClient.get<{ data: { data: any[], total: number } }>('/whatsapp/automations', { params });
        return data.data;
      },
      staleTime: 30_000, // cache paginated automations for 30s
    }),
  };
};

