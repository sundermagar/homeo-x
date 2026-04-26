import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { usePatient, useCreatePatient, useUpdatePatient, usePatientFormMeta } from '../hooks/use-patients';
import { NumericInput } from '@/shared/components/NumericInput';
import '../styles/patients.css';


const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Tripura', 'Uttarakhand', 'Uttar Pradesh',
  'West Bengal', 'Andaman & Nicobar', 'Chandigarh', 'Delhi', 'Puducherry',
];

const INIT_FORM = {
  title: 'Mr.', firstName: '', middleName: '', surname: '', gender: 'M' as 'M' | 'F' | 'Other',
  phone: '', mobile1: '', mobile2: '', email: '',
  pin: '', address: '', road: '', area: '', city: '', state: 'Punjab', country: 'India', altAddress: '',
  religion: '', occupation: '', maritalStatus: '', bloodGroup: '',
  referenceType: '', referenceTypeId: '' as string | number, referredBy: '', assistantDoctor: '', consultationFee: 500,
  courierOutstation: false, dateOfBirth: '',
};

export default function PatientFormPage() {
  const navigate = useNavigate();
  const { regid } = useParams();
  const isEdit = Boolean(regid);

  const [form, setForm] = useState(INIT_FORM);
  const [errors, setErrors] = useState<string[]>([]);

  const { data: meta } = usePatientFormMeta();
  const { data: patient } = usePatient(Number(regid));
  const createMutation = useCreatePatient();
  const updateMutation = useUpdatePatient();

  useEffect(() => {
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
        referenceTypeId: patient.referenceTypeId || '',
        referredBy: patient.referredBy || '',
        assistantDoctor: patient.assistantDoctor || '',
        consultationFee: patient.consultationFee || 500,
        courierOutstation: patient.courierOutstation || false,
        dateOfBirth: patient.dateOfBirth ? (new Date(String(patient.dateOfBirth)).toISOString().split('T')[0] ?? '') : '',
      });
    }
  }, [isEdit, patient]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    // @ts-ignore Checkbox is handled slightly differently
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    setForm(prev => {
      const next = { ...prev, [name]: val };

      if (name === 'assistantDoctor') {
        const doc = meta?.doctors?.find(d => String(d.id) === value);
        if (doc) {
          next.consultationFee = Number(doc.consultationFee) || 0;
        }
      }

      if (name === 'referenceTypeId') {
        const selected = meta?.referenceTypes.find(r => String(r.id) === value);
        next.referenceType = selected?.name || '';
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
        navigate(`/patients/${regid}`);
      } else {
        const result = await createMutation.mutateAsync(form);
        navigate(`/patients/${result.regid}`);
      }
    } catch (err: any) {
      setErrors([err.response?.data?.message || err.message]);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  
  // Referrer name lookup with status handling
  const referredById = Number(form.referredBy);
  const { data: referrerPatient, isLoading: isReferrerLoading, isError: isReferrerError } = usePatient(referredById);

  return (
    <div className="pp-page-container animate-fade-in">
      <div className="pp-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="text-title" style={{ fontSize: '24px' }}>{isEdit ? 'Edit Patient' : 'Register New Patient'}</h1>
          <p className="text-subtitle">{isEdit ? 'Update patient details' : 'Fill in patient information to create a new registration'}</p>
        </div>
      </div>

      <div className="pp-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ background: 'var(--pp-warm-2)', padding: '16px 20px', borderBottom: '1px solid var(--pp-warm-4)' }}>
          <h3 className="text-title" style={{ fontSize: '15px', margin: 0 }}>Patient Details</h3>
        </div>

        {errors.length > 0 && (
          <div className="pat-error-banner">
            <ul className="pat-error-list">
              {errors.map((e, i) => <li key={i} className="pat-error-item">{e}</li>)}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {/* Row 1: Doctor & Fee */}
          <div className="pp-form-grid" style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--pp-warm-4)' }}>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Doctor</label>
              <select className="pp-select" name="assistantDoctor" value={form.assistantDoctor} onChange={handleChange}>
                <option value="">Select Doctor</option>
                {(meta?.doctors || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Consultation Fee (₹)</label>
              <NumericInput className="pp-input" name="consultationFee" value={form.consultationFee} onChange={handleChange} />
            </div>
          </div>

          {/* Row 2: Name */}
          <div className="pp-name-grid">
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Title</label>
              <select className="pp-select" name="title" value={form.title} onChange={handleChange}>
                {(meta?.titles || ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Master', 'Baby']).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>First Name <span style={{ color: 'var(--pp-danger-fg)' }}>*</span></label>
              <input className="pp-input" name="firstName" value={form.firstName} onChange={handleChange} placeholder="First Name" required />
            </div>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Middle Name</label>
              <input className="pp-input" name="middleName" value={form.middleName} onChange={handleChange} placeholder="Middle Name" />
            </div>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Surname <span style={{ color: 'var(--pp-danger-fg)' }}>*</span></label>
              <input className="pp-input" name="surname" value={form.surname} onChange={handleChange} placeholder="Surname" required />
            </div>
          </div>

          {/* Unified Form Details */}
          <div className="pp-form-grid" style={{ marginTop: '24px' }}>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Gender</label>
              <select className="pp-select" name="gender" value={form.gender} onChange={handleChange}>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Mobile <span style={{ color: 'var(--pp-danger-fg)' }}>*</span></label>
              <NumericInput className="pp-input" name="phone" value={form.phone} onChange={handleChange} placeholder="Primary Mobile" />
            </div>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Mobile 2</label>
              <NumericInput className="pp-input" name="mobile1" value={form.mobile1} onChange={handleChange} placeholder="Alternate Mobile" />
            </div>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Landline</label>
              <NumericInput className="pp-input" name="mobile2" value={form.mobile2} onChange={handleChange} placeholder="Landline" />
            </div>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Email</label>
              <input className="pp-input" name="email" value={form.email} onChange={handleChange} placeholder="Email" type="email" />
            </div>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Date of Birth</label>
              <input className="pp-input" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} />
            </div>
          </div>

          <div className="pp-form-grid" style={{ marginTop: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Address</label>
              <input className="pp-input" name="address" value={form.address} onChange={handleChange} placeholder="Flat / Building" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Alternative Address</label>
              <textarea className="pp-textarea" name="altAddress" value={form.altAddress} onChange={handleChange} placeholder="Alternative Address" rows={2} />
            </div>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Road / Region</label>
              <input className="pp-input" name="road" value={form.road} onChange={handleChange} placeholder="Road / Region" />
            </div>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Area / Sector</label>
              <input className="pp-input" name="area" value={form.area} onChange={handleChange} placeholder="Area" />
            </div>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>City</label>
              <input className="pp-input" name="city" value={form.city} onChange={handleChange} placeholder="City" />
            </div>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>State</label>
              <select className="pp-select" name="state" value={form.state} onChange={handleChange}>
                <option value="">Select State</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>PIN Code</label>
              <NumericInput className="pp-input" name="pin" value={form.pin} onChange={handleChange} placeholder="PIN Code" />
            </div>
          </div>

          <div className="pp-form-grid" style={{ marginTop: '16px', paddingBottom: '24px', borderBottom: '1px solid var(--pp-warm-4)' }}>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Religion</label>
              <select className="pp-select" name="religion" value={form.religion} onChange={handleChange}>
                <option value="">Select</option>
                {(meta?.religions?.length ? meta.religions : ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other']).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Marital Status</label>
              <select className="pp-select" name="maritalStatus" value={form.maritalStatus} onChange={handleChange}>
                <option value="">Select</option>
                {(meta?.statuses || ['Single', 'Married', 'Divorced', 'Widowed']).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Occupation</label>
              <select className="pp-select" name="occupation" value={form.occupation} onChange={handleChange}>
                <option value="">Select</option>
                {(meta?.occupations?.length ? meta.occupations : ['Business', 'Service', 'Student', 'Housewife', 'Retired', 'Self-Employed', 'Other']).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Blood Group</label>
              <select className="pp-select" name="bloodGroup" value={form.bloodGroup} onChange={handleChange}>
                <option value="">Select</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Reference</label>
              <select className="pp-select" name="referenceTypeId" value={form.referenceTypeId} onChange={handleChange}>
                <option value="">Select Reference</option>
                {(meta?.referenceTypes || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '6px' }}>Referred By</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  className="pp-input" 
                  style={{ width: '100px' }} 
                  name="referredBy" 
                  value={form.referredBy} 
                  onChange={handleChange} 
                  placeholder="ID" 
                />
                <div className="pp-input" style={{ 
                  flex: 1, 
                  background: 'var(--pp-warm-3)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  color: referrerPatient ? 'var(--pp-blue)' : 'var(--text-muted)', 
                  minHeight: '38px', 
                  borderRadius: '8px', 
                  padding: '0 12px',
                  fontSize: '14px',
                  fontWeight: referrerPatient ? 600 : 400
                }}>
                  {isReferrerLoading ? 'Searching...' : 
                   referrerPatient ? `${referrerPatient.firstName} ${referrerPatient.surname}` : 
                   (form.referredBy ? (isReferrerError ? 'Search Error' : 'Patient Not Found') : 'Enter Patient ID')}
                </div>
              </div>
            </div>
            {/* <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '8px' }}>
              <label className="text-body" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input type="checkbox" name="courierOutstation" checked={form.courierOutstation} onChange={handleChange} style={{ width: '16px', height: '16px' }} />
                Courier Outstation
              </label>
            </div> */}
          </div>

          {/* Submit */}
          <div className="pat-submit-bar">
            <button className="btn-primary" type="submit" disabled={isSubmitting} style={{ cursor: isSubmitting ? 'wait' : 'pointer' }}>
              {isSubmitting ? 'Saving...' : (isEdit ? 'Update Patient' : 'Save Patient')}
            </button>
            <Link to="/patients" className="btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
