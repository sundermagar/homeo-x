import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStaffMember, useCreateStaff, useUpdateStaff } from '../hooks/use-staff';
import type { StaffCategory } from '@mmc/types';
import type { CreateStaffInput, UpdateStaffInput } from '@mmc/validation';
import { createStaffSchema, updateStaffSchema } from '@mmc/validation';
import { User, Mail, Phone, MapPin, Briefcase, IndianRupee, ShieldCheck } from 'lucide-react';

const CATEGORY_META: Record<StaffCategory, string> = {
  doctor: 'Doctor',
  employee: 'Employee',
  receptionist: 'Receptionist',
  clinicadmin: 'Clinic Admin',
  account: 'Account Manager',
};

export default function StaffFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const initialCategory = (searchParams.get('category') as StaffCategory) || 'employee';

  const [category, setCategory] = useState<StaffCategory>(initialCategory);
  
  const isEditing = Boolean(id);
  const staffId = id ? parseInt(id, 10) : 0;

  const { data: staffData, isLoading: isLoadingStaff } = useStaffMember(category, staffId);
  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();

  const [formData, setFormData] = useState<any>({
    category: initialCategory,
    name: '',
    email: '',
    mobile: '',
    mobile2: '',
    gender: 'Male',
    designation: '',
    dept: 4,
    city: '',
    address: '',
    about: '',
    dateBirth: '',
    dateLeft: '',
    salaryCur: 0,
    password: '',
    // Doctor extras
    title: 'Dr',
    firstname: '',
    middlename: '',
    surname: '',
    qualification: '',
    institute: '',
    passedOut: '',
    registrationId: '',
    consultationFee: '',
    permanentAddress: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (staffData && isEditing) {
      setFormData({
        category: staffData.category,
        name: staffData.name || '',
        email: staffData.email || '',
        mobile: staffData.mobile || '',
        mobile2: staffData.mobile2 || '',
        gender: staffData.gender || 'Male',
        designation: staffData.designation || '',
        dept: staffData.department || 4,
        city: staffData.city || '',
        address: staffData.address || '',
        about: staffData.about || '',
        dateBirth: staffData.dateBirth ? staffData.dateBirth.substring(0, 10) : '',
        dateLeft: staffData.dateLeft ? staffData.dateLeft.substring(0, 10) : '',
        salaryCur: staffData.salary || 0,
        password: '',
        title: staffData.title || 'Dr',
        firstname: staffData.firstname || '',
        middlename: staffData.middlename || '',
        surname: staffData.surname || '',
        qualification: staffData.qualification || '',
        institute: staffData.institute || '',
        passedOut: staffData.passedOut || '',
        registrationId: staffData.registrationId || '',
        consultationFee: staffData.consultationFee || '',
        permanentAddress: staffData.permanentAddress || '',
      });
      setCategory(staffData.category);
    }
  }, [staffData, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let val: any = value;
    if (type === 'number') {
      val = value === '' ? '' : Number(value);
    }
    setFormData((prev: any) => ({ ...prev, [name]: val }));
    
    // Clear specific field error when touched
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value as StaffCategory;
    setCategory(newCategory);
    setFormData((prev: any) => ({ ...prev, category: newCategory }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      if (isEditing) {
        const payload = updateStaffSchema.parse(formData);
        
        // Remove empty password to avoid triggering update
        if (!payload.password) {
          delete payload.password;
        }

        await updateMutation.mutateAsync({ category, id: staffId, ...payload });
      } else {
        const payload = createStaffSchema.parse(formData);
        await createMutation.mutateAsync(payload as CreateStaffInput);
      }
      
      navigate('/staff');
    } catch (err: any) {
      if (err.errors) { // Zod error
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e: any) => {
          if (e.path.length > 0) {
            newErrors[e.path[0]] = e.message;
          }
        });
        setErrors(newErrors);
      } else {
        alert(err.message || 'An error occurred during submission.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditing && isLoadingStaff) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading staff details...</div>;
  }

  const categoryName = CATEGORY_META[category] || 'Staff';

  const inputStyle = { 
    width: '100%', height: 42, border: '1px solid var(--border)', borderRadius: 10, 
    padding: '0 14px', fontSize: 13, color: 'var(--text-main)', outline: 'none', 
    background: 'var(--bg-card)', transition: 'border-color 0.2s',
  };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 };
  const groupStyle = { marginBottom: 18 };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <button 
          onClick={() => navigate('/staff')}
          style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
        >
          ←
        </button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-main)' }}>
            {isEditing ? `Edit ${categoryName}` : `Add New ${categoryName}`}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
            {isEditing ? 'Update staff credentials and details.' : 'Provision a new staff member into the system.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Category Selection (Only when creating) */}
        {!isEditing && (
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Briefcase size={16} /> Staff Type
            </h3>
            <div style={groupStyle}>
              <select style={inputStyle} name="category" value={category} onChange={handleCategoryChange} disabled={isEditing}>
                {Object.entries(CATEGORY_META).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Identity & Basic Details */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} /> Identity Details
          </h3>
          
          {category === 'doctor' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div style={groupStyle}>
                <label style={labelStyle}>Title</label>
                <select style={inputStyle} name="title" value={formData.title} onChange={handleChange}>
                  <option value="Dr">Dr</option>
                  <option value="Mr">Mr</option>
                  <option value="Ms">Ms</option>
                  <option value="Mrs">Mrs</option>
                </select>
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>First Name *</label>
                <input style={inputStyle} name="firstname" value={formData.firstname} onChange={handleChange} placeholder="First Name" />
                {errors.firstname && <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 600 }}>{errors.firstname}</span>}
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Surname *</label>
                <input style={inputStyle} name="surname" value={formData.surname} onChange={handleChange} placeholder="Surname" />
                {errors.surname && <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 600 }}>{errors.surname}</span>}
              </div>
            </div>
          ) : (
            <div style={groupStyle}>
              <label style={labelStyle}>Full Name *</label>
              <input style={inputStyle} name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Jane Doe" />
              {errors.name && <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 600 }}>{errors.name}</span>}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={groupStyle}>
              <label style={labelStyle}>Gender</label>
              <select style={inputStyle} name="gender" value={formData.gender} onChange={handleChange}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Date of Birth</label>
              <input type="date" style={inputStyle} name="dateBirth" value={formData.dateBirth} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Contact Credentials */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Phone size={16} /> Contact & Access
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr)', gap: 16, marginBottom: 16 }}>
            <div style={groupStyle}>
              <label style={labelStyle}>Mobile Number *</label>
              <input style={inputStyle} name="mobile" value={formData.mobile} onChange={handleChange} placeholder="+91" />
              {errors.mobile && <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 600 }}>{errors.mobile}</span>}
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Alternate Mobile</label>
              <input style={inputStyle} name="mobile2" value={formData.mobile2} onChange={handleChange} placeholder="+91" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={groupStyle}>
              <label style={labelStyle}>Login Email</label>
              <input type="email" style={inputStyle} name="email" value={formData.email} onChange={handleChange} placeholder="user@clinic.com" />
              {errors.email && <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 600 }}>{errors.email}</span>}
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Password {isEditing && '(leave blank to keep current)'}</label>
              <input type="password" style={inputStyle} name="password" value={formData.password} onChange={handleChange} placeholder={isEditing ? '••••••••' : 'Setup password'} />
            </div>
          </div>
        </div>

        {/* Professional Details */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={16} /> Professional Details
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={groupStyle}>
              <label style={labelStyle}>Designation</label>
              <input style={inputStyle} name="designation" value={formData.designation} onChange={handleChange} placeholder="e.g. Senior Nurse" />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Status</label>
              <select style={inputStyle} name="dateLeft" value={formData.dateLeft ? 'inactive' : ''} onChange={(e) => setFormData((p: any) => ({ ...p, dateLeft: e.target.value === 'inactive' ? new Date().toISOString().substring(0, 10) : '' }))}>
                <option value="">Active</option>
                <option value="inactive">Inactive / Left</option>
              </select>
            </div>
          </div>

          {category === 'doctor' && (
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
               <div style={groupStyle}>
                 <label style={labelStyle}>Qualification</label>
                 <input style={inputStyle} name="qualification" value={formData.qualification} onChange={handleChange} placeholder="MBBS, MD" />
               </div>
               <div style={groupStyle}>
                 <label style={labelStyle}>Registration ID</label>
                 <input style={inputStyle} name="registrationId" value={formData.registrationId} onChange={handleChange} placeholder="Medical Board Reg No" />
               </div>
               <div style={groupStyle}>
                 <label style={labelStyle}>Institute</label>
                 <input style={inputStyle} name="institute" value={formData.institute} onChange={handleChange} placeholder="University Name" />
               </div>
             </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={groupStyle}>
              <label style={labelStyle}>Base Salary (₹)</label>
              <input type="number" style={inputStyle} name="salaryCur" value={formData.salaryCur} onChange={handleChange} placeholder="0" />
            </div>
            {category === 'doctor' && (
              <div style={groupStyle}>
                <label style={labelStyle}>Consultation Fee (₹)</label>
                <input style={inputStyle} name="consultationFee" value={formData.consultationFee} onChange={handleChange} placeholder="0" />
              </div>
            )}
          </div>
        </div>

        {/* Address */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={16} /> Location
          </h3>
          
          <div style={groupStyle}>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} name="city" value={formData.city} onChange={handleChange} placeholder="City name" />
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Address</label>
            <textarea style={{ ...inputStyle, height: 'auto', padding: '10px 14px' }} name="address" value={formData.address} onChange={handleChange} placeholder="Full address" rows={3}></textarea>
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          <button 
            type="button" 
            onClick={() => navigate('/staff')}
            className="btn btn-ghost" 
            style={{ flex: 1, height: 48, borderRadius: 12, border: '1px solid var(--border)' }}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ flex: 2, height: 48, borderRadius: 12 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : (isEditing ? `Update ${categoryName}` : `Add ${categoryName}`)}
          </button>
        </div>

      </form>
    </div>
  );
}
