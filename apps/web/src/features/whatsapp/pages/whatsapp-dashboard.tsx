import React, { Component, ErrorInfo, ReactNode, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWhatsApp } from '../hooks/use-whatsapp';
import type { WhatsAppAnalytics, WhatsAppChannel } from '@mmc/types';
import { MessageCircle, Send, Globe, LayoutDashboard, Zap, TrendingUp, Users, MessageSquare, AlertCircle, RefreshCcw, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import '@/features/dashboard/pages/role-dashboards.css';
import '@/features/appointments/styles/appointments.css';

// Lazy load feature components for high performance
const CampaignList = lazy(() => import('../components/campaign-list').then(m => ({ default: m.CampaignList })));
const ChannelList = lazy(() => import('../components/channel-list').then(m => ({ default: m.ChannelList })));
const Inbox = lazy(() => import('../components/inbox').then(m => ({ default: m.Inbox })));
const ContactList = lazy(() => import('../components/contact-list').then(m => ({ default: m.ContactList })));
const AutomationBuilder = lazy(() => import('../components/automation-builder').then(m => ({ default: m.AutomationBuilder })));
const ChatbotManager = lazy(() => import('../components/chatbot-manager').then(m => ({ default: m.ChatbotManager })));
const MediaLibrary = lazy(() => import('../components/media-library').then(m => ({ default: m.MediaLibrary })));

const FeatureSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-12 bg-pp-bg-subtle/40 rounded-2xl w-full" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-32 bg-pp-bg-subtle/40 rounded-2xl" />
      <div className="h-32 bg-pp-bg-subtle/40 rounded-2xl" />
      <div className="h-32 bg-pp-bg-subtle/40 rounded-2xl" />
    </div>
    <div className="h-[400px] bg-pp-bg-subtle/40 rounded-3xl w-full" />
  </div>
);
// Local Error Boundary for "Soft" failure handling
class WhatsAppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("WhatsApp Module Error:", error, info);
    toast({
      title: "UI Sync Interrupted",
      description: "A component failed to render. Please try refreshing this section.",
      variant: "error"
    });
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-pp-border shadow-sm animate-fade-in">
          <div className="w-16 h-16 bg-red-50 text-error rounded-full flex items-center justify-center mb-6">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-main">Display Sync Interrupted</h3>
          <p className="text-secondary mt-2 mb-8 max-w-xs mx-auto text-sm">
            We encountered a visual rendering issue. Your data remains secure on our servers.
          </p>
          <button 
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            className="btn-primary h-11 px-8"
          >
            <RefreshCcw size={16} />
            Reconnect View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const WhatsAppDashboardPage = () => {
  const { useChannels, useAnalytics } = useWhatsApp();
  const { data: channels } = useChannels();
  const { 
    data: analytics, 
    isLoading: loadingAnalytics, 
    isError: isAnalyticsError,
    error: analyticsError 
  } = useAnalytics();
  
  const location = useLocation();
  const navigate = useNavigate();

  // Handle errors with soft notifications instead of crashes
  React.useEffect(() => {
    if (isAnalyticsError) {
      toast({
        title: 'Sync Issue',
        description: 'Unable to refresh clinical analytics. Showing last known state.',
        variant: 'error',
      });
      console.error('Analytics Error:', analyticsError);
    }
  }, [isAnalyticsError, analyticsError]);
  
  const segments = location.pathname.split('/').filter(Boolean);
  const waIndex = segments.indexOf('whatsapp');
  const activeFeature = waIndex !== -1 ? segments[waIndex + 1] || 'overview' : 'overview';
  const activeChannel = channels?.[0] as WhatsAppChannel | undefined;

  const getPageConfig = () => {
    switch (activeFeature) {
      case 'overview':
        return {
          title: 'WhatsApp Overview',
          sub: 'Analyze real-time delivery metrics and patient engagement status.',
          icon: <LayoutDashboard size={22} strokeWidth={1.8} />,
        };
      case 'inbox':
        return {
          title: 'Clinical Team Chat',
          sub: 'Secure clinical dialogue and end-to-end encrypted patient support.',
          icon: <MessageCircle size={22} strokeWidth={1.8} />,
        };
      case 'campaigns':
        return {
          title: 'Campaign Manager',
          sub: 'Design, launch, and monitor automated healthcare broadcasts.',
          icon: <Send size={22} strokeWidth={1.8} />,
          actions: (
            <button className="btn-primary h-10 px-4" onClick={() => window.dispatchEvent(new CustomEvent('open-campaign-modal'))}>
              <Send size={15} />
              Create Campaign
            </button>
          )
        };
      case 'channels':
        return {
          title: 'WABA Channels',
          sub: 'Manage Meta Business connectivity and template synchronization.',
          icon: <Globe size={22} strokeWidth={1.8} />,
          actions: (
            <button className="btn-primary h-10 px-4" onClick={() => window.dispatchEvent(new CustomEvent('open-channel-modal'))}>
              <Globe size={15} />
              Add Channel
            </button>
          )
        };
      case 'contacts':
        return {
          title: 'Patient CRM',
          sub: 'Manage WhatsApp-specific contact groups and patient segmentation.',
          icon: <Users size={22} strokeWidth={1.8} />,
          actions: (
            <button className="btn-primary h-10 px-4" onClick={() => window.dispatchEvent(new CustomEvent('open-contact-modal'))}>
              <Users size={15} />
              Add Contact
            </button>
          )
        };
      case 'automations':
        return {
          title: 'Journey Automations',
          sub: 'Configure trigger-based medical workflows and keyword responses.',
          icon: <Zap size={22} strokeWidth={1.8} />,
          actions: (
            <button className="btn-primary h-10 px-4" onClick={() => window.dispatchEvent(new CustomEvent('open-automation-modal'))}>
              <Zap size={15} />
              Create Workflow
            </button>
          )
        };
      case 'chatbots':
        return {
          title: 'AI Clinical Triage',
          sub: 'Train and deploy AI agents for automated patient support.',
          icon: <MessageSquare size={22} strokeWidth={1.8} />,
          actions: (
            <button className="btn-primary h-10 px-4" onClick={() => window.dispatchEvent(new CustomEvent('open-chatbot-modal'))}>
              <MessageSquare size={15} />
              Create AI Agent
            </button>
          )
        };
      case 'media':
        return {
          title: 'Media Vault',
          sub: 'Centralized repository for medical imagery and educational assets.',
          icon: <Globe size={22} strokeWidth={1.8} />,
          actions: (
            <button className="btn-primary h-10 px-4" onClick={() => window.dispatchEvent(new CustomEvent('open-media-modal'))}>
              <Globe size={15} />
              Upload Asset
            </button>
          )
        };
      default:
        return { title: 'WhatsApp Pro', sub: '', icon: <MessageSquare size={22} /> };
    }
  };

  const config = getPageConfig();

  const renderContent = () => {
    switch (activeFeature) {
      case 'overview':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="appt-card p-6 flex flex-col justify-between group hover:border-pp-blue transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="pp-table-meta-label uppercase tracking-widest text-[10px] mb-1">Total Deliveries</p>
                    <h3 className={`text-3xl font-bold transition-all ${loadingAnalytics ? 'animate-pulse text-muted/30' : 'text-main'}`}>
                      {loadingAnalytics ? '...' : ((analytics as WhatsAppAnalytics)?.totalDeliveries || 0).toLocaleString()}
                    </h3>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl text-primary group-hover:bg-pp-blue group-hover:text-white transition-all">
                    <Send size={20} />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-success text-xs font-bold">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  +12.5% this month
                </div>
              </div>

              <div className="appt-card p-6 flex flex-col justify-between group hover:border-success transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="pp-table-meta-label uppercase tracking-widest text-[10px] mb-1">Active Conversations</p>
                    <h3 className={`text-3xl font-bold transition-all ${loadingAnalytics ? 'animate-pulse text-muted/30' : 'text-main'}`}>
                      {loadingAnalytics ? '...' : ((analytics as WhatsAppAnalytics)?.activeConversations || 0).toLocaleString()}
                    </h3>
                  </div>
                  <div className="p-3 bg-green-50 rounded-xl text-success group-hover:bg-success group-hover:text-white transition-all">
                    <MessageSquare size={20} />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-success text-xs font-bold">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  Real-time activity
                </div>
              </div>

              <div className="appt-card p-6 flex flex-col justify-between group hover:border-purple-500 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="pp-table-meta-label uppercase tracking-widest text-[10px] mb-1">Patient Reach</p>
                    <h3 className={`text-3xl font-bold transition-all ${loadingAnalytics ? 'animate-pulse text-muted/30' : 'text-main'}`}>
                      {loadingAnalytics ? '...' : ((analytics as WhatsAppAnalytics)?.campaignReach || 0).toLocaleString()}
                    </h3>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-all">
                    <Users size={20} />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-primary text-xs font-bold">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  Clinic-wide engagement
                </div>
              </div>
            </div>
            
            <div className="pp-table-container-enhanced p-12 border-dashed flex flex-col items-center justify-center text-center bg-white/50">
              <div className="w-16 h-16 bg-pp-bg-subtle rounded-2xl flex items-center justify-center mb-6 text-primary/40">
                <Zap size={32} />
              </div>
              <h3 className="text-xl font-bold text-main">Pulse Analytics Active</h3>
              <p className="text-secondary mt-2 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                Your Meta Business channel is verified. Advanced clinical insights and automated patient journeys are being processed.
              </p>
              <button className="btn-primary px-8 h-11" onClick={() => navigate('/analytics')}>
                View Detailed Reports
              </button>
            </div>
          </div>
        );
      case 'inbox':
        return <Inbox channelId={activeChannel?.id} />;
      case 'campaigns':
        return <CampaignList />;
      case 'channels':
        return <ChannelList />;
      case 'contacts':
        return <ContactList />;
      case 'automations':
        return <AutomationBuilder />;
      case 'chatbots':
        return <ChatbotManager />;
      case 'media':
        return <MediaLibrary />;
      default:
        return null;
    }
  };

  return (
    <div className="pp-page-container animate-fade-in">
      {/* ── Standard Page Hero ── */}
      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            {config.icon}
            {config.title}
          </h1>
          <p className="pp-page-hero-sub">{config.sub}</p>
        </div>
        <div className="pp-page-hero-actions">
          {config.actions}
        </div>
      </div>


      {/* Main Content Area wrapped in a Soft Error Boundary */}
      <WhatsAppErrorBoundary>
        <Suspense fallback={<FeatureSkeleton />}>
          <div className="">
            {renderContent()}
          </div>
        </Suspense>
      </WhatsAppErrorBoundary>
    </div>
  );
};
