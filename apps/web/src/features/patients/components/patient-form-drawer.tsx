import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { usePatient, useCreatePatient, useUpdatePatient, usePatientFormMeta } from '../hooks/use-patients';
import { NumericInput } from '@/shared/components/NumericInput';
import { useAuthStore } from '@/shared/stores/auth-store';
import { X } from 'lucide-react';
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
};

interface PatientFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  regid?: number | null; // null for create, number for edit
}

export function PatientFormDrawer({ isOpen, onClose, regid }: PatientFormDrawerProps) {
  const isEdit = Boolean(regid);
  const { user } = useAuthStore();
  const clinicId = user?.contextId;

  const [form, setForm] = useState(INIT_FORM);
  const [errors, setErrors] = useState<string[]>([]);

  const { data: meta } = usePatientFormMeta(clinicId);
  const { data: patient } = usePatient(Number(regid), { enabled: isEdit && !!regid });
  const createMutation = useCreatePatient();
  const updateMutation = useUpdatePatient();

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
          dateOfBirth: patient.dateOfBirth ? (new Date(String(patient.dateOfBirth)).toISOString().split('T')[0] ?? '') : '',
        });
      } else if (!isEdit) {
        setForm(INIT_FORM);
      }
      setErrors([]);
    }
  }, [isOpen, isEdit, patient]);

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

  const validate = () => {
    const errs: string[] = [];
    if (!form.firstName.trim()) errs.push('First Name is required');
    if (!form.surname.trim()) errs.push('Surname is required');
    if (!form.phone.trim() && !form.mobile1.trim()) errs.push('At least one phone number is required');
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
        onClose();
      } else {
        await createMutation.mutateAsync(form);
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
          <h2 className="drawer-title">{isEdit ? 'Edit Patient' : 'Register New Patient'}</h2>
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
              <label className="drawer-label">Full Name <span style={{ color: '#ef4444' }}>*</span></label>
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
                  <label className="drawer-label">Mobile <span style={{ color: '#ef4444' }}>*</span></label>
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

            <div className="form-group" style={{ marginTop: '24px' }}>
              <button className="drawer-submit-btn" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (isEdit ? 'Update Patient' : 'Register Patient')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
}
