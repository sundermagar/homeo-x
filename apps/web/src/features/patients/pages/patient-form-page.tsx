import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { usePatient, useCreatePatient, useUpdatePatient, usePatientFormMeta } from '../hooks/use-patients';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jammu & Kashmir','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha',
  'Punjab','Rajasthan','Sikkim','Tamil Nadu','Tripura','Uttarakhand','Uttar Pradesh',
  'West Bengal','Andaman & Nicobar','Chandigarh','Delhi','Puducherry',
];

const INIT_FORM = {
  title: '', firstName: '', middleName: '', surname: '', gender: 'M' as 'M' | 'F' | 'Other',
  phone: '', mobile1: '', mobile2: '', email: '',
  pin: '', address: '', road: '', area: '', city: '', state: 'Punjab', country: 'India', altAddress: '',
  religion: '', occupation: '', maritalStatus: '', bloodGroup: '',
  referenceType: '', referredBy: '', assistantDoctor: '', consultationFee: 500,
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
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setForm(f => ({ ...f, [name]: val }));
    if (name === 'assistantDoctor' && meta?.doctors) {
      const doc = meta.doctors.find(d => String(d.id) === value);
      if (doc?.consultationFee) setForm(f => ({ ...f, assistantDoctor: value, consultationFee: doc.consultationFee! }));
    }
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

  const inputStyle = { width: '100%', height: 42, border: '1px solid #e2e8f0', borderRadius: 10, padding: '0 14px', fontSize: 13, color: '#0f172a', outline: 'none', background: 'white' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700 as const, color: '#475569', marginBottom: 6 };
  const groupStyle = { marginBottom: 18 };

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>{isEdit ? 'Edit Patient' : 'Register New Patient'}</h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>{isEdit ? 'Update patient details' : 'Fill in patient information to create a new registration'}</p>
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '18px 28px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '16px 16px 0 0' }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Patient Details</h3>
        </div>

        {errors.length > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '14px 20px', margin: '20px 28px 0', borderRadius: 10, color: '#dc2626' }}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>{errors.map((e, i) => <li key={i} style={{ fontWeight: 600, fontSize: 13 }}>{e}</li>)}</ul>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ padding: 28 }}>
          {/* Row 1: Doctor & Fee */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid #f1f5f9' }}>
            <div style={groupStyle}>
              <label style={labelStyle}>Doctor</label>
              <select name="assistantDoctor" value={form.assistantDoctor} onChange={handleChange} style={inputStyle}>
                <option value="">Select Doctor</option>
                {(meta?.doctors || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Consultation Fee (₹)</label>
              <input name="consultationFee" type="number" value={form.consultationFee} onChange={handleChange} style={inputStyle} />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Date of Birth</label>
              <input name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} style={inputStyle} />
            </div>
          </div>

          {/* Row 2: Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: 20 }}>
            <div style={groupStyle}>
              <label style={labelStyle}>Title</label>
              <select name="title" value={form.title} onChange={handleChange} style={inputStyle}>
                <option value="">—</option>
                {(meta?.titles || ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Master', 'Baby']).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>First Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="First Name" style={inputStyle} required />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Middle Name</label>
              <input name="middleName" value={form.middleName} onChange={handleChange} placeholder="Middle Name" style={inputStyle} />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Surname <span style={{ color: '#ef4444' }}>*</span></label>
              <input name="surname" value={form.surname} onChange={handleChange} placeholder="Surname" style={inputStyle} required />
            </div>
          </div>

          {/* Two-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 8 }}>
            {/* Left Column */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={groupStyle}>
                  <label style={labelStyle}>Gender</label>
                  <select name="gender" value={form.gender} onChange={handleChange} style={inputStyle}>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={groupStyle}>
                  <label style={labelStyle}>Mobile <span style={{ color: '#ef4444' }}>*</span></label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="Primary Mobile" type="tel" style={inputStyle} />
                </div>
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>PIN Code</label>
                <input name="pin" value={form.pin} onChange={handleChange} placeholder="PIN Code" style={inputStyle} />
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Address</label>
                <input name="address" value={form.address} onChange={handleChange} placeholder="Flat / Building" style={inputStyle} />
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Road / Region</label>
                <input name="road" value={form.road} onChange={handleChange} placeholder="Road / Region" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={groupStyle}>
                  <label style={labelStyle}>Area / Sector</label>
                  <input name="area" value={form.area} onChange={handleChange} placeholder="Area" style={inputStyle} />
                </div>
                <div style={groupStyle}>
                  <label style={labelStyle}>City</label>
                  <input name="city" value={form.city} onChange={handleChange} placeholder="City" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={groupStyle}>
                  <label style={labelStyle}>State</label>
                  <select name="state" value={form.state} onChange={handleChange} style={inputStyle}>
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={groupStyle}>
                  <label style={labelStyle}>Email</label>
                  <input name="email" value={form.email} onChange={handleChange} placeholder="Email" type="email" style={inputStyle} />
                </div>
              </div>
              <div style={groupStyle}>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" name="courierOutstation" checked={form.courierOutstation} onChange={handleChange} style={{ width: 16, height: 16 }} />
                  Courier Outstation
                </label>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <div style={groupStyle}>
                <label style={labelStyle}>Religion</label>
                <select name="religion" value={form.religion} onChange={handleChange} style={inputStyle}>
                  <option value="">Select</option>
                  {(meta?.religions || ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other']).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Alternative Address</label>
                <textarea name="altAddress" value={form.altAddress} onChange={handleChange} placeholder="Alternative Address" rows={3} style={{ ...inputStyle, height: 'auto', padding: '10px 14px', resize: 'vertical' as const }} />
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Marital Status</label>
                <select name="maritalStatus" value={form.maritalStatus} onChange={handleChange} style={inputStyle}>
                  <option value="">Select</option>
                  {(meta?.statuses || ['Single', 'Married', 'Divorced', 'Widowed']).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Occupation</label>
                <select name="occupation" value={form.occupation} onChange={handleChange} style={inputStyle}>
                  <option value="">Select</option>
                  {(meta?.occupations || ['Business', 'Service', 'Student', 'Housewife', 'Retired', 'Self-Employed', 'Other']).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={groupStyle}>
                  <label style={labelStyle}>Mobile 2</label>
                  <input name="mobile1" value={form.mobile1} onChange={handleChange} placeholder="Alternate Mobile" type="tel" style={inputStyle} />
                </div>
                <div style={groupStyle}>
                  <label style={labelStyle}>Landline</label>
                  <input name="mobile2" value={form.mobile2} onChange={handleChange} placeholder="Landline" type="tel" style={inputStyle} />
                </div>
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Referred By (Patient ID)</label>
                <input name="referredBy" value={form.referredBy} onChange={handleChange} placeholder="Patient ID" style={inputStyle} />
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Blood Group</label>
                <select name="bloodGroup" value={form.bloodGroup} onChange={handleChange} style={inputStyle}>
                  <option value="">Select</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div style={{ marginTop: 32, display: 'flex', gap: 14, borderTop: '1px solid #f1f5f9', paddingTop: 24 }}>
            <button type="submit" disabled={isSubmitting} style={{ height: 44, padding: '0 28px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', fontWeight: 800, fontSize: 14, cursor: isSubmitting ? 'wait' : 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>
              {isSubmitting ? 'Saving...' : (isEdit ? 'Update Patient' : 'Save Patient')}
            </button>
            <Link to="/patients" style={{ height: 44, padding: '0 24px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
