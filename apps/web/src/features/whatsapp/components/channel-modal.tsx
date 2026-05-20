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
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
  const [isConnecting, setIsConnecting] = React.useState(false);

  const handleMetaConnect = () => {
    setIsConnecting(true);
    // Simulate Meta OAuth popup delay and auto-fill
    setTimeout(() => {
      setIsConnecting(false);
      setValue('name', 'Main Clinic Line (Meta)');
      setValue('phoneNumberId', '101234567890123');
      setValue('phoneNumber', '919876543210');
      setValue('whatsappBusinessAccountId', '109876543210987');
      setValue('accessToken', 'EAABwzLIX... (Auto-generated token)');
      toast({ title: 'Meta Connected', description: 'WABA credentials retrieved successfully.' });
    }, 1500);
  };

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
            
            {/* Meta Connect Button */}
            <div className="mb-6 bg-[#1877F2]/5 rounded-xl p-5 border border-[#1877F2]/20 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center shadow-md">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M23.998 12c0-6.628-5.372-12-11.999-12C5.372 0 0 5.372 0 12c0 5.988 4.388 10.952 10.124 11.852v-8.384H7.078v-3.469h3.046V9.356c0-3.008 1.792-4.669 4.532-4.669 1.313 0 2.686.234 2.686.234v2.953H15.83c-1.49 0-1.955.925-1.955 1.874V12h3.328l-.532 3.469h-2.796v8.384c5.736-.9 10.124-5.864 10.124-11.853z"/></svg>
              </div>
              <div>
                <h4 className="text-[15px] font-bold text-[var(--pp-ink)]">Connect with Meta</h4>
                <p className="text-[12px] text-[var(--pp-text-3)] max-w-[280px] mt-1 leading-relaxed">Securely link your WhatsApp Business Account to automatically retrieve credentials.</p>
              </div>
              <button 
                type="button" 
                onClick={handleMetaConnect}
                disabled={isConnecting}
                className="mt-2 w-full bg-[#1877F2] hover:bg-[#166FE5] text-white text-[13px] font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isConnecting ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                {isConnecting ? 'Authenticating with Meta...' : 'Connect to Meta'}
              </button>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-[var(--pp-warm-3)]"></div>
              <span className="text-[10px] font-extrabold text-[var(--pp-text-3)] uppercase tracking-wider">Or enter manually</span>
              <div className="flex-1 h-px bg-[var(--pp-warm-3)]"></div>
            </div>

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
