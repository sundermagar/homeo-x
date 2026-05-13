import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useWhatsApp } from '../hooks/use-whatsapp';
import type { WhatsAppTemplate, WhatsAppChannel } from '@mmc/types';
import ReactDOM from 'react-dom';
import { X, Target, MessageSquare, Zap, Info, Loader2, FileSpreadsheet, CheckCircle2, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import '@/features/appointments/styles/appointments.css';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CampaignFormInput {
  name: string;
  channelId: string;
  templateName: string;
}

export const CampaignModal = ({ isOpen, onClose }: CampaignModalProps) => {
  const { useChannels, useTemplates, useCreateCampaign, useUploadMedia } = useWhatsApp();
  const { data: channels } = useChannels();
  const { register, handleSubmit, watch, setValue, reset } = useForm<CampaignFormInput>();
  
  const selectedChannelId = watch('channelId');
  const selectedTemplateName = watch('templateName');
  const { data: templates } = useTemplates(selectedChannelId ? Number(selectedChannelId) : undefined);
  const createCampaignMutation = useCreateCampaign();
  const uploadMediaMutation = useUploadMedia();

  const [csvRecipients, setCsvRecipients] = React.useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([]);
  const [mapping, setMapping] = React.useState<Record<string, string>>({
    phone: '',
    name: '',
  });
  const [headerMediaId, setHeaderMediaId] = React.useState<string | null>(null);

  const selectedTemplate = templates?.find((t) => t.name === selectedTemplateName);
  const templateVariables = selectedTemplate ? (selectedTemplate.body.match(/\{\{\d+\}\}/g) || []) : [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').filter(row => row.trim());
      if (rows.length < 2) {
        toast({ title: 'Invalid CSV', description: 'File must contain headers and at least one recipient.', variant: 'error' });
        return;
      }

      const firstRow = rows[0];
      if (!firstRow) return;

      const headers = firstRow.split(',').map(h => h.trim());
      const data = rows.slice(1).map(row => {
        const values = row.split(',').map(v => v.trim());
        const obj: any = {};
        headers.forEach((h, i) => obj[h] = values[i]);
        return obj;
      });

      setCsvHeaders(headers);
      setCsvRecipients(data);
      toast({ title: 'Matrix Loaded', description: `Detected ${data.length} recipients and ${headers.length} columns.` });
    };
    reader.readAsText(file);
  };

  const onSubmit = (data: CampaignFormInput) => {
    if (csvRecipients.length === 0) {
      toast({ title: 'Matrix Required', description: 'Please upload a recipient CSV to proceed.', variant: 'error' });
      return;
    }

    if (!mapping['phone']) {
      toast({ title: 'Mapping Error', description: 'You must map the "Phone" column.', variant: 'error' });
      return;
    }

    const template = templates?.find((t) => t.name === data.templateName);
    if (template?.mediaType !== 'text' && !headerMediaId) {
      toast({ title: 'Media Required', description: `This template requires a ${template?.mediaType || 'media'} header.`, variant: 'error' });
      return;
    }

    const recipients = csvRecipients.map(row => {
      const r = row as any;
      const m = mapping as Record<string, string>;
      const phoneKey = m['phone'] || 'phone';
      const nameKey = m['name'] || 'name';
      
      return {
        phone: r[phoneKey],
        name: nameKey ? r[nameKey] : '',
        params: templateVariables.map((_, i) => {
          const varKey = m[`v${i + 1}`];
          return varKey ? r[varKey] : '';
        })
      };
    });

    createCampaignMutation.mutate({
      ...data,
      channelId: Number(data.channelId),
      campaignType: 'csv',
      apiType: 'cloud_api',
      type: selectedTemplate?.category?.toLowerCase() === 'utility' ? 'transactional' : 'marketing',
      templateLanguage: selectedTemplate?.language || 'en_US',
      recipients,
      headerMediaId,
    }, {
      onSuccess: () => {
        toast({ title: 'Broadcast Prepared', description: `${recipients.length} recipients synchronized successfully.` });
        reset();
        setCsvRecipients([]);
        setCsvHeaders([]);
        setHeaderMediaId(null);
        onClose();
      },
      onError: (err: any) => {
        toast({ title: 'Creation Failed', description: err.message, variant: 'error' });
      }
    });
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChannelId) return;

    uploadMediaMutation.mutate({ channelId: Number(selectedChannelId), file }, {
      onSuccess: (res: any) => {
        setHeaderMediaId(res.mediaId);
        toast({ title: 'Media Uploaded', description: 'Visual asset linked to template.' });
      },
      onError: (err: any) => {
        toast({ title: 'Upload Failed', description: err.message, variant: 'error' });
      }
    });
  };


  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <div className="appt-drawer-overlay" onClick={onClose} />
      <div className="appt-drawer-panel" style={{ maxWidth: '500px' }}>
        <div className="appt-drawer-header">
          <h2 className="appt-drawer-title">Create Outreach Campaign</h2>
          <button className="appt-drawer-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="appt-drawer-body">
          <form onSubmit={handleSubmit(onSubmit)} className="appt-form">
            
            {/* Campaign Name */}
            <div className="appt-form-group">
              <label className="appt-form-label">
                <Target size={13} strokeWidth={1.6} />
                Campaign Identity
              </label>
              <input 
                placeholder="e.g. Quarterly Wellness Checkup" 
                className="appt-form-input" 
                {...register('name', { required: true })} 
              />
            </div>

            {/* Outbound Channel */}
            <div className="appt-form-group">
              <label className="appt-form-label">
                <MessageSquare size={13} strokeWidth={1.6} />
                Outbound Node
              </label>
              <select 
                className="appt-form-select"
                onChange={e => setValue('channelId', e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>Select active WABA line</option>
                {channels?.map((c: any) => (
                  <option key={c.id} value={String(c.id)}>{c.name} (+{c.phoneNumber})</option>
                ))}
              </select>
            </div>

            {/* Approved Template */}
            <div className="appt-form-group">
              <label className="appt-form-label">
                <Zap size={13} strokeWidth={1.6} />
                Meta-Approved Template
              </label>
              <select 
                className="appt-form-select"
                onChange={e => setValue('templateName', e.target.value)}
                disabled={!selectedChannelId}
                defaultValue=""
              >
                <option value="" disabled>{selectedChannelId ? "Choose broadcast template" : "Select a channel first"}</option>
                {templates?.map((t: any) => (
                  <option key={t.name} value={t.name}>{t.name.replace(/_/g, ' ')} ({t.language})</option>
                ))}
              </select>
            </div>

            <div className="appt-form-group">
              <label className="appt-form-label">
                <FileSpreadsheet size={13} strokeWidth={1.6} />
                Recipient Matrix (CSV)
              </label>
              <div 
                className="relative border-2 border-dashed border-pp-border rounded-xl p-6 text-center hover:bg-pp-bg-subtle/50 transition-all cursor-pointer group"
                onClick={() => document.getElementById('csv-upload')?.click()}
              >
                <input 
                  type="file" 
                  id="csv-upload" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
                {csvRecipients.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="text-success w-8 h-8 mb-2" />
                    <span className="text-[13px] font-bold text-main">{csvRecipients.length} Patients Prepared</span>
                    <span className="text-[10px] text-muted font-medium mt-1">Click to replace matrix</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <FileSpreadsheet className="text-muted w-8 h-8 mb-2 group-hover:text-pp-blue transition-colors" />
                    <span className="text-[13px] font-bold text-main">Upload Patient Data</span>
                    <span className="text-[10px] text-muted font-medium mt-1">Columns must include Phone numbers</span>
                  </div>
                )}
              </div>
            </div>

            {csvRecipients.length > 0 && (
              <div className="appt-form-group animate-slide-up">
                <label className="appt-form-label">
                  <ChevronRight size={13} strokeWidth={1.6} />
                  Matrix Mapping
                </label>
                <div className="p-5 bg-pp-bg-subtle/50 rounded-xl border border-pp-border space-y-4">
                  {/* Phone Mapping */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Patient Phone *</span>
                    <select 
                      className="appt-form-select h-8 py-0 px-2 text-[11px] w-40"
                      value={mapping['phone']}
                      onChange={(e) => setMapping({ ...mapping, phone: e.target.value })}
                    >
                      <option value="">Select Column</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Name Mapping */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Patient Name</span>
                    <select 
                      className="appt-form-select h-8 py-0 px-2 text-[11px] w-40"
                      value={mapping['name']}
                      onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                    >
                      <option value="">Select Column</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  {/* Template Variable Mapping */}
                  {templateVariables.map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-pp-blue uppercase tracking-wider">Variable &#123;&#123;{i + 1}&#125;&#125;</span>
                      <select 
                        className="appt-form-select h-8 py-0 px-2 text-[11px] w-40"
                        value={mapping[`v${i + 1}`] || ''}
                        onChange={(e) => setMapping({ ...mapping, [`v${i + 1}`]: e.target.value })}
                      >
                        <option value="">Select Column</option>
                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTemplate && selectedTemplate.mediaType !== 'text' && (
              <div className="appt-form-group animate-slide-up">
                <label className="appt-form-label">
                  <Zap size={13} strokeWidth={1.6} />
                  Template Media Header ({selectedTemplate.mediaType})
                </label>
                <div 
                  className="relative border border-pp-border rounded-xl p-4 flex items-center justify-between bg-white hover:bg-pp-bg-subtle transition-all cursor-pointer"
                  onClick={() => document.getElementById('media-upload')?.click()}
                >
                  <input 
                    type="file" 
                    id="media-upload" 
                    className="hidden" 
                    onChange={handleMediaUpload} 
                    accept={selectedTemplate.mediaType === 'image' ? 'image/*' : selectedTemplate.mediaType === 'video' ? 'video/*' : '*/*'}
                  />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pp-bg-subtle rounded-lg flex items-center justify-center text-pp-blue">
                      <Zap size={20} />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-main">{headerMediaId ? 'Media Linked' : `Select ${selectedTemplate.mediaType}`}</p>
                      <p className="text-[10px] text-muted font-medium">{headerMediaId ? 'Securely stored on Meta Cloud' : 'Required for this template'}</p>
                    </div>
                  </div>
                  {uploadMediaMutation.isPending && <Loader2 size={16} className="animate-spin text-pp-blue" />}
                  {headerMediaId && !uploadMediaMutation.isPending && <CheckCircle2 size={16} className="text-success" />}
                </div>
              </div>
            )}

            <div className="appt-form-actions" style={{ marginTop: 'auto', paddingTop: '24px' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={createCampaignMutation.isPending}
              >
                {createCampaignMutation.isPending ? <><Loader2 size={15} className="animate-spin" /> Syncing…</> : 'Initialize Campaign'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
};
