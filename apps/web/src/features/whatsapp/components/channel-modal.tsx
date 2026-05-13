import React from 'react';
import { useForm } from 'react-hook-form';
import { useWhatsApp } from '../hooks/use-whatsapp';
import ReactDOM from 'react-dom';
import { X, Globe, Shield, Key, Smartphone, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import '@/features/appointments/styles/appointments.css';

interface ChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChannelModal = ({ isOpen, onClose }: ChannelModalProps) => {
  const { useCreateChannel } = useWhatsApp();
  const createChannelMutation = useCreateChannel();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = (data: any) => {
    createChannelMutation.mutate(data, {
      onSuccess: () => {
        toast({ title: 'Success', description: 'WhatsApp Channel configured successfully.' });
        reset();
        onClose();
      },
      onError: (err: any) => {
        toast({ title: 'Configuration Failed', description: err.message, variant: 'error' });
      }
    });
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <div className="appt-drawer-overlay" onClick={onClose} />
      <div className="appt-drawer-panel" style={{ maxWidth: '500px' }}>
        <div className="appt-drawer-header">
          <h2 className="appt-drawer-title">Configure WABA Bridge</h2>
          <button className="appt-drawer-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="appt-drawer-body">
          <form onSubmit={handleSubmit(onSubmit)} className="appt-form">
            
            {/* Channel Name */}
            <div className="appt-form-group">
              <label className="appt-form-label">
                <Globe size={13} strokeWidth={1.6} />
                Channel Identity
              </label>
              <input 
                placeholder="e.g. Main Clinic Line" 
                className="appt-form-input" 
                {...register('name', { required: true })} 
              />
            </div>
            
            <div className="appt-form-row appt-form-row-2">
              <div className="appt-form-group">
                <label className="appt-form-label">
                  <Shield size={13} strokeWidth={1.6} />
                  Phone ID
                </label>
                <input 
                  placeholder="1234..." 
                  className="appt-form-input" 
                  {...register('phoneNumberId', { required: true })} 
                />
              </div>
              <div className="appt-form-group">
                <label className="appt-form-label">
                  <Smartphone size={13} strokeWidth={1.6} />
                  Display No
                </label>
                <input 
                  placeholder="91987..." 
                  className="appt-form-input" 
                  {...register('phoneNumber', { required: true })} 
                />
              </div>
            </div>

            <div className="appt-form-group">
              <label className="appt-form-label">
                <Shield size={13} strokeWidth={1.6} />
                WABA Account ID
              </label>
              <input 
                placeholder="9876..." 
                className="appt-form-input" 
                {...register('whatsappBusinessAccountId', { required: true })} 
              />
            </div>

            <div className="appt-form-group">
              <label className="appt-form-label">
                <Key size={13} strokeWidth={1.6} />
                System User Token
              </label>
              <textarea 
                placeholder="EAAB..." 
                className="appt-form-input appt-form-textarea"
                style={{ minHeight: '120px' }}
                {...register('accessToken', { required: true })} 
              />
              <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>
                Use a permanent token from Meta Business Settings.
              </p>
            </div>

            <div className="appt-form-actions" style={{ marginTop: 'auto', paddingTop: '24px' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={createChannelMutation.isPending}
              >
                {createChannelMutation.isPending ? <><Loader2 size={15} className="animate-spin" /> Verifying…</> : 'Establish Bridge'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
};
