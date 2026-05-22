import React, { useState, useEffect } from 'react';
import { useWhatsApp } from '../hooks/use-whatsapp';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/infrastructure/api-client';
import { toast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Code, Settings } from 'lucide-react';
import { WidgetConfig, ChatMessage, PreviewScreen } from './widget-builder/types';
import { createDefaultConfig } from './widget-builder/utils';
import WidgetConfigPanel from './widget-builder/WidgetConfigPanel';
import WidgetPreview from './widget-builder/WidgetPreview';
import WidgetCodeSnippet from './widget-builder/WidgetCodeSnippet';

export const WidgetBuilder = () => {
  const { useChannels, useWidgetSettings, useSaveWidgetSettings } = useWhatsApp();

  const { data: channels, isLoading: channelsLoading } = useChannels();
  const activeChannel = channels?.[0];

  // Fetch doctors list for the team dropdown selection
  const { data: doctors, isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctors-list'],
    queryFn: async () => {
      const { data } = await apiClient.get<any>('/doctors');
      return data.data || [];
    },
  });

  const { data: settings, isLoading: settingsLoading } = useWidgetSettings(
    activeChannel?.id || null,
  );
  const saveWidgetSettings = useSaveWidgetSettings();

  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [previewScreen, setPreviewScreen] = useState<PreviewScreen>('home');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'builder' | 'code'>('builder');

  useEffect(() => {
    if (activeChannel) {
      const defaultConf = createDefaultConfig(activeChannel.name);
      if (settings && settings.widgetConfig) {
        setConfig({
          ...defaultConf,
          ...settings.widgetConfig,
        });
      } else {
        setConfig(defaultConf);
      }
    }
  }, [settings, activeChannel]);

  useEffect(() => {
    if (config) {
      setChatMessages([
        {
          role: 'bot',
          text: config.greeting,
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
    }
  }, [config?.greeting]);

  const updateConfig = (key: string, value: any) => {
    if (!config) return;
    setConfig((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const handleSave = () => {
    if (!activeChannel || !config) return;
    saveWidgetSettings.mutate(
      {
        channelId: activeChannel.id,
        data: {
          ...settings,
          widgetConfig: config,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: 'Success',
            description: 'Widget configuration saved successfully.',
            variant: 'success',
          });
        },
        onError: (err: any) => {
          toast({
            title: 'Error',
            description: err.message || 'Failed to save configuration.',
            variant: 'error',
          });
        },
      },
    );
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !config) return;

    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const newMsgs = [...chatMessages, { role: 'user', text: chatInput, time }];
    setChatMessages(newMsgs);
    setChatInput('');

    // Simulate AI response if enabled
    if (config.enableAiAutoReply) {
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            text: 'Thank you for message! This is a preview simulation. Once installed on your website, our clinical assistant will answer dynamically based on clinical records.',
            time: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        ]);
      }, 1000);
    }
  };

  if (channelsLoading || settingsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-pp-blue" />
        <p className="text-sm text-secondary font-medium">Loading widget settings...</p>
      </div>
    );
  }

  if (!activeChannel) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center max-w-md mx-auto space-y-4">
        <div className="p-4 bg-yellow-50 rounded-full text-yellow-600">
          <MessageSquare className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-main">No WhatsApp Channel Configured</h3>
        <p className="text-sm text-secondary leading-relaxed">
          Please connect your WhatsApp Business Account (WABA) first under WhatsApp Settings or
          Channels.
        </p>
      </div>
    );
  }

  if (!config) return null;

  const embedCode = `<!-- Homeo-X WhatsApp Floating Support Widget -->
<script>
  window.HomeoxWidgetId = "${activeChannel.id}";
</script>
<script src="${window.location.origin}/widgets/whatsapp-chat-widget.js" async></script>`;

  const copyCode = () => {
    navigator.clipboard.writeText(embedCode);
    toast({
      title: 'Copied!',
      description: 'Installation script copied to clipboard.',
      variant: 'success',
    });
  };

  // Mock FAQs for live mockup
  const sampleFaqs = [
    {
      id: '1',
      question: 'What are your consultation hours?',
      answer: 'We are open Monday to Friday 9:00 AM to 6:00 PM, and Saturday 9:00 AM to 1:00 PM.',
      category: 'General',
      isActive: true,
    },
    {
      id: '2',
      question: 'How can I book an appointment?',
      answer:
        "You can book an appointment directly through this widget by clicking 'Chat on WhatsApp', or by calling our clinic number.",
      category: 'Appointments',
      isActive: true,
    },
    {
      id: '3',
      question: 'Do you offer online consultations?',
      answer: 'Yes, we offer fully remote video/audio consultations for patients worldwide.',
      category: 'Services',
      isActive: true,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-pp-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-main">Widget Customizer</h2>
          <p className="text-sm text-secondary">
            Configure how your floating clinical support widget looks and behaves.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1.5 bg-[var(--bg-main)] rounded-[14px] border border-pp-border/30 shadow-inner">
          <button
            onClick={() => setActiveSubTab('builder')}
            className={`px-5 py-2 text-[13px] font-semibold rounded-xl flex items-center gap-2 transition-all select-none ${
              activeSubTab === 'builder'
                ? 'bg-[var(--bg-card)] text-main shadow-sm border border-pp-border'
                : 'text-secondary hover:text-main'
            }`}
          >
            <Settings className="h-4 w-4" />
            Designer
          </button>
          <button
            onClick={() => setActiveSubTab('code')}
            className={`px-5 py-2 text-[13px] font-semibold rounded-xl flex items-center gap-2 transition-all select-none ${
              activeSubTab === 'code'
                ? 'bg-[var(--bg-card)] text-main shadow-sm border border-pp-border'
                : 'text-secondary hover:text-main'
            }`}
          >
            <Code className="h-4 w-4" />
            Integrate Code
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Builder Config or Embed Code */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-6">
          {activeSubTab === 'builder' ? (
            <div className="space-y-6">
              <WidgetConfigPanel
                config={config}
                updateConfig={updateConfig}
                userList={doctors}
                usersLoading={doctorsLoading}
              />
              <div className="pt-2">
                <button
                  onClick={handleSave}
                  disabled={saveWidgetSettings.isPending}
                  className="w-full bg-pp-blue hover:bg-pp-blue/90 text-white rounded-xl h-11 text-sm font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  {saveWidgetSettings.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Configuration
                </button>
              </div>
            </div>
          ) : (
            <WidgetCodeSnippet
              config={config}
              widgetCode={embedCode}
              copyCode={copyCode}
              onSave={handleSave}
              isSaving={saveWidgetSettings.isPending}
              channelId={activeChannel.id}
            />
          )}
        </div>

        {/* Right Side: Interactive Mockup Live Preview */}
        <div className="lg:col-span-6 xl:col-span-7">
          <div className="sticky top-6">
            <WidgetPreview
              config={config}
              isPreviewOpen={isPreviewOpen}
              setIsPreviewOpen={setIsPreviewOpen}
              previewScreen={previewScreen}
              setPreviewScreen={setPreviewScreen}
              chatMessages={chatMessages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              sendChatMessage={sendChatMessage}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              qaPairs={sampleFaqs}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
