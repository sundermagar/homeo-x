import React, { useState } from 'react';
import { useWhatsApp } from '../hooks/use-whatsapp';
import { FileText, RefreshCw, Search, CheckCircle, AlertCircle, X, ShieldAlert, Plus, Trash } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Drawer } from '@/shared/components/drawer';

export const Templates = () => {
  const { useChannels, useTemplates, useSyncTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate, useUploadMedia } = useWhatsApp();
  const { data: channels, isLoading: loadingChannels } = useChannels();
  
  const [selectedChannelId, setSelectedChannelId] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  
  const uploadMutation = useUploadMedia();
  
  // Edit States
  const updateMutation = useUpdateTemplate();
  const deleteMutation = useDeleteTemplate();
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState({
    header: '',
    body: '',
    footer: '',
    mediaType: 'text',
    mediaUrl: '',
    mediaFile: null as File | null
  });

  // Create Dialog States
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'marketing',
    language: 'en_US',
    header: '',
    body: '',
    footer: '',
    buttons: [] as any[],
    mediaType: 'text',
    mediaUrl: '',
    mediaFile: null as File | null
  });

  // Sync edit state with selected template
  React.useEffect(() => {
    if (selectedTemplate) {
      setEditedTemplate({
        header: selectedTemplate.header || '',
        body: selectedTemplate.body || '',
        footer: selectedTemplate.footer || '',
        mediaType: selectedTemplate.mediaType || 'text',
        mediaUrl: selectedTemplate.mediaUrl || ''
      });
      setIsEditingTemplate(false);
    } else {
      setIsEditingTemplate(false);
    }
  }, [selectedTemplate]);

  // Button Draft State inside Create Dialog
  const [btnType, setBtnType] = useState('QUICK_REPLY');
  const [btnText, setBtnText] = useState('');
  const [btnUrl, setBtnUrl] = useState('');
  const [btnPhone, setBtnPhone] = useState('');

  // Set default channel when loaded
  React.useEffect(() => {
    if (channels && channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0]?.id);
    }
  }, [channels, selectedChannelId]);

  const { data: templates, isLoading: loadingTemplates } = useTemplates(selectedChannelId);
  const syncMutation = useSyncTemplates();
  const createMutation = useCreateTemplate();

  const handleSync = async () => {
    if (!selectedChannelId) return;
    try {
      await syncMutation.mutateAsync(selectedChannelId);
      toast({
        title: 'Templates Synchronized',
        description: 'Latest templates successfully pulled from Meta Business suite.',
        variant: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Sync Failed',
        description: err.message || 'Unable to fetch templates. Please verify channel credentials.',
        variant: 'error',
      });
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannelId) {
      toast({
        title: 'Error',
        description: 'Please select a WhatsApp channel first.',
        variant: 'error',
      });
      return;
    }
    if (!newTemplate.name.trim() || !newTemplate.body.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Template name and body text are required.',
        variant: 'error',
      });
      return;
    }

    // Name formatting (lowercase and underscores only)
    const formattedName = newTemplate.name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');

    try {
      let mediaHandle = '';
      if ((newTemplate.mediaType === 'image_upload' || newTemplate.mediaType === 'video_upload') && newTemplate.mediaFile && selectedChannelId) {
        const uploadResult = await uploadMutation.mutateAsync({
          channelId: selectedChannelId,
          file: newTemplate.mediaFile,
          title: newTemplate.name + '_header'
        });
        mediaHandle = uploadResult.mediaId;
      }

      const finalMediaType = newTemplate.mediaType === 'image_upload' ? 'image' 
        : newTemplate.mediaType === 'video_upload' ? 'video' 
        : newTemplate.mediaType;

      await createMutation.mutateAsync({
        channelId: selectedChannelId,
        name: formattedName,
        category: newTemplate.category,
        language: newTemplate.language,
        header: newTemplate.header,
        body: newTemplate.body,
        footer: newTemplate.footer,
        buttons: newTemplate.buttons,
        mediaType: finalMediaType,
        mediaUrl: newTemplate.mediaUrl,
        mediaHandle: mediaHandle || undefined,
      });

      toast({
        title: 'Template Created',
        description: `Successfully registered template "${formattedName}" in database.`,
        variant: 'success',
      });

      setShowCreateDialog(false);
      setNewTemplate({
        name: '',
        category: 'marketing',
        language: 'en_US',
        header: '',
        body: '',
        footer: '',
        buttons: [],
        mediaType: 'text',
        mediaUrl: '',
        mediaFile: null
      });
    } catch (err: any) {
      toast({
        title: 'Creation Failed',
        description: err.response?.data?.message || err.message || 'Failed to create template.',
        variant: 'error',
      });
    }
  };

  const handleAddButton = () => {
    if (!btnText.trim()) return;
    const newBtn: any = { type: btnType, text: btnText };
    if (btnType === 'URL') newBtn.url = btnUrl;
    if (btnType === 'PHONE_NUMBER') newBtn.phoneNumber = btnPhone;

    setNewTemplate({
      ...newTemplate,
      buttons: [...newTemplate.buttons, newBtn],
    });

    setBtnText('');
    setBtnUrl('');
    setBtnPhone('');
  };

  const handleRemoveButton = (idx: number) => {
    setNewTemplate({
      ...newTemplate,
      buttons: newTemplate.buttons.filter((_, i) => i !== idx),
    });
  };

  const filteredTemplates = templates?.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
          <CheckCircle size={12} />
          Approved
        </span>
      );
    }
    if (s === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
          <ShieldAlert size={12} />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
        <AlertCircle size={12} />
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white p-6 rounded-2xl border border-pp-border shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 flex-1 items-stretch md:items-center">
          <div className="w-full md:w-64">
            <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Select Channel</label>
            <select
              value={selectedChannelId || ''}
              onChange={(e) => setSelectedChannelId(Number(e.target.value))}
              className="pp-input w-full h-11"
            >
              {loadingChannels ? (
                <option>Loading channels...</option>
              ) : (
                channels?.map(ch => (
                  <option key={ch.id} value={ch.id}>{ch.name} ({ch.phoneNumber})</option>
                ))
              )}
            </select>
          </div>

          <div className="flex-1 max-w-md mt-4 md:mt-0">
            <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Search Templates</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search template name, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pp-input w-full h-11 pl-10"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-2 sm:mt-0 self-stretch sm:self-auto">
          <button
            onClick={() => setShowCreateDialog(true)}
            className="btn-primary h-11 px-6 flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto"
          >
            <Plus size={16} />
            Create Template
          </button>
          
          <button
            onClick={handleSync}
            disabled={syncMutation.isPending || !selectedChannelId}
            className="h-11 px-6 bg-pp-bg-subtle text-secondary font-semibold rounded-xl border border-pp-border flex items-center justify-center gap-2 hover:bg-pp-bg-subtle/80 hover:text-main transition-all whitespace-nowrap w-full sm:w-auto"
          >
            <RefreshCw className={syncMutation.isPending ? 'animate-spin' : ''} size={16} />
            Sync from Meta
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      {loadingTemplates ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pp-blue" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="pp-table-container-enhanced p-16 flex flex-col items-center justify-center text-center bg-white/50 border border-pp-border rounded-3xl">
          <FileText className="w-16 h-16 text-muted/30 mb-4" />
          <h3 className="text-lg font-bold text-main">No Templates Found</h3>
          <p className="text-secondary max-w-sm mx-auto text-sm mt-1">
            Click 'Create Template' or sync existing templates from your Meta Business account to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template: any) => (
            <div
              key={template.id || template.whatsappTemplateId || template.name}
              onClick={() => setSelectedTemplate(template)}
              className="appt-card p-6 bg-white border border-pp-border rounded-2xl flex flex-col justify-between hover:border-pp-blue transition-all duration-300 cursor-pointer shadow-sm group hover:-translate-y-1"
            >
              <div>
                <div className="flex justify-between items-start gap-4">
                  <div className="truncate flex-1">
                    <h4 className="font-bold text-main truncate group-hover:text-pp-blue transition-all">{template.name}</h4>
                    <p className="text-[11px] uppercase tracking-wider text-muted mt-0.5">{template.category}</p>
                  </div>
                  {getStatusBadge(template.status)}
                </div>

                <div className="bg-pp-bg-subtle/50 p-4 rounded-xl mt-4 font-mono text-[11px] text-secondary leading-relaxed border border-pp-border line-clamp-4 min-h-[92px]">
                  {template.body}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between pt-4 border-t border-pp-border text-xs text-muted">
                <span>Lang: <strong className="text-main uppercase">{template.language}</strong></span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
                        deleteMutation.mutate(template.id, {
                          onSuccess: () => toast({ title: 'Template Deleted', variant: 'success' }),
                          onError: (err: any) => toast({ title: 'Delete Failed', description: err.message, variant: 'error' })
                        });
                      }
                    }}
                    className="p-1.5 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors z-10"
                    title="Delete Template"
                  >
                    <Trash size={14} />
                  </button>
                  <span>Click to Preview</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE TEMPLATE DIALOG */}
      <Drawer
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        title="Create WhatsApp Template"
        maxWidth="950px"
      >
        <div className="flex flex-col md:flex-row -m-6 h-[calc(100vh-73px)] overflow-hidden">
          {/* Template Form Builder */}
          <form onSubmit={handleCreateTemplate} className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6">
            <div>
              <p className="text-xs text-secondary">Design message structures to send patient campaigns globally.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Template Name */}
              <div>
                <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Template Name (Lowercase & Underscores only)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. prescription_ready"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                  className="pp-input w-full h-11"
                />
              </div>

              {/* Category Selector */}
              <div>
                <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Category</label>
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  className="pp-input w-full h-11"
                >
                  <option value="marketing">Marketing (Promotions, alerts)</option>
                  <option value="utility">Utility (Prescriptions, notifications)</option>
                  <option value="authentication">Authentication (One-time codes)</option>
                </select>
              </div>
            </div>

            {/* Header Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Header Type</label>
                <select
                  value={newTemplate.mediaType}
                  onChange={(e) => setNewTemplate({ ...newTemplate, mediaType: e.target.value, header: '' })}
                  className="pp-input w-full h-11"
                >
                  <option value="text">Text Title</option>
                  <option value="image">Image (URL)</option>
                  <option value="image_upload">Image (Upload File)</option>
                  <option value="video">Video (URL)</option>
                  <option value="video_upload">Video (Upload File)</option>
                </select>
              </div>

              {newTemplate.mediaType === 'text' ? (
                <div>
                  <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Header Title Text (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Appointment Confirmation"
                    value={newTemplate.header}
                    onChange={(e) => setNewTemplate({ ...newTemplate, header: e.target.value })}
                    className="pp-input w-full h-11"
                  />
                </div>
              ) : newTemplate.mediaType === 'image_upload' || newTemplate.mediaType === 'video_upload' ? (
                <div>
                  <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Upload Media File (Max 16MB)</label>
                  <input
                    type="file"
                    accept={newTemplate.mediaType === 'image_upload' ? 'image/*' : 'video/*'}
                    onChange={(e) => setNewTemplate({ ...newTemplate, mediaFile: e.target.files?.[0] || null, mediaUrl: e.target.files?.[0] ? URL.createObjectURL(e.target.files[0]) : '' })}
                    className="pp-input w-full pt-2.5 h-11"
                  />
                </div>
              ) : (
                <div>
                  <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Media URL (Must be publicly accessible)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newTemplate.mediaUrl}
                    onChange={(e) => setNewTemplate({ ...newTemplate, mediaUrl: e.target.value })}
                    className="pp-input w-full h-11"
                  />
                </div>
              )}
            </div>

            {/* Body Content */}
            <div>
              <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Body Message Text (Supports variables like {"{{1}}"})</label>
              <textarea
                rows={4}
                required
                placeholder="e.g. Hello {{1}}, your homeopathy prescription is ready for pickup."
                value={newTemplate.body}
                onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                className="pp-input w-full p-3 font-sans text-sm"
              />
            </div>

            {/* Footer text */}
            <div>
              <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Footer Text (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Reply STOP to unsubscribe"
                value={newTemplate.footer}
                onChange={(e) => setNewTemplate({ ...newTemplate, footer: e.target.value })}
                className="pp-input w-full h-11"
              />
            </div>

            {/* Interactive buttons builder */}
            <div className="space-y-4 pt-2">
              <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1 block">Interactive Buttons (Optional)</label>
              
              {/* Current buttons list */}
              {newTemplate.buttons.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {newTemplate.buttons.map((btn, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pp-bg-subtle text-xs font-semibold text-main rounded-xl border border-pp-border">
                      {btn.text} ({btn.type})
                      <button type="button" onClick={() => handleRemoveButton(idx)} className="text-red-500 hover:text-red-700 ml-1">✕</button>
                    </span>
                  ))}
                </div>
              )}

              <div className="bg-pp-bg-subtle/50 p-4 rounded-2xl border border-pp-border flex flex-col md:flex-row flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[120px]">
                  <span className="text-[10px] text-secondary mb-1 block">Type</span>
                  <select value={btnType} onChange={(e) => setBtnType(e.target.value)} className="pp-input w-full h-10 text-xs">
                    <option value="QUICK_REPLY">Quick Reply Button</option>
                    <option value="URL">Visit Website URL</option>
                    <option value="PHONE_NUMBER">Call Phone Number</option>
                  </select>
                </div>
                <div className="flex-1">
                  <span className="text-[10px] text-secondary mb-1 block">Button Label Text</span>
                  <input
                    type="text"
                    placeholder="e.g. Pay Invoice"
                    value={btnText}
                    onChange={(e) => setBtnText(e.target.value)}
                    className="pp-input w-full h-10 text-xs"
                  />
                </div>
                
                {btnType === 'URL' && (
                  <div className="flex-1">
                    <span className="text-[10px] text-secondary mb-1 block">Destination URL</span>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={btnUrl}
                      onChange={(e) => setBtnUrl(e.target.value)}
                      className="pp-input w-full h-10 text-xs"
                    />
                  </div>
                )}

                {btnType === 'PHONE_NUMBER' && (
                  <div className="flex-1">
                    <span className="text-[10px] text-secondary mb-1 block">Phone Number</span>
                    <input
                      type="text"
                      placeholder="+91..."
                      value={btnPhone}
                      onChange={(e) => setBtnPhone(e.target.value)}
                      className="pp-input w-full h-10 text-xs"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddButton}
                  className="h-10 px-4 bg-pp-blue text-white rounded-xl text-xs font-bold hover:bg-pp-blue/90 shrink-0"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Form Action Controls */}
            <div className="flex gap-4 pt-4 justify-end border-t border-pp-border">
              <button
                type="button"
                onClick={() => setShowCreateDialog(false)}
                className="h-11 px-6 bg-pp-bg-subtle text-secondary font-semibold rounded-xl border border-pp-border hover:bg-pp-bg-subtle/80 hover:text-main transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-primary h-11 px-8 flex items-center justify-center gap-2"
              >
                {createMutation.isPending && <RefreshCw className="animate-spin" size={16} />}
                Submit to Meta
              </button>
            </div>
          </form>

          {/* Premium Phone Preview Mockup (Updates Live!) */}
          <div className="bg-pp-bg-subtle p-6 md:p-8 border-t md:border-t-0 md:border-l border-pp-border flex items-center justify-center shrink-0 w-full md:w-[320px] overflow-y-auto">
            <div className="w-[245px] h-[480px] bg-main rounded-[38px] p-2.5 shadow-2xl relative border-4 border-muted/20">
              {/* Speaker/Camera bar */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-main rounded-full z-10 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-secondary/50 rounded-full mr-2" />
                <div className="w-8 h-1 bg-secondary/30 rounded-full" />
              </div>

              {/* Simulated Screen */}
              <div className="w-full h-full bg-[#efeae2] rounded-[30px] overflow-hidden flex flex-col justify-between pt-6 pb-4 px-3 border border-main/10 relative">
                
                {/* Whatsapp Header */}
                <div className="bg-[#075e54] text-white p-2.5 text-[10px] font-bold absolute top-0 left-0 right-0 flex items-center gap-1.5 pl-6 pt-5">
                  <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center text-[7px]">W</div>
                  <span className="truncate">{newTemplate.name || 'new_template_preview'}</span>
                </div>

                {/* Message bubble */}
                <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-black/5 mt-10 relative text-[10px] leading-relaxed text-main self-start max-w-[95%] w-full">
                  {(newTemplate.mediaType === 'image' || newTemplate.mediaType === 'image_upload') && newTemplate.mediaUrl && (
                    <div className="w-full h-24 bg-gray-100 rounded-xl mb-2 overflow-hidden border border-pp-border/50">
                      <img src={newTemplate.mediaUrl} alt="Header Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as any).src = 'https://placehold.co/400x200?text=Image+Preview' }} />
                    </div>
                  )}
                  {(newTemplate.mediaType === 'video' || newTemplate.mediaType === 'video_upload') && newTemplate.mediaUrl && (
                    <div className="w-full h-24 bg-gray-200 rounded-xl mb-2 flex items-center justify-center border border-pp-border/50 relative overflow-hidden">
                       <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-10">
                         <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white pl-0.5">▶</div>
                       </div>
                       <video src={newTemplate.mediaUrl} className="w-full h-full object-cover opacity-50" />
                    </div>
                  )}
                  {newTemplate.mediaType === 'text' && newTemplate.header && (
                    <div className="font-extrabold text-[10px] text-main border-b border-pp-border/50 pb-1 mb-1.5">
                      {newTemplate.header}
                    </div>
                  )}
                  
                  <div className="whitespace-pre-wrap">
                    {newTemplate.body || 'Hello {{1}}, your template body message preview will render dynamically here as you type...'}
                  </div>

                  {newTemplate.footer && (
                    <div className="text-[8px] text-muted mt-1">
                      {newTemplate.footer}
                    </div>
                  )}

                  {/* Time & tick */}
                  <div className="text-[7px] text-muted text-right mt-1.5 flex items-center justify-end gap-0.5">
                    12:30 PM
                    <span className="text-green-500">✓✓</span>
                  </div>

                  {/* Render Action Buttons inside mockup */}
                  {newTemplate.buttons.length > 0 && (
                    <div className="border-t border-pp-border/50 mt-2.5 pt-1.5 space-y-1">
                      {newTemplate.buttons.map((btn, idx) => (
                        <div key={idx} className="w-full py-1 text-center font-bold text-[#00a884] bg-pp-bg-subtle/30 hover:bg-pp-bg-subtle/60 rounded-lg text-[9px] border border-black/5 cursor-pointer">
                          {btn.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Simulated Input field */}
                <div className="bg-white rounded-full p-1.5 flex items-center justify-between border border-black/5">
                  <div className="w-4 h-4 bg-pp-bg-subtle rounded-full" />
                  <div className="flex-1 bg-pp-bg-subtle/50 h-3 rounded-full mx-2" />
                  <div className="w-4 h-4 bg-[#075e54] rounded-full flex items-center justify-center text-white text-[8px]">▶</div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </Drawer>

      {/* FLOAT DETAILS PREVIEW DIALOG */}
      <Drawer
        isOpen={!!selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        title={selectedTemplate?.name || 'Template Details'}
        maxWidth="750px"
      >
        {selectedTemplate && (
          <div className="flex flex-col md:flex-row -m-6 h-[calc(100vh-73px)] overflow-hidden">
            {/* Template Information */}
            <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] text-muted uppercase block">Status</span>
                  {getStatusBadge(selectedTemplate.status)}
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase block">Language</span>
                  <span className="text-sm font-semibold uppercase">{selectedTemplate.language}</span>
                </div>
              </div>

              <div className="space-y-4">
                {isEditingTemplate ? (
                  <div className="space-y-4 animate-slide-up">
                    {/* Header Input */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Header Type</label>
                        <select
                          value={editedTemplate.mediaType}
                          onChange={(e) => setEditedTemplate({ ...editedTemplate, mediaType: e.target.value, header: '' })}
                          className="pp-input w-full h-11"
                        >
                          <option value="text">Text Title</option>
                          <option value="image">Image (URL)</option>
                          <option value="image_upload">Image (Upload File)</option>
                          <option value="video">Video (URL)</option>
                          <option value="video_upload">Video (Upload File)</option>
                        </select>
                      </div>

                      {editedTemplate.mediaType === 'text' ? (
                        <div>
                          <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Header Title Text (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. Appointment Confirmation"
                            value={editedTemplate.header}
                            onChange={(e) => setEditedTemplate({ ...editedTemplate, header: e.target.value })}
                            className="pp-input w-full h-11"
                          />
                        </div>
                      ) : editedTemplate.mediaType === 'image_upload' || editedTemplate.mediaType === 'video_upload' ? (
                        <div>
                          <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Upload Media File</label>
                          <input
                            type="file"
                            accept={editedTemplate.mediaType === 'image_upload' ? 'image/*' : 'video/*'}
                            onChange={(e) => setEditedTemplate({ ...editedTemplate, mediaFile: e.target.files?.[0] || null, mediaUrl: e.target.files?.[0] ? URL.createObjectURL(e.target.files[0]) : '' })}
                            className="pp-input w-full pt-2.5 h-11"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Media URL</label>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={editedTemplate.mediaUrl}
                            onChange={(e) => setEditedTemplate({ ...editedTemplate, mediaUrl: e.target.value })}
                            className="pp-input w-full h-11"
                          />
                        </div>
                      )}
                    </div>

                    {/* Body Content */}
                    <div>
                      <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Body Message Text (Supports variables like {"{{1}}"})</label>
                      <textarea
                        rows={6}
                        required
                        placeholder="e.g. Hello {{1}}, your homeopathy prescription is ready for pickup."
                        value={editedTemplate.body}
                        onChange={(e) => setEditedTemplate({ ...editedTemplate, body: e.target.value })}
                        className="pp-input w-full p-3 font-sans text-sm"
                      />
                    </div>

                    {/* Footer text */}
                    <div>
                      <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Footer Text (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Reply STOP to unsubscribe"
                        value={editedTemplate.footer}
                        onChange={(e) => setEditedTemplate({ ...editedTemplate, footer: e.target.value })}
                        className="pp-input w-full h-11"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-bold text-main">Template Content</h4>
                    
                    {selectedTemplate.mediaType === 'image' && selectedTemplate.mediaUrl && (
                      <div className="w-full max-w-[200px] h-32 bg-gray-100 rounded-xl mt-2 overflow-hidden border border-pp-border/50">
                        <img src={selectedTemplate.mediaUrl} alt="Media" className="w-full h-full object-cover" onError={(e) => { (e.target as any).src = 'https://placehold.co/400x200?text=Image+Preview' }} />
                      </div>
                    )}
                    {selectedTemplate.mediaType === 'video' && selectedTemplate.mediaUrl && (
                      <div className="w-full max-w-[200px] h-32 bg-gray-200 rounded-xl mt-2 flex items-center justify-center border border-pp-border/50 relative overflow-hidden">
                         <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-10">
                           <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white pl-0.5">▶</div>
                         </div>
                         <video src={selectedTemplate.mediaUrl} className="w-full h-full object-cover opacity-50" />
                      </div>
                    )}
                    {selectedTemplate.mediaType === 'text' && selectedTemplate.header && (
                      <div className="font-extrabold text-[12px] text-main border-b border-pp-border/50 pb-1 mt-2">
                        {selectedTemplate.header}
                      </div>
                    )}
                    <div className="bg-pp-bg-subtle/50 p-4 rounded-2xl border border-pp-border text-sm leading-relaxed mt-2 text-secondary whitespace-pre-wrap font-mono">
                      {selectedTemplate.body}
                    </div>
                    {selectedTemplate.footer && (
                      <div className="text-[10px] text-muted italic mt-1.5 pl-1">
                        {selectedTemplate.footer}
                      </div>
                    )}
                  </div>
                )}

                {selectedTemplate.buttons && (
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-bold text-main mb-2">Interactive Buttons</h4>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(selectedTemplate.buttons) ? selectedTemplate.buttons.map((btn: any, idx: number) => (
                        <span key={idx} className="px-3 py-1.5 bg-pp-bg-subtle text-xs font-semibold text-main rounded-xl border border-pp-border">
                          {btn.text} ({btn.type})
                        </span>
                      )) : (
                        <span className="text-xs text-muted">Configured interactive action elements active.</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Edit Mode Actions */}
              <div className="flex gap-3 pt-4 border-t border-pp-border justify-end">
                {isEditingTemplate ? (
                  <>
                    <button
                      onClick={() => setIsEditingTemplate(false)}
                      className="px-4 py-2 text-xs font-bold text-secondary bg-pp-bg-subtle border border-pp-border rounded-xl uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (!editedTemplate.body.trim()) {
                          toast({ title: 'Validation Error', description: 'Body text is required.', variant: 'error' });
                          return;
                        }
                        try {
                          let mediaHandle = selectedTemplate.mediaHandle || '';
                          if ((editedTemplate.mediaType === 'image_upload' || editedTemplate.mediaType === 'video_upload') && editedTemplate.mediaFile && selectedTemplate.channelId) {
                            const uploadResult = await uploadMutation.mutateAsync({
                              channelId: selectedTemplate.channelId,
                              file: editedTemplate.mediaFile,
                              title: selectedTemplate.name + '_header_update'
                            });
                            mediaHandle = uploadResult.mediaId;
                          }

                          const finalMediaType = editedTemplate.mediaType === 'image_upload' ? 'image' 
                            : editedTemplate.mediaType === 'video_upload' ? 'video' 
                            : editedTemplate.mediaType;

                          await updateMutation.mutateAsync({
                            id: selectedTemplate.id,
                            channelId: selectedTemplate.channelId,
                            name: selectedTemplate.name,
                            category: selectedTemplate.category,
                            language: selectedTemplate.language,
                            header: editedTemplate.header,
                            body: editedTemplate.body,
                            footer: editedTemplate.footer,
                            mediaType: finalMediaType,
                            mediaUrl: editedTemplate.mediaUrl,
                            mediaHandle: mediaHandle || undefined,
                            buttons: selectedTemplate.buttons,
                            status: selectedTemplate.status
                          });
                          toast({ title: 'Template Updated', description: 'Successfully saved template changes.', variant: 'success' });
                          setSelectedTemplate({
                            ...selectedTemplate,
                            header: editedTemplate.header,
                            body: editedTemplate.body,
                            footer: editedTemplate.footer,
                            mediaType: finalMediaType,
                            mediaUrl: editedTemplate.mediaUrl,
                            mediaHandle: mediaHandle || undefined,
                          });
                          setIsEditingTemplate(false);
                        } catch (err: any) {
                          toast({ title: 'Update Failed', description: err.message || 'Failed to save changes.', variant: 'error' });
                        }
                      }}
                      disabled={updateMutation.isPending}
                      className="btn-primary h-9 px-5 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider"
                    >
                      {updateMutation.isPending && <RefreshCw size={12} className="animate-spin" />}
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditingTemplate(true)}
                    className="btn-primary h-9 px-5 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider"
                  >
                    Edit Template
                  </button>
                )}
              </div>
            </div>

            {/* Premium Phone Preview Mockup */}
            <div className="bg-pp-bg-subtle p-6 md:p-8 border-t md:border-t-0 md:border-l border-pp-border flex items-center justify-center shrink-0 w-full md:w-[280px] overflow-y-auto">
              <div className="w-[230px] h-[440px] bg-main rounded-[36px] p-2.5 shadow-2xl relative border-4 border-muted/20">
                {/* Speaker/Camera bar */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-main rounded-full z-10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-secondary/50 rounded-full mr-2" />
                  <div className="w-8 h-1 bg-secondary/30 rounded-full" />
                </div>

                {/* Simulated Screen */}
                <div className="w-full h-full bg-[#efeae2] rounded-[28px] overflow-hidden flex flex-col justify-between pt-6 pb-4 px-3 border border-main/10 relative">
                  
                  {/* Whatsapp Header */}
                  <div className="bg-[#075e54] text-white p-2 text-[10px] font-bold absolute top-0 left-0 right-0 flex items-center gap-1.5 pl-6 pt-5">
                    <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center text-[7px]">W</div>
                    <span className="truncate">Clinical Verification</span>
                  </div>

                  {/* Message bubble */}
                  <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-black/5 mt-10 relative text-[10px] leading-relaxed text-main self-start max-w-[90%] w-full">
                    
                    {/* Media Preview */}
                    {isEditingTemplate ? (
                      <>
                        {(editedTemplate.mediaType === 'image' || editedTemplate.mediaType === 'image_upload') && editedTemplate.mediaUrl && (
                          <div className="w-full h-24 bg-gray-100 rounded-xl mb-2 overflow-hidden border border-pp-border/50">
                            <img src={editedTemplate.mediaUrl} alt="Header Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as any).src = 'https://placehold.co/400x200?text=Image+Preview' }} />
                          </div>
                        )}
                        {(editedTemplate.mediaType === 'video' || editedTemplate.mediaType === 'video_upload') && editedTemplate.mediaUrl && (
                          <div className="w-full h-24 bg-gray-200 rounded-xl mb-2 flex items-center justify-center border border-pp-border/50 relative overflow-hidden">
                            <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-10">
                              <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white pl-0.5">▶</div>
                            </div>
                            <video src={editedTemplate.mediaUrl} className="w-full h-full object-cover opacity-50" />
                          </div>
                        )}
                        {editedTemplate.mediaType === 'text' && editedTemplate.header && (
                          <div className="font-extrabold text-[10px] text-main border-b border-pp-border/50 pb-1 mb-1.5">
                            {editedTemplate.header}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {selectedTemplate.mediaType === 'image' && selectedTemplate.mediaUrl && (
                          <div className="w-full h-24 bg-gray-100 rounded-xl mb-2 overflow-hidden border border-pp-border/50">
                            <img src={selectedTemplate.mediaUrl} alt="Header Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as any).src = 'https://placehold.co/400x200?text=Image+Preview' }} />
                          </div>
                        )}
                        {selectedTemplate.mediaType === 'video' && selectedTemplate.mediaUrl && (
                          <div className="w-full h-24 bg-gray-200 rounded-xl mb-2 flex items-center justify-center border border-pp-border/50 relative overflow-hidden">
                            <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-10">
                              <div className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white pl-0.5">▶</div>
                            </div>
                            <video src={selectedTemplate.mediaUrl} className="w-full h-full object-cover opacity-50" />
                          </div>
                        )}
                        {selectedTemplate.mediaType === 'text' && selectedTemplate.header && (
                          <div className="font-extrabold text-[10px] text-main border-b border-pp-border/50 pb-1 mb-1.5">
                            {selectedTemplate.header}
                          </div>
                        )}
                      </>
                    )}

                    <div className="whitespace-pre-wrap">
                      {isEditingTemplate ? editedTemplate.body : selectedTemplate.body}
                    </div>

                    {isEditingTemplate && editedTemplate.footer && (
                      <div className="text-[8px] text-muted mt-1">
                        {editedTemplate.footer}
                      </div>
                    )}
                    {!isEditingTemplate && selectedTemplate.footer && (
                      <div className="text-[8px] text-muted mt-1">
                        {selectedTemplate.footer}
                      </div>
                    )}
                    
                    {/* Time & tick */}
                    <div className="text-[8px] text-muted text-right mt-1.5 flex items-center justify-end gap-0.5">
                      12:30 PM
                      <span className="text-green-500">✓✓</span>
                    </div>
                  </div>

                  {/* Simulated Input field */}
                  <div className="bg-white rounded-full p-1.5 flex items-center justify-between border border-black/5">
                    <div className="w-4 h-4 bg-pp-bg-subtle rounded-full" />
                    <div className="flex-1 bg-pp-bg-subtle/50 h-3 rounded-full mx-2" />
                    <div className="w-4 h-4 bg-[#075e54] rounded-full flex items-center justify-center text-white text-[8px]">▶</div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

    </div>
  );
};
