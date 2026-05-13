import React, { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useWhatsApp } from '../hooks/use-whatsapp';
import ReactDOM from 'react-dom';
import { X, Upload, FileText, Image as ImageIcon, Video, Music, Loader2, HardDrive, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import '@/features/appointments/styles/appointments.css';

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MediaFormInput {
  name: string;
  type: string;
  file: FileList;
}

export const MediaModal = ({ isOpen, onClose }: MediaModalProps) => {
  const { useUploadMedia, useChannels } = useWhatsApp();
  const { data: channels } = useChannels();
  const uploadMediaMutation = useUploadMedia();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<MediaFormInput>({
    defaultValues: {
      type: 'image',
      name: ''
    }
  });

  const selectedType = watch('type');

  const onSubmit = (data: MediaFormInput) => {
    if (!data.file || data.file.length === 0) {
      toast({ title: 'File Required', description: 'Please select a medical asset to vault.', variant: 'error' });
      return;
    }

    const channelId = channels?.[0]?.id; // Default to first channel for MVP
    if (!channelId) {
      toast({ title: 'No Channel', description: 'Please connect a Meta Business channel first.', variant: 'error' });
      return;
    }

    uploadMediaMutation.mutate({ channelId, file: data.file[0] as unknown as File, title: data.name }, {
      onSuccess: () => {
        toast({ title: 'Asset Vaulted', description: 'Medical media has been securely uploaded to Meta.' });
        reset();
        onClose();
      },
      onError: (err: any) => {
        toast({ title: 'Upload Failed', description: err.message || 'Error uploading file.', variant: 'error' });
      }
    });
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <div className="appt-drawer-overlay" onClick={onClose} />
      <div className="appt-drawer-panel" style={{ maxWidth: '500px' }}>
        <div className="appt-drawer-header">
          <h2 className="appt-drawer-title">Vault Medical Asset</h2>
          <button className="appt-drawer-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="appt-drawer-body">
          <form onSubmit={handleSubmit(onSubmit)} className="appt-form">
            
            {/* Asset Name */}
            <div className="appt-form-group">
              <label className="appt-form-label">
                <FileText size={13} strokeWidth={1.6} />
                Asset Title
              </label>
              <input 
                placeholder="e.g. Hypertension Diet Chart 2024" 
                className={`appt-form-input ${errors.name ? 'border-error' : ''}`}
                {...register('name', { required: true })} 
              />
            </div>

            {/* Media Type */}
            <div className="appt-form-group">
              <label className="appt-form-label">
                <HardDrive size={13} strokeWidth={1.6} />
                Clinical Asset Category
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'image', icon: ImageIcon, accept: 'image/*' },
                  { id: 'video', icon: Video, accept: 'video/*' },
                  { id: 'audio', icon: Music, accept: 'audio/*' },
                  { id: 'document', icon: FileText, accept: '.pdf,.doc,.docx,.txt,.xls,.xlsx' }
                ].map((cat) => (
                  <label 
                    key={cat.id}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedType === cat.id 
                        ? 'border-[#2563eb] bg-[#eff6ff] text-[#2563eb]' 
                        : 'border-[#e3e2df] bg-white text-[#888786] hover:border-[#2563eb]/30'
                    }`}
                  >
                    <input 
                      type="radio" 
                      value={cat.id} 
                      className="hidden" 
                      {...register('type', { required: true })} 
                    />
                    <cat.icon size={20} strokeWidth={selectedType === cat.id ? 2.2 : 1.6} />
                    <span className="text-[10px] font-bold uppercase mt-1.5">{cat.id}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* File Upload */}
            <div className="appt-form-group">
              <label className="appt-form-label">
                <Upload size={13} strokeWidth={1.6} />
                Medical File
              </label>
              <input 
                type="file"
                accept={
                  selectedType === 'image' ? 'image/*' :
                  selectedType === 'video' ? 'video/*' :
                  selectedType === 'audio' ? 'audio/*' :
                  '.pdf,.doc,.docx,.txt,.xls,.xlsx'
                }
                className={`appt-form-input py-2 ${errors.file ? 'border-error' : ''}`}
                {...register('file', { required: true })} 
              />
              <p className="text-[10px] text-muted mt-1 px-1">Upload securely to Meta Cloud via End-to-End Encrypted pipeline.</p>
            </div>

            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex gap-3 mt-6">
              <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Asset Policy</p>
                <p className="text-[11px] text-secondary leading-relaxed">
                  Maximum file size is 16MB for images and 64MB for clinical video educational content.
                </p>
              </div>
            </div>

            <div className="appt-form-actions" style={{ marginTop: 'auto', paddingTop: '24px' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={uploadMediaMutation.isPending}
              >
                {uploadMediaMutation.isPending ? <><Loader2 size={15} className="animate-spin" /> Vaulting…</> : 'Vault Asset'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
};
