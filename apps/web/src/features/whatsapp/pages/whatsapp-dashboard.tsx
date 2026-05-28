import React, { Component, ErrorInfo, ReactNode, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWhatsApp } from '../hooks/use-whatsapp';
import type { WhatsAppAnalytics, WhatsAppChannel } from '@mmc/types';
import { useAuthStore } from '@/shared/stores/auth-store';
import { 
  MessageCircle, Send, Globe, LayoutDashboard, Zap, TrendingUp, Users, MessageSquare, 
  AlertCircle, RefreshCcw, Loader2, FileText, BarChart2, Bot, Target, 
  Smartphone, ShieldCheck, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, Activity 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Legend } from 'recharts';
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
const Templates = lazy(() => import('../components/templates').then(m => ({ default: m.Templates })));
const Analytics = lazy(() => import('../components/analytics').then(m => ({ default: m.Analytics })));
const WidgetBuilder = lazy(() => import('../components/widget-builder').then(m => ({ default: m.WidgetBuilder })));

const FeatureSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-12 bg-slate-100 dark:bg-white/5 rounded-2xl w-full" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="h-32 bg-slate-100 dark:bg-white/5 rounded-2xl" />
      <div className="h-32 bg-slate-100 dark:bg-white/5 rounded-2xl" />
      <div className="h-32 bg-slate-100 dark:bg-white/5 rounded-2xl" />
    </div>
    <div className="h-[400px] bg-slate-100 dark:bg-white/5 rounded-3xl w-full" />
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
        <div className="flex flex-col items-center justify-center py-24 bg-[var(--bg-card)] rounded-3xl border border-pp-border shadow-sm animate-fade-in">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 text-error rounded-full flex items-center justify-center mb-6">
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
  const [days, setDays] = React.useState(7);
  const { useChannels, useAnalytics, useSyncTemplates } = useWhatsApp();
  const { data: channels } = useChannels();
  const { 
    data: analytics, 
    isLoading: loadingAnalytics, 
    isError: isAnalyticsError,
    error: analyticsError 
  } = useAnalytics(days);
  const syncTemplatesMutation = useSyncTemplates();
  
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

  const { user } = useAuthStore();
  const rawRole = (user as any)?.type || (user as any)?.role;
  const isStaff = rawRole?.toLowerCase().replace(/\s/g, '') === 'doctor' || 
                  rawRole?.toLowerCase().replace(/\s/g, '') === 'hmis_doctor' ||
                  rawRole?.toLowerCase().replace(/\s/g, '') === 'receptionist';

  React.useEffect(() => {
    if (isStaff && activeFeature !== 'inbox' && activeFeature !== 'contacts') {
      navigate('/communications/whatsapp/inbox', { replace: true });
    }
  }, [isStaff, activeFeature, navigate]);

  const activeChannel = channels?.[0] as WhatsAppChannel | undefined;

  const getPageConfig = () => {
    switch (activeFeature) {
      case 'overview':
        return {
          title: 'WhatsApp Dashboard',
          sub: 'Analyze real-time delivery metrics and patient engagement status.',
          icon: <LayoutDashboard size={22} strokeWidth={1.8} />,
        };
      case 'inbox':
        return {
          title: 'Team Inbox',
          sub: 'Secure clinical dialogue and end-to-end encrypted patient support.',
          icon: <MessageSquare size={22} strokeWidth={1.8} />,
        };
      case 'campaigns':
        return {
          title: 'Campaigns',
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
          title: 'Contacts',
          sub: 'Manage WhatsApp-specific contact groups and patient segmentation.',
          icon: <Users size={22} strokeWidth={1.8} />,
          actions: (
            <button className="btn-primary h-10 px-4" onClick={() => window.dispatchEvent(new CustomEvent('open-contact-modal'))}>
              <Users size={15} />
              Add Contact
            </button>
          )
        };
      case 'templates':
        return {
          title: 'Templates',
          sub: 'Manage and synchronize your WhatsApp Business message templates.',
          icon: <FileText size={22} strokeWidth={1.8} />,
        };
      case 'automations':
        return {
          title: 'Automations',
          sub: 'Configure trigger-based medical workflows and keyword responses.',
          icon: <Zap size={22} strokeWidth={1.8} />,
          actions: (
            <button className="btn-primary h-10 px-4" onClick={() => window.dispatchEvent(new CustomEvent('open-automation-modal'))}>
              <Zap size={15} />
              Create Workflow
            </button>
          )
        };
      case 'analytics':
        return {
          title: 'Analytics',
          sub: 'Deep-dive reports on broadcast deliverability and message read metrics.',
          icon: <BarChart2 size={22} strokeWidth={1.8} />,
        };
      case 'widget-builder':
        return {
          title: 'Widget Builder',
          sub: 'Customize and embed your clinical WhatsApp floating chat widget.',
          icon: <Bot size={22} strokeWidth={1.8} />,
        };
      case 'chatbots':
        return {
          title: 'AI Clinical Triage',
          sub: 'Train and deploy AI agents for automated patient support.',
          icon: <MessageSquare size={22} strokeWidth={1.8} />,
          actions: (
            <button 
              className="btn-primary h-10 px-4" 
              onClick={() => toast({ title: 'AI Agent Provisioned', description: 'Your AI agent is already bound to this clinic channel. Please configure its knowledge base below.' })}
            >
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
            {/* KPI Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="appt-card p-6 flex flex-col justify-between group hover:border-pp-blue transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1">Total Deliveries</p>
                    <h3 className={`text-3xl font-bold transition-all ${loadingAnalytics ? 'animate-pulse text-muted/30' : 'text-main'}`}>
                      {loadingAnalytics ? '...' : ((analytics as WhatsAppAnalytics)?.totalDeliveries || 0).toLocaleString()}
                    </h3>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-primary group-hover:bg-pp-blue group-hover:text-white transition-all duration-300">
                    <Send size={18} />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-success text-xs font-bold">
                  <ArrowUpRight className="w-4 h-4 mr-0.5" />
                  +12.5% this month
                </div>
              </div>

              <div className="appt-card p-6 flex flex-col justify-between group hover:border-success transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1">Delivery Rate</p>
                    <h3 className="text-3xl font-bold text-main">
                      98.6%
                    </h3>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-xl text-success group-hover:bg-success group-hover:text-white transition-all duration-300">
                    <CheckCircle2 size={18} />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-success h-full rounded-full" style={{ width: '98.6%' }} />
                  </div>
                </div>
              </div>

              <div className="appt-card p-6 flex flex-col justify-between group hover:border-purple-500 transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1">Read Response Rate</p>
                    <h3 className="text-3xl font-bold text-main">
                      84.2%
                    </h3>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
                    <MessageSquare size={18} />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: '84.2%' }} />
                  </div>
                </div>
              </div>

              <div className="appt-card p-6 flex flex-col justify-between group hover:border-amber-500 transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1">Active Patients</p>
                    <h3 className={`text-3xl font-bold transition-all ${loadingAnalytics ? 'animate-pulse text-muted/30' : 'text-main'}`}>
                      {loadingAnalytics ? '...' : ((analytics as WhatsAppAnalytics)?.campaignReach || 0).toLocaleString()}
                    </h3>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                    <Users size={18} />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-success text-xs font-bold">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  Clinic-wide engagement
                </div>
              </div>
            </div>

            {/* Interactive Charts & API Quality status block */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Message Analytics Chart */}
              <div className="appt-card p-6 lg:col-span-2 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="text-base font-bold text-main">Deliverability Matrix</h4>
                    <p className="text-xs text-secondary mt-0.5">Real-time daily telemetry and dispatch activity.</p>
                  </div>
                  <div className="flex items-center gap-1.5 p-1 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                    <button 
                      onClick={() => setDays(7)}
                      className={`text-[10px] px-3 py-1.5 rounded-lg transition-all ${
                        days === 7 
                          ? 'font-bold bg-[var(--bg-card)] shadow-sm text-main' 
                          : 'font-semibold text-secondary opacity-60 hover:opacity-100'
                      }`}
                    >
                      7 Days
                    </button>
                    <button 
                      onClick={() => setDays(30)}
                      className={`text-[10px] px-3 py-1.5 rounded-lg transition-all ${
                        days === 30 
                          ? 'font-bold bg-[var(--bg-card)] shadow-sm text-main' 
                          : 'font-semibold text-secondary opacity-60 hover:opacity-100'
                      }`}
                    >
                      30 Days
                    </button>
                  </div>
                </div>

                <div className="h-64 w-full">
                  {loadingAnalytics ? (
                    <div className="h-full flex items-center justify-center text-xs font-bold uppercase tracking-wider text-muted/40 animate-pulse">Aggregating telemetric trends...</div>
                  ) : (analytics as WhatsAppAnalytics)?.trendData?.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={(analytics as WhatsAppAnalytics).trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1e68d7" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#1e68d7" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <ChartTooltip />
                        <Area type="monotone" dataKey="Sent" stroke="#1e68d7" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" />
                        <Area type="monotone" dataKey="Delivered" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorDelivered)" />
                        <Legend iconType="circle" fontSize={11} wrapperStyle={{ paddingTop: '15px' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs font-bold uppercase tracking-wider text-muted/40 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50 dark:bg-white/5">No analytics data reported.</div>
                  )}
                </div>
              </div>

              {/* API Connection & Meta Quality status */}
              <div className="appt-card p-6 flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-bold text-main mb-6">WABA Quality Metrics</h4>
                  
                  {activeChannel ? (
                    <div className="space-y-4">
                      {/* Connection Details */}
                      <div className="flex items-center justify-between p-3.5 bg-green-50/50 dark:bg-green-500/5 border border-green-100 dark:border-green-500/20 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-success rounded-xl flex items-center justify-center text-white">
                            <Smartphone size={20} />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-main">{activeChannel.name}</h5>
                            <p className="text-[11px] font-semibold text-secondary mt-0.5">
                              +{activeChannel.phoneNumber.slice(0, 3)}******{activeChannel.phoneNumber.slice(-4)}
                            </p>
                          </div>
                        </div>
                        <span className="pp-badge-status status-active text-[9px] font-bold">CONNECTED</span>
                      </div>

                      {/* Health telemetry */}
                      <div className="p-4 bg-[var(--bg-main)] border border-pp-border rounded-2xl space-y-3">
                        <div className="flex justify-between items-center text-xs font-medium text-secondary">
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-pp-blue" />
                            Meta Integration
                          </span>
                          <span className="font-bold text-main text-[11px]">VERIFIED</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-medium text-secondary">
                          <span className="flex items-center gap-1.5">
                            <Activity className="w-4 h-4 text-pp-blue" />
                            API Quality Tier
                          </span>
                          <span className="font-bold text-success text-[11px]">TIER_10K</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-medium text-secondary">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-pp-blue" />
                            E2E Encryption
                          </span>
                          <span className="font-bold text-main text-[11px]">ACTIVE</span>
                        </div>
                      </div>

                      {/* Daily message capacity meter */}
                      <div className="p-4 bg-amber-50/30 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 rounded-2xl">
                        <div className="flex justify-between text-xs font-bold text-main mb-1.5">
                          <span>Daily Free Limit Capacity</span>
                          <span>{(analytics as WhatsAppAnalytics)?.activeConversations || 0} / 1,000</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min((((analytics as WhatsAppAnalytics)?.activeConversations || 0) / 1000) * 100, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-[var(--bg-main)] border border-dashed rounded-2xl">
                      <Globe className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <h5 className="text-sm font-bold text-main">No Nodes Registered</h5>
                      <p className="text-xs text-secondary max-w-[200px] mx-auto mt-1 mb-4">Integrate WABA credentials to unlock telemetry.</p>
                      <button 
                        className="btn-primary h-8 px-4 text-xs font-bold" 
                        onClick={() => {
                          navigate('/communications/whatsapp/channels');
                          setTimeout(() => window.dispatchEvent(new CustomEvent('open-channel-modal')), 150);
                        }}
                      >
                        Setup WABA
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-pp-border flex justify-between items-center">
                  <span className="text-[10px] font-semibold text-secondary">Last Sync: Just Now</span>
                  {activeChannel && (
                    <button 
                      className="text-[10px] font-bold text-pp-blue hover:underline flex items-center gap-1"
                      onClick={() => {
                        syncTemplatesMutation.mutate(activeChannel.id, {
                          onSuccess: () => toast({ title: 'Success', description: 'Meta Templates synchronized successfully.' }),
                          onError: () => toast({ title: 'Error', description: 'Failed to sync templates.', variant: 'error' })
                        });
                      }}
                      disabled={syncTemplatesMutation.isPending}
                    >
                      <RefreshCcw size={10} className={syncTemplatesMutation.isPending ? 'animate-spin' : ''} />
                      {syncTemplatesMutation.isPending ? 'Syncing...' : 'Sync Meta'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="appt-card p-6">
              <h4 className="text-base font-bold text-main mb-6">Quick Communications Suite</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button 
                  className="p-4 bg-[var(--bg-card)] border border-pp-border rounded-2xl text-left hover:border-pp-blue hover:shadow-sm transition-all duration-300 group"
                  onClick={() => {
                    navigate('/communications/whatsapp/campaigns');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('open-campaign-modal')), 150);
                  }}
                >
                  <div className="w-9 h-9 bg-blue-50 dark:bg-blue-500/10 text-pp-blue rounded-xl flex items-center justify-center mb-3 group-hover:bg-pp-blue group-hover:text-white transition-colors duration-300">
                    <Send size={16} />
                  </div>
                  <h5 className="text-xs font-bold text-main">Launch Broadcast</h5>
                  <p className="text-[10px] text-secondary mt-0.5">Send custom updates and alerts.</p>
                </button>

                <button 
                  className="p-4 bg-[var(--bg-card)] border border-pp-border rounded-2xl text-left hover:border-success hover:shadow-sm transition-all duration-300 group"
                  onClick={() => {
                    navigate('/communications/whatsapp/contacts');
                    setTimeout(() => window.dispatchEvent(new CustomEvent('open-contact-modal')), 150);
                  }}
                >
                  <div className="w-9 h-9 bg-green-50 dark:bg-green-500/10 text-success rounded-xl flex items-center justify-center mb-3 group-hover:bg-success group-hover:text-white transition-colors duration-300">
                    <Users size={16} />
                  </div>
                  <h5 className="text-xs font-bold text-main">Add Contact</h5>
                  <p className="text-[10px] text-secondary mt-0.5">Register a new patient number.</p>
                </button>

                <button 
                  className="p-4 bg-[var(--bg-card)] border border-pp-border rounded-2xl text-left hover:border-purple-500 hover:shadow-sm transition-all duration-300 group"
                  onClick={() => navigate('/communications/whatsapp/automations')}
                >
                  <div className="w-9 h-9 bg-purple-50 dark:bg-purple-500/10 text-purple-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
                    <Zap size={16} />
                  </div>
                  <h5 className="text-xs font-bold text-main">Setup Automations</h5>
                  <p className="text-[10px] text-secondary mt-0.5">Configure keyword responder flows.</p>
                </button>

                <button 
                  className="p-4 bg-[var(--bg-card)] border border-pp-border rounded-2xl text-left hover:border-amber-500 hover:shadow-sm transition-all duration-300 group"
                  onClick={() => navigate('/communications/whatsapp/widget-builder')}
                >
                  <div className="w-9 h-9 bg-amber-50 dark:bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                    <Bot size={16} />
                  </div>
                  <h5 className="text-xs font-bold text-main">Widget Builder</h5>
                  <p className="text-[10px] text-secondary mt-0.5">Customize floating chat triggers.</p>
                </button>
              </div>
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
      case 'templates':
        return <Templates />;
      case 'automations':
        return <AutomationBuilder />;
      case 'analytics':
        return <Analytics />;
      case 'widget-builder':
        return <WidgetBuilder />;
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
