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
  contact?: any;
}

interface ContactFormInput {
  name: string;
  countryCode: string;
  phone: string;
  email?: string;
  tags?: string;
}

export const ContactModal = ({ isOpen, onClose, contact }: ContactModalProps) => {
  const { useCreateContact } = useWhatsApp();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormInput>();
  const createContactMutation = useCreateContact();

  React.useEffect(() => {
    if (contact) {
      // Basic extraction of country code for edit mode
      let cc = '91';
      let localPhone = contact.phone || '';

      if (localPhone.startsWith('91') && localPhone.length > 10) {
        cc = '91';
        localPhone = localPhone.substring(2);
      } else if (localPhone.startsWith('1') && localPhone.length > 10) {
        cc = '1';
        localPhone = localPhone.substring(1);
      } else if (localPhone.startsWith('44') && localPhone.length > 10) {
        cc = '44';
        localPhone = localPhone.substring(2);
      }

      reset({
        name: contact.name || '',
        countryCode: cc,
        phone: localPhone,
        email: contact.email || '',
        tags: contact.tags ? contact.tags.join(', ') : '',
      });
    } else {
      reset({
        name: '',
        countryCode: '91',
        phone: '',
        email: '',
        tags: '',
      });
    }
  }, [contact, reset, isOpen]);

  const onSubmit = (data: ContactFormInput) => {
    // Strip any non-numeric characters the user might have typed
    const cleanPhone = data.phone.replace(/\D/g, '');
    const fullPhone = `${data.countryCode}${cleanPhone}`;

    const payload = {
      ...data,
      phone: fullPhone,
      id: contact?.id ? Number(contact.id) : undefined,
      clinicId: 1, // Hardcoded for now
      tags:
        data.tags
          ?.split(',')
          .map((t: string) => t.trim())
          .filter(Boolean) || [],
      status: 'active',
    };

    createContactMutation.mutate(payload, {
      onSuccess: () => {
        toast({
          title: contact ? 'Contact Updated' : 'Contact Registered',
          description: contact
            ? 'Patient has been updated in the WhatsApp CRM.'
            : 'Patient has been added to the WhatsApp CRM.',
        });
        reset();
        onClose();
      },
      onError: (err: any) => {
        toast({ title: 'Registration Failed', description: err.message, variant: 'error' });
      },
    });
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <div className="appt-drawer-overlay" onClick={onClose} />
      <div className="appt-drawer-panel" style={{ maxWidth: '500px' }}>
        <div className="appt-drawer-header">
          <h2 className="appt-drawer-title">
            {contact ? 'Edit Patient Contact' : 'Add Patient Contact'}
          </h2>
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

            {/* Phone Number with Country Code */}
            <div className="appt-form-group">
              <label className="appt-form-label">
                <Phone size={13} strokeWidth={1.6} />
                WhatsApp Number
              </label>
              <div className="flex gap-2">
                <select
                  className="appt-form-input w-[100px] shrink-0"
                  {...register('countryCode')}
                  defaultValue="91"
                >
                  <option value="91">+91 (IN)</option>
                  <option value="1">+1 (US/CA)</option>
                  <option value="44">+44 (UK)</option>
                  <option value="61">+61 (AU)</option>
                  <option value="971">+971 (AE)</option>
                  <option value="65">+65 (SG)</option>
                  {/* Can add more as needed */}
                </select>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  className={`appt-form-input flex-1 ${errors.phone ? 'border-error' : ''}`}
                  {...register('phone', {
                    required: true,
                    pattern: {
                      value: /^[0-9]{8,15}$/,
                      message: 'Please enter a valid phone number without country code',
                    },
                  })}
                />
              </div>
              {errors.phone && (
                <p className="text-[10px] text-red-500 mt-1 px-1">
                  {errors.phone.message as string}
                </p>
              )}
              <p className="text-[10px] text-muted mt-1 px-1">
                Select country code and enter the local number.
              </p>
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
              <p className="text-[10px] text-muted mt-1 px-1">
                Comma-separated values for patient grouping.
              </p>
            </div>

            <div className="bg-pp-blue/5 border border-pp-blue/10 rounded-xl p-4 flex gap-3 mt-4">
              <Target size={16} className="text-pp-blue shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-pp-blue uppercase tracking-wider">
                  CRM Integration
                </p>
                <p className="text-[11px] text-secondary leading-relaxed">
                  Registering this contact allows you to target them in medical broadcast campaigns
                  and automated journeys.
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
                {createContactMutation.isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Saving…
                  </>
                ) : contact ? (
                  'Save Changes'
                ) : (
                  'Register Patient'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body,
  );
};
