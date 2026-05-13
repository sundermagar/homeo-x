import React from 'react';
import { useForm } from 'react-hook-form';
import { useWhatsApp } from '../hooks/use-whatsapp';
import ReactDOM from 'react-dom';
import { X, User, Phone, Mail, Tag, Loader2, Target } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import '@/features/appointments/styles/appointments.css';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ContactFormInput {
  name: string;
  phone: string;
  email?: string;
  tags?: string;
}

export const ContactModal = ({ isOpen, onClose }: ContactModalProps) => {
  const { useCreateContact } = useWhatsApp();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactFormInput>();
  const createContactMutation = useCreateContact();

  const onSubmit = (data: ContactFormInput) => {
    const payload = {
      ...data,
      clinicId: 1, // Hardcoded for now
      tags: data.tags?.split(',').map((t: string) => t.trim()).filter(Boolean) || [],
      status: 'active'
    };

    createContactMutation.mutate(payload, {
      onSuccess: () => {
        toast({ title: 'Contact Registered', description: 'Patient has been added to the WhatsApp CRM.' });
        reset();
        onClose();
      },
      onError: (err: any) => {
        toast({ title: 'Registration Failed', description: err.message, variant: 'error' });
      }
    });
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <div className="appt-drawer-overlay" onClick={onClose} />
      <div className="appt-drawer-panel" style={{ maxWidth: '500px' }}>
        <div className="appt-drawer-header">
          <h2 className="appt-drawer-title">Add Patient Contact</h2>
          <button className="appt-drawer-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="appt-drawer-body">
          <form onSubmit={handleSubmit(onSubmit)} className="appt-form">
            
            {/* Patient Name */}
            <div className="appt-form-group">
              <label className="appt-form-label">
                <User size={13} strokeWidth={1.6} />
                Full Legal Name
              </label>
              <input 
                placeholder="e.g. Johnathan Doe" 
                className={`appt-form-input ${errors.name ? 'border-error' : ''}`}
                {...register('name', { required: true })} 
              />
            </div>

            {/* Phone Number */}
            <div className="appt-form-group">
              <label className="appt-form-label">
                <Phone size={13} strokeWidth={1.6} />
                WhatsApp Number
              </label>
              <input 
                placeholder="e.g. 919876543210 (with country code)" 
                className={`appt-form-input ${errors.phone ? 'border-error' : ''}`}
                {...register('phone', { required: true })} 
              />
              <p className="text-[10px] text-muted mt-1 px-1">Ensure the number includes the country code without the "+" prefix.</p>
            </div>

            {/* Email */}
            <div className="appt-form-group">
              <label className="appt-form-label">
                <Mail size={13} strokeWidth={1.6} />
                Medical Correspondence Email
              </label>
              <input 
                type="email"
                placeholder="e.g. john.doe@example.com" 
                className="appt-form-input" 
                {...register('email')} 
              />
            </div>

            {/* Tags */}
            <div className="appt-form-group">
              <label className="appt-form-label">
                <Tag size={13} strokeWidth={1.6} />
                Clinical Segmentation Tags
              </label>
              <input 
                placeholder="e.g. Hypertension, Chronic, VIP, Follow-up" 
                className="appt-form-input" 
                {...register('tags')} 
              />
              <p className="text-[10px] text-muted mt-1 px-1">Comma-separated values for patient grouping.</p>
            </div>

            <div className="bg-pp-blue/5 border border-pp-blue/10 rounded-xl p-4 flex gap-3 mt-4">
              <Target size={16} className="text-pp-blue shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-pp-blue uppercase tracking-wider">CRM Integration</p>
                <p className="text-[11px] text-secondary leading-relaxed">
                  Registering this contact allows you to target them in medical broadcast campaigns and automated journeys.
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
                disabled={createContactMutation.isPending}
              >
                {createContactMutation.isPending ? <><Loader2 size={15} className="animate-spin" /> Registering…</> : 'Register Patient'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
};
