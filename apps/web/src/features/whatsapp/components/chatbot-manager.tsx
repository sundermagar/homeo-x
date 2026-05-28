import React, { useState, useEffect, useRef } from 'react';
import { useWhatsApp } from '../hooks/use-whatsapp';
import { 
  Bot, Shield, AlertTriangle, Sparkles, Eye, BookOpen,
  Globe, FileUp, Database, Trash2, RefreshCw, MessageSquare,
  Plus, Settings, Key, Cpu, Brain, Clock, X, Loader2, CheckCircle2,
  XCircle, Link as LinkIcon, FileText, Send
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export const ChatbotManager = () => {
  const { 
    useChannels, 
    useAiSettings, 
    useSaveAiSettings,
    useTrainingSources,
    useAddTrainingSource,
    useUploadTrainingFile,
    useDeleteTrainingSource,
    useProcessTrainingSource,
    useTrainingQaPairs,
    useSaveTrainingQaPair,
    useDeleteTrainingQaPair,
    useTrainingStats,
    useSyncKnowledgeBase,
    useTrainingPreview,
    useTestChat
  } = useWhatsApp();

  const { data: channels } = useChannels();
  const activeChannel = channels?.[0];

  const [activeTab, setActiveTab] = useState<'training' | 'qa' | 'behavior' | 'escalation' | 'test' | 'preview'>('training');

  // AI Settings State
  const { data: aiSettings } = useAiSettings(activeChannel?.id || null);
  const saveAiSettings = useSaveAiSettings();

  const [settingsForm, setSettingsForm] = useState({
    isActive: false,
    apiKey: '',
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 500,
    triggerWords: [] as string[],
    systemPrompt: '',
    escalationRules: { enabled: true, maxAttempts: 3, escalationMessage: '', triggerPhrases: [] as string[] },
    responseConfig: { tone: 'Friendly', length: 'Medium (~200 words)', fallback: "I'm sorry, I don't have the information you're looking for." },
    trainFromKB: false,
  });

  const [newTriggerWord, setNewTriggerWord] = useState('');
  const [newEscalationPhrase, setNewEscalationPhrase] = useState('');

  // Test Chat State
  const [testMessage, setTestMessage] = useState("");
  const [testMessages, setTestMessages] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (aiSettings) {
      setSettingsForm({
        isActive: aiSettings.isActive || false,
        apiKey: aiSettings.apiKey || '',
        provider: aiSettings.provider || 'openai',
        endpoint: aiSettings.endpoint || 'https://api.openai.com/v1',
        model: aiSettings.model || 'gpt-4o-mini',
        temperature: parseFloat(aiSettings.temperature) || 0.7,
        maxTokens: parseInt(aiSettings.maxTokens) || 500,
        triggerWords: Array.isArray(aiSettings.triggerWords) 
          ? aiSettings.triggerWords 
          : (typeof aiSettings.triggerWords === 'string' ? JSON.parse(aiSettings.triggerWords || '[]') : []),
        systemPrompt: aiSettings.systemPrompt || '',
        escalationRules: aiSettings.escalationRules || { enabled: true, maxAttempts: 3, escalationMessage: '', triggerPhrases: [] },
        responseConfig: aiSettings.responseConfig || { tone: 'Friendly', length: 'Medium (~200 words)', fallback: "I'm sorry, I don't have the information you're looking for." },
        trainFromKB: aiSettings.trainFromKB || false,
      });
    }
  }, [aiSettings]);

  const handleSaveSettings = () => {
    if (!activeChannel) return;
    saveAiSettings.mutate({
      channelId: activeChannel.id,
      data: {
        ...aiSettings,
        ...settingsForm,
        temperature: settingsForm.temperature.toString(),
        maxTokens: settingsForm.maxTokens.toString(),
        triggerWords: JSON.stringify(settingsForm.triggerWords)
      }
    }, {
      onSuccess: () => toast({ title: 'Saved', description: 'AI configuration saved successfully.' }),
      onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'error' })
    });
  };

  const updateConfig = (key: string, value: any) => {
    setSettingsForm(prev => ({ ...prev, [key]: value }));
  };

  const updateResponseConfig = (key: string, value: string) => {
    setSettingsForm(prev => ({
      ...prev,
      responseConfig: {
        ...prev.responseConfig,
        [key]: value
      }
    }));
  };

  const handleProviderChange = (newProvider: string) => {
    let defaultEndpoint = 'https://api.openai.com/v1';
    let defaultModel = 'gpt-4o-mini';

    if (newProvider === 'gemini') {
      defaultEndpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/';
      defaultModel = 'gemini-1.5-flash';
    } else if (newProvider === 'custom') {
      defaultEndpoint = 'https://api.openai.com/v1';
      defaultModel = 'claude-3-5-sonnet';
    }

    setSettingsForm(prev => ({
      ...prev,
      provider: newProvider,
      endpoint: defaultEndpoint,
      model: defaultModel
    }));
  };

  // Training Sources
  const { data: sources, isLoading: loadingSources } = useTrainingSources(activeChannel?.id || null);
  const addSource = useAddTrainingSource();
  const uploadFile = useUploadTrainingFile();
  const deleteSource = useDeleteTrainingSource();
  const processSource = useProcessTrainingSource();

  const [urlInput, setUrlInput] = useState('');
  const [urlName, setUrlName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewSearch, setPreviewSearch] = useState('');

  const syncKb = useSyncKnowledgeBase();
  const { data: previewData, isLoading: loadingPreview } = useTrainingPreview(activeChannel?.id || null);

  const handleSyncKb = () => {
    if (!activeChannel) return;
    syncKb.mutate(
      { channelId: activeChannel.id },
      {
        onSuccess: (data) => {
          toast({ title: 'Sync Started', description: `Successfully started syncing knowledge base articles. Added ${data?.addedCount || 0} sources.` });
        },
        onError: (err: any) => {
          toast({ title: 'Sync Failed', description: err.message, variant: 'error' });
        }
      }
    );
  };

  const handleAddUrl = () => {
    if (!activeChannel || !urlInput.trim()) return;
    addSource.mutate({
      channelId: activeChannel.id,
      type: 'url',
      name: urlName || urlInput,
      url: urlInput,
      content: null
    }, {
      onSuccess: (newSource) => {
        toast({ title: 'URL added', description: 'Website content is being processed...' });
        setUrlInput('');
        setUrlName('');
        if (newSource?.id) {
          processSource.mutate(newSource.id);
        }
      }
    });
  };

  // QA
  const { data: qaPairs } = useTrainingQaPairs(activeChannel?.id || null);
  const saveQa = useSaveTrainingQaPair();
  const deleteQa = useDeleteTrainingQaPair();

  const [qaForm, setQaForm] = useState({ question: '', answer: '', category: 'general' });

  const handleAddQa = () => {
    if (!activeChannel || !qaForm.question || !qaForm.answer) return;
    saveQa.mutate({
      channelId: activeChannel.id,
      ...qaForm
    }, {
      onSuccess: () => {
        toast({ title: 'Q&A pair added' });
        setQaForm({ question: '', answer: '', category: 'general' });
      }
    });
  };

  const testChatHook = useTestChat();

  const sendTestMessage = async () => {
    if (!testMessage.trim() || !activeChannel) return;

    const userMsg = testMessage;
    const history = [...testMessages];
    
    setTestMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setTestMessage("");
    setIsTesting(true);

    testChatHook.mutate({
      channelId: activeChannel.id,
      message: userMsg,
      history: history
    }, {
      onSuccess: (data) => {
        setTestMessages((prev) => [
          ...prev,
          { 
            role: "bot", 
            text: data?.response || "No response generated.", 
            context: data?.context 
          }
        ]);
        setIsTesting(false);
      },
      onError: (err: any) => {
        setTestMessages((prev) => [
          ...prev,
          { 
            role: "bot", 
            text: `Error: ${err.message}` 
          }
        ]);
        setIsTesting(false);
      }
    });
  };

  // Stats
  const { data: stats } = useTrainingStats(activeChannel?.id || null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "processing": return <Loader2 className="h-4 w-4 text-pp-blue animate-spin" />;
      case "pending": return <Clock className="h-4 w-4 text-amber-500" />;
      case "error": return <XCircle className="h-4 w-4 text-error" />;
      default: return <Clock className="h-4 w-4 text-secondary" />;
    }
  };

  if (!activeChannel) {
    return (
      <div className="py-20 text-center animate-fade-in bg-[var(--bg-card)] rounded-3xl border border-slate-200 dark:border-white/10">
        <Bot className="w-12 h-12 text-muted/30 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-main">Connect WhatsApp First</h3>
        <p className="text-secondary mt-2">You need an active WhatsApp channel to configure AI training.</p>
      </div>
    );
  }

  const tabs = [
    { key: "training", icon: Brain, label: "Training Data" },
    { key: "qa", icon: MessageSquare, label: "Q&A Pairs" },
    { key: "behavior", icon: Shield, label: "AI Behavior" },
    { key: "escalation", icon: AlertTriangle, label: "Escalation" },
    { key: "test", icon: Sparkles, label: "Test Chat" },
    { key: "preview", icon: Eye, label: "Data Preview" },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">


      {/* Tab Navigation */}
      <div className="border-b border-slate-200 dark:border-white/10 mb-6">
        <div className="flex gap-0 overflow-x-auto scrollbar-hide -mb-px">
          {tabs.map(({ key, icon: Icon, label }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--pp-blue)' : 'var(--pp-text-3)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s ease',
                  borderBottom: isActive ? '2px solid var(--pp-blue)' : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget.style.color = 'var(--pp-ink)');
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget.style.color = 'var(--pp-text-3)');
                }}
              >
                <Icon style={{ width: 15, height: 15, flexShrink: 0 }} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Training Stats Cards (matching mockup) */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-50/40 dark:bg-blue-500/5 rounded-2xl border border-blue-100/60 dark:border-blue-500/10 text-center flex flex-col items-center justify-center min-h-[96px] transition-all hover:bg-blue-50/70 dark:hover:bg-blue-500/10">
          <span className="text-2xl font-bold text-pp-blue">{stats?.sourcesCount ?? 0}</span>
          <span className="text-xs font-bold text-secondary mt-1">Sources</span>
        </div>
        <div className="p-4 bg-purple-50/40 dark:bg-purple-500/5 rounded-2xl border border-purple-100/60 dark:border-purple-500/10 text-center flex flex-col items-center justify-center min-h-[96px] transition-all hover:bg-purple-50/70 dark:hover:bg-purple-500/10">
          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats?.chunksCount ?? 0}</span>
          <span className="text-xs font-bold text-secondary mt-1">Chunks</span>
        </div>
        <div className="p-4 bg-emerald-50/40 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100/60 dark:border-emerald-500/10 text-center flex flex-col items-center justify-center min-h-[96px] transition-all hover:bg-emerald-50/70 dark:hover:bg-emerald-500/10">
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.qaCount ?? 0}</span>
          <span className="text-xs font-bold text-secondary mt-1">Q&A Pairs</span>
        </div>
      </div>

      {/* Training Data Tab Content */}
      {activeTab === 'training' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="appt-card p-4 sm:p-6 bg-[var(--bg-card)] shadow-sm border border-slate-200 dark:border-white/10">
            <div className="mb-4">
              <h3 className="text-base font-bold text-main flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Knowledge Base Integration
              </h3>
              <p className="text-xs text-secondary mt-1">Sync your knowledge base articles as AI training data</p>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-500/5 rounded-xl border border-slate-200 dark:border-white/5 mb-4">
              <div>
                <p className="text-sm font-bold text-main">Train from Knowledge Base</p>
                <p className="text-xs text-secondary mt-0.5">Use KB articles to answer customer questions</p>
              </div>
              <label className="pp-switch-wrapper cursor-pointer">
                <input 
                  type="checkbox" 
                  className="pp-switch-input" 
                  checked={settingsForm.trainFromKB}
                  onChange={(e) => updateConfig("trainFromKB", e.target.checked)}
                />
                <span className="pp-switch-slider"></span>
              </label>
            </div>
            
            <button 
              onClick={handleSyncKb}
              disabled={syncKb.isPending}
              className="w-full h-11 bg-[var(--bg-card)] hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm rounded-xl flex items-center justify-center text-sm font-bold text-main dark:text-white transition-all active:scale-[0.98]">
              {syncKb.isPending ? <Loader2 className="h-4 w-4 mr-2 text-pp-blue animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2 text-pp-blue" />}
              Sync Knowledge Base Articles
            </button>
          </div>

          <div className="appt-card p-4 sm:p-6 bg-[var(--bg-card)] shadow-sm border border-slate-200 dark:border-white/10">
            <div className="mb-4">
              <h3 className="text-base font-bold text-main flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Website URL Training
              </h3>
              <p className="text-xs text-secondary mt-1">Add website URLs to scrape and train the AI from</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div style={{ flex: '1 1 auto' }}>
                <input
                  type="text"
                  className="pp-input"
                  placeholder="https://example.com/about"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
              </div>
              <div style={{ flex: '0 1 220px', minWidth: '160px' }}>
                <input
                  type="text"
                  className="pp-input"
                  placeholder="Source name (optional)"
                  value={urlName}
                  onChange={(e) => setUrlName(e.target.value)}
                />
              </div>
              <button
                onClick={handleAddUrl}
                disabled={!urlInput.trim() || addSource.isPending}
                className="h-10 px-5 btn-primary whitespace-nowrap shrink-0"
              >
                {addSource.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Add URL
              </button>
            </div>
          </div>

          <div className="appt-card p-4 sm:p-6 bg-[var(--bg-card)] shadow-sm border border-slate-200 dark:border-white/10">
            <div className="mb-4">
              <h3 className="text-base font-bold text-main flex items-center gap-2">
                <FileUp className="h-4 w-4" />
                Document Upload
              </h3>
              <p className="text-xs text-secondary mt-1">Upload PDF, TXT, CSV, DOCX, or Markdown files</p>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.txt,.csv,.md,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                
                if (file.size > 10 * 1024 * 1024) {
                  toast({
                    title: 'File too large',
                    description: 'Maximum file size allowed is 10MB.',
                    variant: 'error'
                  });
                  return;
                }

                uploadFile.mutate({
                  channelId: activeChannel.id,
                  file
                }, {
                  onSuccess: (newSource) => {
                    toast({
                      title: 'Document Uploaded',
                      description: `${file.name} uploaded successfully and is being processed...`
                    });
                    if (newSource?.id) {
                      processSource.mutate(newSource.id);
                    }
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  },
                  onError: (err: any) => {
                    toast({
                      title: 'Upload Failed',
                      description: err.response?.data?.message || err.message || 'Failed to upload document',
                      variant: 'error'
                    });
                  }
                });
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadFile.isPending}
              className="w-full h-11 bg-slate-50/50 dark:bg-slate-500/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-dashed border-slate-300 dark:border-white/20 rounded-xl flex items-center justify-center text-sm font-bold text-main dark:text-white transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {uploadFile.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin text-pp-blue" />
              ) : (
                <FileUp className="h-4 w-4 mr-2 text-secondary" />
              )}
              {uploadFile.isPending ? 'Uploading Document...' : 'Click to Upload Document'}
            </button>
            <p className="text-xs text-secondary mt-2">
              Max 10MB. Supported: PDF, TXT, CSV, DOCX, MD
            </p>
          </div>

          {sources && sources.length > 0 && (
            <div className="appt-card p-4 sm:p-6 bg-[var(--bg-card)] shadow-sm border border-slate-200 dark:border-white/10">
              <div className="mb-4">
                <h3 className="text-base font-bold text-main flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Training Sources ({sources.length})
                </h3>
              </div>
              
              <div className="space-y-3">
                {sources.map((source: any) => (
                  <div key={source.id} className="flex items-center justify-between p-3 border border-slate-200 dark:border-white/10 rounded-xl">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getStatusIcon(source.status)}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-main truncate">{source.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="px-2 py-0.5 border border-slate-200 dark:border-white/10 rounded bg-[var(--bg-main)] text-[10px] font-bold text-secondary uppercase">
                            {source.type}
                          </span>
                          {source.chunkCount > 0 && (
                            <span className="text-xs text-secondary">{source.chunkCount} chunks</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {source.status === 'error' && (
                        <button 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-main hover:bg-slate-100"
                          onClick={() => processSource.mutate(source.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                      <button 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-error hover:bg-red-50"
                        onClick={() => deleteSource.mutate(source.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Behavior Tab (from screenshot/code match) */}
      {activeTab === 'behavior' && (
        <div className="space-y-6">
          {/* Card 1: AI Provider Configuration */}
          <div className="appt-card p-4 sm:p-6 bg-[var(--bg-card)] shadow-sm border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-main flex items-center gap-2">
                <Settings className="h-4 w-4 text-secondary" />
                AI Provider Configuration
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-main">Active</span>
                <label className="pp-switch-wrapper cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="pp-switch-input" 
                    checked={settingsForm.isActive}
                    onChange={(e) => updateConfig("isActive", e.target.checked)}
                  />
                  <span className="pp-switch-slider"></span>
                </label>
              </div>
            </div>
            <p className="text-xs text-secondary mb-6">Configure your AI model provider, credentials, and trigger words</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-main flex items-center gap-1.5"><Settings className="h-3.5 w-3.5 text-secondary" /> Provider</label>
                <select 
                  className="pp-select"
                  value={settingsForm.provider}
                  onChange={e => handleProviderChange(e.target.value)}
                >
                  <option value="openai">OpenAI (Default)</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="custom">Custom (Claude, Groq, Ollama, etc.)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-main flex items-center gap-1.5"><Key className="h-3.5 w-3.5 text-secondary" /> API Key</label>
                <input 
                  type="password"
                  className="pp-input"
                  placeholder={
                    settingsForm.provider === 'gemini' 
                      ? 'AIzaSy...' 
                      : (settingsForm.provider === 'openai' ? 'sk-...' : 'Enter your API Key')
                  }
                  value={settingsForm.apiKey}
                  onChange={e => updateConfig("apiKey", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-main flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-secondary" /> API Endpoint / Base URL</label>
                <input 
                  type="text"
                  className="pp-input"
                  placeholder="https://api.openai.com/v1"
                  value={settingsForm.endpoint}
                  onChange={e => updateConfig("endpoint", e.target.value)}
                  disabled={settingsForm.provider === 'openai'}
                />
                <p className="text-[10px] text-slate-400">
                  {settingsForm.provider === 'openai' 
                    ? 'Default OpenAI API URL is used' 
                    : (settingsForm.provider === 'gemini' ? 'Google Gemini OpenAI-compatible gateway' : 'Specify custom gateway URL')}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-main flex items-center gap-1.5"><Cpu className="h-3.5 w-3.5 text-secondary" /> Model</label>
                {settingsForm.provider === 'openai' && (
                  <select 
                    className="pp-select"
                    value={settingsForm.model}
                    onChange={e => updateConfig("model", e.target.value)}
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  </select>
                )}
                {settingsForm.provider === 'gemini' && (
                  <select 
                    className="pp-select"
                    value={settingsForm.model}
                    onChange={e => updateConfig("model", e.target.value)}
                  >
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
                  </select>
                )}
                {settingsForm.provider === 'custom' && (
                  <input 
                    type="text"
                    className="pp-input"
                    placeholder="e.g. claude-3-5-sonnet-20241022 or llama-3"
                    value={settingsForm.model}
                    onChange={e => updateConfig("model", e.target.value)}
                  />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-main flex items-center gap-1.5"><Brain className="h-3.5 w-3.5 text-secondary" /> Temperature</label>
                <input 
                  type="number"
                  step="0.1" min="0" max="2"
                  className="pp-input"
                  value={settingsForm.temperature}
                  onChange={e => updateConfig("temperature", parseFloat(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-main flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-secondary" /> Max Tokens</label>
                <input 
                  type="number"
                  step="64" min="1" max="16384"
                  className="pp-input"
                  value={settingsForm.maxTokens}
                  onChange={e => updateConfig("maxTokens", parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-white/10 pt-6">
              <label className="text-xs font-bold text-main flex items-center gap-1.5 mb-1">
                <MessageSquare className="h-3.5 w-3.5 text-secondary" /> Trigger Words
              </label>
              <p className="text-xs text-secondary mb-3">AI will only respond when a message contains one of these words (applies to both widget chat and team inbox)</p>
              
              <div className="flex gap-2 mb-3">
                <div style={{ flex: '1 1 auto', maxWidth: '360px' }}>
                  <input 
                    type="text"
                    className="pp-input"
                    placeholder="e.g., hello, help, pricing"
                    value={newTriggerWord}
                    onChange={e => setNewTriggerWord(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTriggerWord.trim()) {
                        updateConfig("triggerWords", [...settingsForm.triggerWords, newTriggerWord.trim()]);
                        setNewTriggerWord("");
                      }
                    }}
                  />
                </div>
                <button 
                  className="btn-secondary px-4 h-10 shadow-sm border border-slate-200 dark:border-white/10 rounded-xl"
                  onClick={() => {
                    if (newTriggerWord.trim()) {
                      updateConfig("triggerWords", [...settingsForm.triggerWords, newTriggerWord.trim()]);
                      setNewTriggerWord("");
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {settingsForm.triggerWords.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No trigger words defined — AI will respond to all messages</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {settingsForm.triggerWords.map((word, i) => (
                    <span key={i} className="px-3 py-1.5 bg-pp-blue/5 border border-pp-blue/20 text-pp-blue rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                      {word}
                      <button className="hover:bg-pp-blue/20 rounded-full p-0.5 transition-colors" onClick={() => updateConfig("triggerWords", settingsForm.triggerWords.filter((_, idx) => idx !== i))}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: System Prompt */}
          <div className="appt-card p-4 sm:p-6 bg-[var(--bg-card)] shadow-sm border border-slate-200 dark:border-white/10">
            <h3 className="text-base font-bold text-main mb-1 flex items-center gap-2">
              <Bot className="h-4 w-4 text-secondary" />
              System Prompt
            </h3>
            <p className="text-xs text-secondary mb-4">Define how the AI should behave and respond to customers</p>
            
            <div className="space-y-2">
              <textarea 
                className="pp-textarea min-h-[120px]" 
                placeholder="You are a helpful customer support assistant..."
                maxLength={4000}
                value={settingsForm.systemPrompt}
                onChange={e => updateConfig("systemPrompt", e.target.value)}
              />
              <div className="text-right text-xs text-secondary">
                {settingsForm.systemPrompt.length} / 4000 characters
              </div>
            </div>
          </div>

          {/* Card 3: Response Settings */}
          <div className="appt-card p-4 sm:p-6 bg-[var(--bg-card)] shadow-sm border border-slate-200 dark:border-white/10">
            <h3 className="text-base font-bold text-main mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-secondary" />
              Response Settings
            </h3>
            
            <div className="space-y-4 max-w-3xl">
              <div>
                <label className="text-xs font-bold text-main block mb-1.5">Response Tone</label>
                <select 
                  className="pp-select"
                  value={settingsForm.responseConfig.tone}
                  onChange={e => updateResponseConfig("tone", e.target.value)}
                >
                  <option value="Friendly">Friendly</option>
                  <option value="Professional">Professional</option>
                  <option value="Casual">Casual</option>
                  <option value="Empathetic">Empathetic</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-main block mb-1.5">Max Response Length</label>
                <select 
                  className="pp-select"
                  value={settingsForm.responseConfig.length}
                  onChange={e => updateResponseConfig("length", e.target.value)}
                >
                  <option value="Short (~50 words)">Short (~50 words)</option>
                  <option value="Medium (~200 words)">Medium (~200 words)</option>
                  <option value="Long (~500 words)">Long (~500 words)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-main block mb-1.5">Fallback Message</label>
                <textarea 
                  className="pp-textarea min-h-[80px]" 
                  placeholder="I'm sorry, I don't have the information you're looking for."
                  value={settingsForm.responseConfig.fallback}
                  onChange={e => updateResponseConfig("fallback", e.target.value)}
                />
                <p className="text-xs text-secondary mt-1">Shown when the AI cannot generate a response</p>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex justify-end pt-2">
            <button 
              className="btn-primary w-full sm:w-auto h-10 px-6 disabled:opacity-50"
              onClick={handleSaveSettings}
              disabled={saveAiSettings.isPending}
            >
              {saveAiSettings.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Settings className="h-4 w-4 mr-2" />}
              Save AI Settings
            </button>
          </div>
        </div>
      )}

      {/* QA Tab */}
      {activeTab === 'qa' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="appt-card p-4 sm:p-6 bg-[var(--bg-card)] shadow-sm border border-pp-border">
            <h3 className="text-base font-bold text-main mb-1">Add Q&A Pair</h3>
            <p className="text-xs text-secondary mb-4">Add custom question-answer pairs for the AI to learn from</p>
            
            <div className="space-y-4 max-w-3xl">
              <div>
                <label className="text-xs font-bold text-main block mb-1.5">Question</label>
                <input 
                  type="text" 
                  className="pp-input" 
                  placeholder="What are your business hours?"
                  value={qaForm.question}
                  onChange={e => setQaForm({ ...qaForm, question: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-main block mb-1.5">Answer</label>
                <textarea 
                  className="pp-textarea" 
                  placeholder="We are open Monday-Friday from 9 AM to 6 PM..."
                  value={qaForm.answer}
                  onChange={e => setQaForm({ ...qaForm, answer: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-main block mb-1.5">Category</label>
                <select 
                  className="pp-select"
                  value={qaForm.category}
                  onChange={e => setQaForm({ ...qaForm, category: e.target.value })}
                >
                  <option value="General">General</option>
                  <option value="Pricing">Pricing</option>
                  <option value="Medical">Medical</option>
                  <option value="Support">Support</option>
                </select>
              </div>
              <div className="flex justify-end pt-2">
                <button 
                  className="btn-primary w-full h-10 disabled:opacity-50"
                  onClick={handleAddQa}
                  disabled={!qaForm.question.trim() || !qaForm.answer.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Q&A Pair
                </button>
              </div>
            </div>
          </div>
          
          {qaPairs && qaPairs.length > 0 && (
            <div className="appt-card p-4 sm:p-6 bg-[var(--bg-card)] shadow-sm border border-pp-border">
              <h3 className="text-base font-bold text-main mb-4">Existing Q&A Pairs ({qaPairs.length})</h3>
              <div className="space-y-3">
                {qaPairs.map((qa: any) => (
                  <div key={qa.id} className="p-4 border border-pp-border rounded-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2 py-0.5 border border-pp-border rounded bg-[var(--bg-main)] text-[10px] font-bold text-secondary uppercase mb-2 inline-block">
                          {qa.category}
                        </span>
                        <p className="text-sm font-bold text-main">Q: {qa.question}</p>
                        <p className="text-sm text-secondary mt-1">A: {qa.answer}</p>
                      </div>
                      <button 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-error hover:bg-red-50"
                        onClick={() => deleteQa.mutate(qa.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Escalation Tab */}
      {activeTab === 'escalation' && (
        <div className="appt-card p-4 sm:p-6 bg-[var(--bg-card)] shadow-sm border border-pp-border">
          <div className="mb-4">
            <h3 className="text-base font-bold text-main flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Escalation Rules
            </h3>
            <p className="text-xs text-secondary mt-1">Configure when the AI should transfer conversations to human agents</p>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm font-bold text-main">Enable Auto-Escalation</p>
              <p className="text-xs text-secondary mt-0.5">Automatically transfer to an agent when AI can't help</p>
            </div>
            <label className="pp-switch-wrapper cursor-pointer">
              <input 
                type="checkbox" 
                className="pp-switch-input" 
                checked={settingsForm.escalationRules.enabled}
                onChange={(e) => updateConfig("escalationRules", { ...settingsForm.escalationRules, enabled: e.target.checked })}
              />
              <span className="pp-switch-slider"></span>
            </label>
          </div>

          {settingsForm.escalationRules.enabled && (
            <div className="space-y-6 pt-6 border-t border-pp-border">
              <div className="space-y-2 max-w-md">
                <label className="text-sm font-bold text-main">Max Unanswered Attempts</label>
                <select 
                  className="pp-select"
                  value={settingsForm.escalationRules.maxAttempts}
                  onChange={(e) => updateConfig("escalationRules", { ...settingsForm.escalationRules, maxAttempts: parseInt(e.target.value) })}
                >
                  <option value="1">After 1 failed attempt</option>
                  <option value="2">After 2 failed attempts</option>
                  <option value="3">After 3 failed attempts</option>
                  <option value="5">After 5 failed attempts</option>
                </select>
                <p className="text-xs text-secondary">Transfer to agent after this many questions the AI couldn't answer</p>
              </div>

              <div className="space-y-2 max-w-3xl">
                <label className="text-sm font-bold text-main">Trigger Phrases</label>
                <div className="flex gap-2">
                  <div style={{ flex: '1 1 auto' }}>
                    <input 
                      type="text" 
                      className="pp-input"
                      placeholder="e.g., speak to manager"
                      value={newEscalationPhrase}
                      onChange={(e) => setNewEscalationPhrase(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newEscalationPhrase.trim()) {
                          updateConfig("escalationRules", { 
                            ...settingsForm.escalationRules, 
                            triggerPhrases: [...(settingsForm.escalationRules.triggerPhrases || []), newEscalationPhrase.trim()] 
                          });
                          setNewEscalationPhrase("");
                        }
                      }}
                    />
                  </div>
                  <button 
                    className="btn-secondary px-4 h-10 shadow-sm border border-pp-border rounded-xl"
                    onClick={() => {
                      if (newEscalationPhrase.trim()) {
                        updateConfig("escalationRules", { 
                          ...settingsForm.escalationRules, 
                          triggerPhrases: [...(settingsForm.escalationRules.triggerPhrases || []), newEscalationPhrase.trim()] 
                        });
                        setNewEscalationPhrase("");
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {settingsForm.escalationRules.triggerPhrases && settingsForm.escalationRules.triggerPhrases.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {settingsForm.escalationRules.triggerPhrases.map((phrase: string, i: number) => (
                      <span key={i} className="px-3 py-1.5 bg-error/5 border border-error/20 text-error rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                        {phrase}
                        <button className="hover:bg-error/20 rounded-full p-0.5 transition-colors" onClick={() => updateConfig("escalationRules", { ...settingsForm.escalationRules, triggerPhrases: settingsForm.escalationRules.triggerPhrases.filter((_: string, idx: number) => idx !== i) })}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-secondary mt-1">Immediately escalate when user mentions these phrases</p>
              </div>

              <div className="space-y-2 max-w-3xl">
                <label className="text-sm font-bold text-main">Escalation Message</label>
                <textarea 
                  className="pp-textarea"
                  value={settingsForm.escalationRules.escalationMessage}
                  onChange={(e) => updateConfig("escalationRules", { ...settingsForm.escalationRules, escalationMessage: e.target.value })}
                  placeholder="Let me connect you with a team member who can help you better."
                />
                <p className="text-xs text-secondary">Message shown to user when transferring to an agent</p>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-8 border-t border-pp-border pt-6">
            <button 
              className="btn-primary w-full sm:w-auto h-10 px-6 disabled:opacity-50"
              onClick={handleSaveSettings}
              disabled={saveAiSettings.isPending}
            >
              {saveAiSettings.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Settings className="h-4 w-4 mr-2" />}
              Save Escalation Rules
            </button>
          </div>
        </div>
      )}

      {/* Test Chat Tab */}
      {activeTab === 'test' && (
        <div className="appt-card p-4 sm:p-6 bg-[var(--bg-card)] shadow-sm border border-pp-border">
          <div className="mb-4">
            <h3 className="text-base font-bold text-main flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-pp-blue" />
              Test AI Chat
            </h3>
            <p className="text-xs text-secondary mt-1">Test how your AI responds using current training data and settings</p>
          </div>

          <div className="border border-pp-border rounded-xl overflow-hidden bg-[var(--bg-main)] flex flex-col h-[400px]">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {testMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-secondary">
                  <Sparkles className="h-8 w-8 mb-2 opacity-50 text-pp-blue" />
                  <p className="text-sm font-bold text-main">Send a message to test the AI</p>
                  <p className="text-xs">Uses your actual training data and system prompt</p>
                </div>
              ) : (
                testMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                      msg.role === "user" ? "bg-pp-blue text-white" : "bg-white border border-pp-border shadow-sm text-main"
                    }`}>
                      <p className="text-sm">{msg.text}</p>
                      {msg.context && (
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-500/20 text-[10px] text-secondary font-medium">
                          Context: {msg.context.chunksFound} chunks, {msg.context.qaPairsFound} Q&A pairs used
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isTesting && (
                <div className="flex justify-start">
                  <div className="bg-white border border-pp-border shadow-sm rounded-2xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-pp-blue" />
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 bg-[var(--bg-card)] border-t border-pp-border flex gap-2">
              <div style={{ flex: '1 1 auto' }}>
                <input 
                  type="text" 
                  className="pp-input" 
                  placeholder="Type a test message..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendTestMessage()}
                  disabled={isTesting}
                />
              </div>
              <button 
                className="w-10 h-10 btn-primary !px-0 justify-center disabled:opacity-50"
                onClick={sendTestMessage}
                disabled={!testMessage.trim() || isTesting}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
          {testMessages.length > 0 && (
            <button className="mt-4 text-sm font-bold text-error" onClick={() => setTestMessages([])}>Clear Chat</button>
          )}
        </div>
      )}

      {/* Data Preview Tab */}
      {activeTab === 'preview' && (
        <div className="appt-card p-4 sm:p-6 bg-[var(--bg-card)] shadow-sm border border-pp-border">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-main flex items-center gap-2">
                <Eye className="h-4 w-4 text-pp-blue" />
                Data Preview
              </h3>
              <p className="text-xs text-secondary mt-1">Explore all chunks and data the AI currently uses to answer questions</p>
            </div>
            
            <div className="w-full sm:w-64">
              <input 
                type="text" 
                className="pp-input text-sm" 
                placeholder="Search training chunks..."
                value={previewSearch}
                onChange={(e) => setPreviewSearch(e.target.value)}
              />
            </div>
          </div>
          
          {loadingPreview ? (
            <div className="text-center py-12 text-secondary bg-[var(--bg-main)] rounded-xl border border-dashed border-pp-border">
              <Loader2 className="h-8 w-8 mx-auto mb-2 text-pp-blue animate-spin" />
              <p className="text-sm font-bold text-main">Loading Preview Data...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* QA Pairs Preview */}
              {(previewData?.qaPairs?.length || 0) > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-main flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-emerald-500" />
                    Q&A Pairs ({previewData.qaPairs.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {previewData.qaPairs
                      .filter((qa: any) => 
                        !previewSearch || 
                        qa.question.toLowerCase().includes(previewSearch.toLowerCase()) || 
                        qa.answer.toLowerCase().includes(previewSearch.toLowerCase())
                      )
                      .map((qa: any) => (
                      <div key={qa.id} className="p-4 rounded-xl border border-pp-border bg-slate-50 dark:bg-slate-800/30">
                        <div className="flex gap-2">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Q:</span>
                          <p className="text-sm font-medium text-main mb-2">{qa.question}</p>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">A:</span>
                          <p className="text-xs text-secondary leading-relaxed">{qa.answer}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chunks Preview */}
              {(previewData?.sourcesWithChunks?.length || 0) > 0 ? (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-main flex items-center gap-2">
                    <Database className="h-4 w-4 text-purple-500" />
                    Indexed Document Chunks
                  </h4>
                  
                  {previewData.sourcesWithChunks.map((sourceObj: any) => {
                    const filteredChunks = sourceObj.chunks.filter((chunk: any) => 
                      !previewSearch || chunk.content.toLowerCase().includes(previewSearch.toLowerCase())
                    );
                    
                    if (filteredChunks.length === 0) return null;

                    return (
                      <div key={sourceObj.source.id} className="border border-pp-border rounded-xl overflow-hidden">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 border-b border-pp-border flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {sourceObj.source.type === 'url' ? <Globe className="h-4 w-4 text-blue-500" /> : <FileText className="h-4 w-4 text-orange-500" />}
                            <span className="text-sm font-bold text-main">{sourceObj.source.name || sourceObj.source.url}</span>
                          </div>
                          <span className="text-xs font-medium text-secondary">{filteredChunks.length} Chunks</span>
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                          {filteredChunks.map((chunk: any) => (
                            <div key={chunk.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                              <p className="text-xs text-main leading-relaxed line-clamp-6">{chunk.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-secondary bg-[var(--bg-main)] rounded-xl border border-dashed border-pp-border">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-bold text-main">No Preview Data</p>
                  <p className="text-xs mt-1">There are no completed training sources or Q&A pairs yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
