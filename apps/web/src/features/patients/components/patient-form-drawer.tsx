import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { usePatient, useCreatePatient, useUpdatePatient, usePatientFormMeta, usePatientLookup } from '../hooks/use-patients';
import { useGrantConsent, useConsentStatus } from '../hooks/use-consent';
import { useReferrals } from '../../settings/hooks/use-settings';
import { useAvailableSlots, useCreateAppointment } from '../../appointments/hooks/use-appointments';
import { useDoctors } from '../../appointments/hooks/use-doctors';
import { VisitType } from '@mmc/types';
import { NumericInput } from '@/shared/components/NumericInput';
import { Checkbox } from '../../../components/ui/checkbox';
import { useAuthStore } from '@/shared/stores/auth-store';
import { X, Calendar as CalendarIcon, Clock, CheckCircle } from 'lucide-react';
import '../styles/patients.css';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jammu & Kashmir','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha',
  'Punjab','Rajasthan','Sikkim','Tamil Nadu','Tripura','Uttarakhand','Uttar Pradesh',
  'West Bengal','Andaman & Nicobar','Chandigarh','Delhi','Puducherry',
];

const INIT_FORM = {
  title: 'Mr.', firstName: '', middleName: '', surname: '', gender: 'M' as 'M' | 'F' | 'Other',
  phone: '', mobile1: '', mobile2: '', email: '',
  pin: '', address: '', road: '', area: '', city: '', state: 'Punjab', country: 'India', altAddress: '',
  religion: '', occupation: '', maritalStatus: '', bloodGroup: '',
  referenceType: '', referredBy: '', assistantDoctor: '', consultationFee: undefined as number | undefined,
  courierOutstation: false, dateOfBirth: '',
  // Appointment fields
  bookingDate: new Date().toISOString().split('T')[0],
  bookingTime: '',
  visitType: VisitType.New,
  notes: '',
};

interface PatientFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  regid?: number | null; // null for create, number for edit
  unregisteredPatient?: any | null; // Data from shadow patient to convert
  onSuccess?: () => void;
}

export function PatientFormDrawer({ isOpen, onClose, regid, unregisteredPatient, onSuccess }: PatientFormDrawerProps) {
  const isEdit = Boolean(regid);
  const { user } = useAuthStore();
  const clinicId = user?.contextId;

  const [form, setForm] = useState(INIT_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [refSearch, setRefSearch] = useState('');
  const [showRefDropdown, setShowRefDropdown] = useState(false);
  const [consents, setConsents] = useState({
    data_processing: true,
    ai_analysis: false,
    sms_communication: true,
    whatsapp_communication: true,
  });

  const { data: meta } = usePatientFormMeta(clinicId);
  const { data: patient } = usePatient(isEdit && regid ? Number(regid) : 0);
  const { data: refResults = [] } = usePatientLookup(refSearch);
  const { data: referrals = [] } = useReferrals();
  const { data: existingConsents = [] } = useConsentStatus(regid || 0);
  // const createMutation = useCreatePatient();
  const updateMutation = useUpdatePatient();
  const grantConsentMutation = useGrantConsent();
  const { data: doctors = [] } = useDoctors();
  const createMutation = useCreatePatient();
  // const updateMutation = useUpdatePatient();
  const createApptMutation = useCreateAppointment();

  const { data: slots = [] } = useAvailableSlots(
    form.assistantDoctor ? Number(form.assistantDoctor) : undefined,
    form.bookingDate || undefined,
  );

  const selectedDoctor = doctors.find(d => String(d.id) === form.assistantDoctor);
  const isDoctorInactive = selectedDoctor && selectedDoctor.isActive === false;

  useEffect(() => {
    if (isOpen) {
      if (isEdit && patient) {
        setForm({
          title: patient.title || '',
          firstName: patient.firstName || '',
          middleName: patient.middleName || '',
          surname: patient.surname || '',
          gender: (patient.gender || 'M') as 'M' | 'F' | 'Other',
          phone: patient.phone || '',
          mobile1: patient.mobile1 || '',
          mobile2: patient.mobile2 || '',
          email: patient.email || '',
          pin: patient.pin || '',
          address: patient.address || '',
          road: patient.road || '',
          area: patient.area || '',
          city: patient.city || '',
          state: patient.state || 'Punjab',
          country: patient.country || 'India',
          altAddress: patient.altAddress || '',
          religion: patient.religion || '',
          occupation: patient.occupation || '',
          maritalStatus: patient.maritalStatus || '',
          bloodGroup: patient.bloodGroup || '',
          referenceType: patient.referenceType || '',
          referredBy: patient.referredBy || '',
          assistantDoctor: patient.assistantDoctor || '',
          consultationFee: patient.consultationFee || 500,
          courierOutstation: patient.courierOutstation || false,
          dateOfBirth: patient.dateOfBirth ? (() => {
            const d = new Date(String(patient.dateOfBirth));
            return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
          })() : '',
          // Reset appointment fields on edit for safety
          bookingDate: new Date().toISOString().split('T')[0],
          bookingTime: '',
          visitType: VisitType.New,
        });
      } else if (unregisteredPatient) {
        const latestAppt = unregisteredPatient.latestAppointment;
        const nameParts = (unregisteredPatient.name || '').trim().split(' ');
        const firstName = nameParts[0] || '';
        const surname = nameParts.slice(1).join(' ') || '';
        
        // Ensure date is in YYYY-MM-DD format
        let bDate = new Date().toISOString().split('T')[0];
        if (latestAppt?.bookingDate) {
          try {
            const d = new Date(latestAppt.bookingDate);
            if (!isNaN(d.getTime())) {
              bDate = d.toISOString().split('T')[0];
            }
          } catch (e) {
            console.warn('Invalid booking date from unregistered patient:', latestAppt.bookingDate);
          }
        }

        setForm({
          ...INIT_FORM,
          firstName,
          surname,
          phone: unregisteredPatient.phone || '',
          gender: (unregisteredPatient.gender || 'M') as any,
          email: unregisteredPatient.email || '',
          // Pre-fill appointment info if available
          assistantDoctor: latestAppt?.doctorId ? String(latestAppt.doctorId) : '',
          bookingDate: bDate,
          bookingTime: latestAppt?.bookingTime || '',
          visitType: (latestAppt?.visitType || VisitType.New) as any,
          consultationFee: latestAppt?.consultationFee ? Number(latestAppt.consultationFee) : (latestAppt?.doctorId ? (meta?.doctors?.find(d => String(d.id) === String(latestAppt.doctorId))?.consultationFee || 500) : 500),
          notes: latestAppt?.notes || '',
        });
      } else if (!isEdit) {
        setForm(INIT_FORM);
        setConsents({
          data_processing: true,
          ai_analysis: false,
          sms_communication: true,
          whatsapp_communication: true,
        });
      }
      setErrors([]);
    }
  }, [isOpen, isEdit, patient, unregisteredPatient, meta]);

  useEffect(() => {
    if (isEdit && existingConsents.length > 0) {
      const newConsents = { ...consents };
      existingConsents.forEach(c => {
        if (c.consentType in newConsents) {
          // @ts-ignore
          newConsents[c.consentType] = c.granted;
        }
      });
      setConsents(newConsents);
    }
  }, [isEdit, existingConsents]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    // @ts-ignore Checkbox is handled slightly differently
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setForm(prev => {
      const next = { ...prev, [name]: val };
      
      // Auto-update consultation fee when doctor is selected
      if (name === 'assistantDoctor') {
        if (!value) {
          next.consultationFee = undefined;
        } else {
          const doc = meta?.doctors?.find(d => String(d.id) === value);
          if (doc) {
            next.consultationFee = Number(doc.consultationFee) || 0;
          }
        }
      }
      
      return next;
    });
  };

  const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setConsents(prev => ({ ...prev, [name]: checked }));
  };

  const validate = () => {
    const errs: string[] = [];
    if (!form.firstName.trim()) errs.push('First Name is required');
    if (!form.surname.trim()) errs.push('Surname is required');
    if (!form.phone.trim() && !form.mobile1.trim()) errs.push('At least one phone number is required');
    if (!consents.data_processing) errs.push('Consent for data processing is required for registration');
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ regid: Number(regid), ...form });
        
        // Update consents
        const consentTypes = [
          { type: 'data_processing', purpose: 'To store and manage clinical health records' },
          { type: 'ai_analysis', purpose: 'To analyze symptoms and provide AI-assisted diagnosis' },
          { type: 'sms_communication', purpose: 'To send appointment reminders and clinical updates via SMS' },
          { type: 'whatsapp_communication', purpose: 'To send prescriptions and reminders via WhatsApp' },
        ];

        for (const ct of consentTypes) {
          // Only update if changed (or just update all for simplicity)
          await grantConsentMutation.mutateAsync({
            patientRegid: Number(regid),
            consentType: ct.type,
            purpose: ct.purpose,
            // @ts-ignore
            granted: consents[ct.type],
            consentVersion: 1,
          });
        }

        onSuccess?.();
        onClose();
      } else {
        const res = await createMutation.mutateAsync(form);
        const newRegid = res.regid;
        
        // Record consents
        const consentTypes = [
          { type: 'data_processing', purpose: 'To store and manage clinical health records' },
          { type: 'ai_analysis', purpose: 'To analyze symptoms and provide AI-assisted diagnosis' },
          { type: 'sms_communication', purpose: 'To send appointment reminders and clinical updates via SMS' },
          { type: 'whatsapp_communication', purpose: 'To send prescriptions and reminders via WhatsApp' },
        ];

        for (const ct of consentTypes) {
          await grantConsentMutation.mutateAsync({
            patientRegid: newRegid,
            consentType: ct.type,
            purpose: ct.purpose,
            // @ts-ignore
            granted: consents[ct.type],
            consentVersion: 1,
          });
        }

        const patientResult = await createMutation.mutateAsync({
           ...form,
           unregisteredId: unregisteredPatient?.id
        });
        
        // If a time slot is selected, book the appointment (Skip if we already have an unregistered patient as the backend links existing ones)
        if (!unregisteredPatient && form.bookingTime && form.assistantDoctor && patientResult.regid) {
          await createApptMutation.mutateAsync({
            patientId: patientResult.regid,
            patientName: `${form.firstName} ${form.surname}`.trim(),
            phone: form.phone || form.mobile1,
            doctorId: Number(form.assistantDoctor),
            bookingDate: form.bookingDate!, // Guaranteed to have a default in INIT_FORM
            bookingTime: form.bookingTime!, // Checked in condition above
            visitType: form.visitType,
            consultationFee: form.consultationFee || 0,
            notes: 'Initial consultation booked during registration.',
          });
        }
        
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      setErrors([err.response?.data?.message || err.message]);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">
        <div className="drawer-header">
          <h2 className="drawer-title">
            {isEdit ? 'Edit Patient' : unregisteredPatient ? 'Complete Registration' : 'Register New Patient'}
          </h2>
          <button className="drawer-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="drawer-body">
          {errors.length > 0 && (
            <div className="pat-error-banner" style={{ marginBottom: '20px' }}>
              <ul className="pat-error-list">
                {errors.map((e, i) => <li key={i} className="pat-error-item">{e}</li>)}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="drawer-form">
            {/* Name Details */}
            <div className="form-group">
              <label className="drawer-label">Full Name <span style={{ color: 'var(--pp-danger-fg)' }}>*</span></label>
              <div className="drawer-name-row">
                <select className="drawer-input" name="title" value={form.title} onChange={handleChange}>
                  {(meta?.titles || ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Master', 'Baby']).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input className="drawer-input" style={{ flex: 1 }} name="firstName" value={form.firstName} onChange={handleChange} placeholder="First Name" required />
                <input className="drawer-input" style={{ flex: 1 }} name="middleName" value={form.middleName} onChange={handleChange} placeholder="Middle Name" />
                <input className="drawer-input" style={{ flex: 1 }} name="surname" value={form.surname} onChange={handleChange} placeholder="Surname" required />
              </div>
            </div>

            <div className="drawer-grid-2">
              <div className="form-group">
                <label className="drawer-label">Gender</label>
                <select className="drawer-input" name="gender" value={form.gender} onChange={handleChange}>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="drawer-label">Date of Birth</label>
                <input className="drawer-input" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
               <div className="form-group">
                  <label className="drawer-label">Mobile <span style={{ color: 'var(--pp-danger-fg)' }}>*</span></label>
                  <NumericInput className="drawer-input" name="phone" value={form.phone} onChange={handleChange} placeholder="Primary Mobile" />
               </div>
               <div className="form-group">
                  <label className="drawer-label">Mobile 2</label>
                  <NumericInput className="drawer-input" name="mobile1" value={form.mobile1} onChange={handleChange} placeholder="Alternate Mobile" />
               </div>
            </div>

            <div className="drawer-grid-2">
               <div className="form-group">
                  <label className="drawer-label">Landline</label>
                  <NumericInput className="drawer-input" name="mobile2" value={form.mobile2} onChange={handleChange} placeholder="Landline" />
               </div>
               <div className="form-group">
                  <label className="drawer-label">Email Address</label>
                  <input className="drawer-input" name="email" value={form.email} onChange={handleChange} placeholder="Email" type="email" />
               </div>
            </div>

            {/* Doctor & Fee */}
            <div className="drawer-grid-2" style={{ marginTop: '8px' }}>
               <div className="form-group">
                  <label className="drawer-label">Assign Doctor</label>
                  <select className="drawer-input" name="assistantDoctor" value={form.assistantDoctor} onChange={handleChange}>
                    <option value="">Select Doctor</option>
                    {(meta?.doctors || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
               </div>
               <div className="form-group">
                  <label className="drawer-label">Consultation Fee (₹)</label>
                  <NumericInput className="drawer-input" name="consultationFee" value={form.consultationFee} onChange={handleChange} />
               </div>
            </div>

            {/* Appointment Booking Logic */}
            {!isEdit && form.assistantDoctor && (
              <div className="pat-appt-section animate-fade-in" style={{ marginTop: '12px', padding: '12px', background: 'var(--pp-bg-subtle)', borderRadius: '8px', border: '1px solid var(--pp-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <CalendarIcon size={14} style={{ color: 'var(--pp-blue)' }} />
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>Book Appointment</span>
                </div>

                <div className="form-group">
                  <label className="drawer-label">Booking Date</label>
                  <input 
                    className="drawer-input" 
                    type="date" 
                    name="bookingDate" 
                    value={form.bookingDate} 
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="form-group" style={{ marginTop: '12px' }}>
                  <label className="drawer-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={13} /> Time Slot
                  </label>
                  
                  {isDoctorInactive ? (
                    <div className="pat-slots-unavailable" style={{ padding: '12px', textAlign: 'center', color: 'var(--pp-danger-fg)', background: 'var(--pp-danger-bg)', borderRadius: '6px', fontSize: '13px' }}>
                      <span style={{ marginRight: '8px' }}>🔴</span>
                      Doctor is currently inactive. You can still register the patient, but cannot book a slot.
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="pat-slots-hint" style={{ padding: '8px', textAlign: 'center', opacity: 0.6, fontSize: '12px' }}>
                      Select a date to see available slots
                    </div>
                  ) : (
                    <div className="pat-slots-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px', marginTop: '8px' }}>
                      {slots.filter(s => !s.isPast || s.booked || s.time === form.bookingTime).map(slot => (
                        <button
                          key={slot.time}
                          type="button"
                          className={`pat-slot-btn ${form.bookingTime === slot.time ? 'selected' : slot.booked ? 'booked' : slot.isPast ? 'past' : 'available'}`}
                          disabled={slot.booked || slot.isPast}
                          onClick={() => setForm(f => ({ ...f, bookingTime: slot.time }))}
                          style={{
                            padding: '6px 4px',
                            fontSize: '11px',
                            borderRadius: '4px',
                            border: '1px solid var(--pp-border)',
                            background: form.bookingTime === slot.time ? 'var(--pp-blue)' : slot.booked ? 'var(--pp-bg-subtle)' : 'var(--pp-surface)',
                            color: form.bookingTime === slot.time ? 'white' : slot.booked ? 'var(--pp-text-muted)' : 'var(--pp-text)',
                            cursor: slot.booked || slot.isPast ? 'not-allowed' : 'pointer',
                            opacity: slot.isPast ? 0.4 : 1
                          }}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Address */}
            <div className="form-group" style={{ marginTop: '8px' }}>
              <label className="drawer-label">Address</label>
              <input className="drawer-input" name="address" value={form.address} onChange={handleChange} placeholder="Flat / Building / Road / Area" />
            </div>

            <div className="drawer-grid-3">
              <div className="form-group">
                <label className="drawer-label">City</label>
                <input className="drawer-input" name="city" value={form.city} onChange={handleChange} placeholder="City" />
              </div>
              <div className="form-group">
                <label className="drawer-label">State</label>
                <select className="drawer-input" name="state" value={form.state} onChange={handleChange}>
                  <option value="">Select State</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="drawer-label">PIN Code</label>
                <NumericInput className="drawer-input" name="pin" value={form.pin} onChange={handleChange} placeholder="PIN Code" />
              </div>
            </div>

            {/* Other Details */}
            <div className="drawer-grid-2" style={{ marginTop: '8px' }}>
              <div className="form-group">
                <label className="drawer-label">Religion</label>
                <select className="drawer-input" name="religion" value={form.religion} onChange={handleChange}>
                  <option value="">Select</option>
                  {(meta?.religions?.length ? meta.religions : ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other']).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="drawer-label">Blood Group</label>
                <select className="drawer-input" name="bloodGroup" value={form.bloodGroup} onChange={handleChange}>
                  <option value="">Select</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div className="drawer-grid-2">
               <div className="form-group">
                <label className="drawer-label">Marital Status</label>
                <select className="drawer-input" name="maritalStatus" value={form.maritalStatus} onChange={handleChange}>
                  <option value="">Select</option>
                  {(meta?.statuses || ['Single', 'Married', 'Divorced', 'Widowed']).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="drawer-label">Occupation</label>
                <select className="drawer-input" name="occupation" value={form.occupation} onChange={handleChange}>
                  <option value="">Select</option>
                  {(meta?.occupations?.length ? meta.occupations : ['Business', 'Service', 'Student', 'Housewife', 'Retired', 'Self-Employed', 'Other']).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* Reference Details */}
            <div className="drawer-grid-2" style={{ marginTop: '8px' }}>
              <div className="form-group">
                <label className="drawer-label">Reference</label>
                <select className="drawer-input" name="referenceType" value={form.referenceType} onChange={handleChange}>
                  <option value="">Select Reference</option>
                  {referrals.filter((r: any) => r.isActive).length > 0 
                    ? referrals.filter((r: any) => r.isActive).map((r: any) => <option key={r.id} value={r.name}>{r.name}</option>)
                    : ['Self', 'Existing Patient', 'Doctor', 'Social Media', 'Advertisement', 'Walk-in', 'Other'].map(r => <option key={r} value={r}>{r}</option>)
                  }
                </select>
              </div>
              <div className="form-group">
                <label className="drawer-label">Referred By</label>
                <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
                  <input 
                    className="drawer-input" 
                    style={{ width: '80px' }} 
                    placeholder="ID" 
                    value={refSearch}
                    onChange={e => {
                       setRefSearch(e.target.value);
                       setShowRefDropdown(true);
                    }}
                    onFocus={() => setShowRefDropdown(true)}
                  />
                  <input 
                    className="drawer-input" 
                    style={{ flex: 1 }} 
                    name="referredBy" 
                    value={form.referredBy} 
                    onChange={handleChange} 
                    placeholder="Patient Name" 
                    readOnly
                  />
                  
                  {showRefDropdown && refSearch.length >= 2 && refResults.length > 0 && (
                    <div className="appt-kebab-menu" style={{ position: 'absolute', top: '100%', left: 0, width: '100%', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                      {refResults.map(p => (
                        <button 
                          key={p.regid} 
                          type="button"
                          className="appt-kebab-item" 
                          onClick={() => {
                            setForm(f => ({ ...f, referredBy: p.fullName }));
                            setRefSearch(String(p.regid));
                            setShowRefDropdown(false);
                          }}
                        >
                          <span className="pp-mono text-small" style={{ color: 'var(--pp-blue)' }}>{p.regid}</span> - {p.fullName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Compliance & Consent (DPDP Act 2023) */}
            <div className="form-section-header" style={{ marginTop: '24px', marginBottom: '12px' }}>
              <h3 className="section-title" style={{ fontSize: '14px', color: 'var(--pp-blue)', fontWeight: 600 }}>🛡️ DPDP Act Compliance & Consent</h3>
            </div>
            
            <div className="consent-container" style={{ background: 'var(--pp-sidebar-bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--pp-border)' }}>
              <div className="consent-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <Checkbox 
                  id="data_processing" 
                  name="data_processing" 
                  checked={consents.data_processing} 
                  onCheckedChange={(checked) => setConsents(prev => ({ ...prev, data_processing: checked }))} 
                />
                <label htmlFor="data_processing" style={{ fontSize: '13px', cursor: 'pointer' }}>
                  <strong>Data Processing Consent:</strong> I agree to allow Kreed.health to store and process my medical records and personal data for treatment and billing purposes. <span style={{ color: 'var(--pp-danger-fg)' }}>*</span>
                </label>
              </div>

              <div className="consent-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <Checkbox 
                  id="ai_analysis" 
                  name="ai_analysis" 
                  checked={consents.ai_analysis} 
                  onCheckedChange={(checked) => setConsents(prev => ({ ...prev, ai_analysis: checked }))} 
                />
                <label htmlFor="ai_analysis" style={{ fontSize: '13px', cursor: 'pointer' }}>
                  <strong>AI Consultation Consent:</strong> I agree to allow my symptoms to be processed by AI for diagnostic assistance (data is anonymized).
                </label>
              </div>

              <div className="consent-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <Checkbox 
                  id="sms_communication" 
                  name="sms_communication" 
                  checked={consents.sms_communication} 
                  onCheckedChange={(checked) => setConsents(prev => ({ ...prev, sms_communication: checked }))} 
                />
                <label htmlFor="sms_communication" style={{ fontSize: '13px', cursor: 'pointer' }}>
                  <strong>SMS Updates:</strong> I agree to receive appointment reminders and clinical updates via SMS.
                </label>
              </div>

              <div className="consent-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <Checkbox 
                  id="whatsapp_communication" 
                  name="whatsapp_communication" 
                  checked={consents.whatsapp_communication} 
                  onCheckedChange={(checked) => setConsents(prev => ({ ...prev, whatsapp_communication: checked }))} 
                />
                <label htmlFor="whatsapp_communication" style={{ fontSize: '13px', cursor: 'pointer' }}>
                  <strong>WhatsApp Updates:</strong> I agree to receive prescriptions and clinical records via WhatsApp.
                </label>
              </div>
              
              <p style={{ fontSize: '11px', color: 'var(--pp-faint-fg)', marginTop: '12px', fontStyle: 'italic' }}>
                By checking the boxes above, you provide explicit consent as per the Digital Personal Data Protection Act, 2023. You can withdraw this consent at any time.
              </p>
            </div>

            <div className="form-group" style={{ marginTop: '24px' }}>
              <button className="drawer-submit-btn" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (isEdit ? 'Update Patient' : unregisteredPatient ? 'Complete Registration' : 'Register Patient')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
}
