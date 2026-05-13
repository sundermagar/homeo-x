import React from 'react';
import { useForm } from 'react-hook-form';
import { useWhatsApp } from '../hooks/use-whatsapp';
import ReactDOM from 'react-dom';
import { X, Zap, MessageSquare, Loader2, Target, Type } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import '@/features/appointments/styles/appointments.css';

interface AutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AutomationFormInput {
  name: string;
  keywords: string;
  response: string;
}

export const AutomationModal = ({ isOpen, onClose }: AutomationModalProps) => {
  const { useCreateAutomation } = useWhatsApp();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AutomationFormInput>();
  const createAutomationMutation = useCreateAutomation();

  const onSubmit = (data: AutomationFormInput) => {
    // Structure the data for our "Keyword-based Auto Reply" flow
    const payload = {
      name: data.name,
      trigger: 'keyword',
      status: 'active',
      triggerConfig: {
        keywords: data.keywords.split(',').map((k: string) => k.trim()),
      },
      flowData: {
        response: data.response,
      }
    };

    createAutomationMutation.mutate(payload, {
      onSuccess: () => {
        toast({ title: 'Automation Active', description: 'Your medical auto-reply has been synchronized.' });
        reset();
        onClose();
      },
      onError: (err: any) => {
        toast({ title: 'Setup Failed', description: err.message, variant: 'error' });
      }
    });
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <div className="appt-drawer-overlay" onClick={onClose} />
      <div className="appt-drawer-panel" style={{ maxWidth: '500px' }}>
        <div className="appt-drawer-header">
          <h2 className="appt-drawer-title">Configure Automation</h2>
          <button className="appt-drawer-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="appt-drawer-body">
          <form onSubmit={handleSubmit(onSubmit)} className="appt-form">
            
            {/* Automation Name */}
            <div className="appt-form-group">
              <label className="appt-form-label">
                <Target size={13} strokeWidth={1.6} />
                Journey Name
              </label>
              <input 
                placeholder="e.g. Appointment FAQ Assistant" 
                className={`appt-form-input ${errors.name ? 'border-error' : ''}`}
                {...register('name', { required: true })} 
              />
            </div>

            {/* Keywords */}
            <div className="appt-form-group">
              <label className="appt-form-label">
                <Zap size={13} strokeWidth={1.6} />
                Trigger Keywords
              </label>
              <input 
                placeholder="e.g. Hello, Hi, Price, Location" 
                className={`appt-form-input ${errors.keywords ? 'border-error' : ''}`}
                {...register('keywords', { required: true })} 
              />
              <p className="text-[10px] text-muted mt-1 px-1">Separate multiple keywords with commas.</p>
            </div>

            {/* Response Message */}
            <div className="appt-form-group">
              <label className="appt-form-label">
                <MessageSquare size={13} strokeWidth={1.6} />
                Automated Response
              </label>
              <textarea 
                placeholder="Type the message to send back to the patient..." 
                className={`appt-form-input min-h-[120px] py-3 ${errors.response ? 'border-error' : ''}`}
                {...register('response', { required: true })} 
              />
            </div>

            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 flex gap-3">
              <Zap size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Trigger Logic</p>
                <p className="text-[11px] text-amber-600/80 leading-relaxed">
                  When a patient sends ANY of the keywords above, Homeo-X will instantly deliver your automated response.
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
                disabled={createAutomationMutation.isPending}
              >
                {createAutomationMutation.isPending ? <><Loader2 size={15} className="animate-spin" /> Activating…</> : 'Activate Automation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
};
