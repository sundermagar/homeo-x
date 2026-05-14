import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStaffMember, useCreateStaff, useUpdateStaff } from '../hooks/use-staff';
import type { StaffCategory } from '@mmc/types';
import type { CreateStaffInput, UpdateStaffInput } from '@mmc/validation';
import { createStaffSchema, updateStaffSchema } from '@mmc/validation';
import { User, Mail, Phone, MapPin, Briefcase, IndianRupee, ShieldCheck } from 'lucide-react';
import { NumericInput } from '@/shared/components/NumericInput';
import { Drawer } from '@/shared/components/drawer';

const CATEGORY_META: Record<StaffCategory, string> = {
  doctor: 'Doctor',
  employee: 'Employee',
  receptionist: 'Receptionist',
  clinicadmin: 'Clinic Admin',
  account: 'Account Manager',
};

const mobileStyles = `
  @media (max-width: 1024px) {
    .plat-form-grid-multi { grid-template-columns: 1fr !important; gap: 16px !important; }
    .plat-form-group[style*="grid-column: span 2"] { grid-column: span 1 !important; }
    .plat-form-group[style*="grid-template-columns: 80px 1fr 1fr"] { grid-template-columns: 1fr !important; }
    .plat-form-section { padding: 20px !important; }
    .plat-modal-footer { flex-direction: column !important; gap: 12px !important; }
    .plat-modal-footer .plat-btn { width: 100% !important; height: 46px !important; border-radius: 12px !important; }
  }
`;

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
    sendWelcomeEmail: false,
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

        if (!staffId || isNaN(staffId)) {
          throw new Error('Could not identify the staff member to update.');
        }

        await updateMutation.mutateAsync({ ...payload, category, id: staffId });
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
    return <div className="plat-empty" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading staff details...</div>;
  }

  const categoryName = CATEGORY_META[category] || 'Staff';

  return (
    <Drawer
      isOpen={true}
      onClose={() => navigate('/staff')}
      title={isEditing ? `Edit ${categoryName}` : `Add New ${categoryName}`}
      maxWidth="600px"
    >
      <style>{mobileStyles}</style>
      <div className="plat-modal-content" style={{ border: 'none', boxShadow: 'none', margin: 0, padding: 0 }}>
        <form onSubmit={handleSubmit} className="plat-modal-body">
          
          {/* Category Selection (Only when creating) */}
          {!isEditing && (
            <div className="plat-form-section">
              <h4 className="plat-form-section-title">
                <Briefcase size={16} /> Staff Category
              </h4>
              <div className="plat-form-group">
                <select className="plat-form-input" name="category" value={category} onChange={handleCategoryChange} disabled={isEditing}>
                  {Object.entries(CATEGORY_META).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Identity & Basic Details */}
          <div className="plat-form-section">
            <h4 className="plat-form-section-title">
              <User size={16} /> Identity Information
            </h4>
            
            {category === 'doctor' ? (
              <div className="plat-form-grid-multi" style={{ gridTemplateColumns: '80px 1fr 1fr' }}>
                <div className="plat-form-group">
                  <label className="plat-form-label">Title</label>
                  <select className="plat-form-input" name="title" value={formData.title} onChange={handleChange}>
                    <option value="Dr">Dr</option>
                    <option value="Mr">Mr</option>
                    <option value="Ms">Ms</option>
                    <option value="Mrs">Mrs</option>
                  </select>
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">First Name *</label>
                  <input className="plat-form-input" name="firstname" value={formData.firstname} onChange={handleChange} placeholder="First Name" />
                  {errors['firstname'] && <span className="plat-form-error">{errors['firstname']}</span>}
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Surname *</label>
                  <input className="plat-form-input" name="surname" value={formData.surname} onChange={handleChange} placeholder="Surname" />
                  {errors['surname'] && <span className="plat-form-error">{errors['surname']}</span>}
                </div>
              </div>
            ) : (
              <div className="plat-form-group">
                <label className="plat-form-label">Full Name *</label>
                <input className="plat-form-input" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Jane Doe" />
                {errors['name'] && <span className="plat-form-error">{errors['name']}</span>}
              </div>
            )}

            <div className="plat-form-grid-multi">
              <div className="plat-form-group">
                <label className="plat-form-label">Gender</label>
                <select className="plat-form-input" name="gender" value={formData.gender} onChange={handleChange}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="plat-form-group">
                <label className="plat-form-label">Date of Birth</label>
                <input type="date" className="plat-form-input" name="dateBirth" value={formData.dateBirth} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Contact Credentials */}
          <div className="plat-form-section">
            <h4 className="plat-form-section-title">
              <Phone size={16} /> Contact Gateway
            </h4>
            
            <div className="plat-form-grid-multi">
              <div className="plat-form-group">
                <label className="plat-form-label">Primary Mobile *</label>
                <NumericInput className="plat-form-input" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="+91" />
                {errors['mobile'] && <span className="plat-form-error">{errors['mobile']}</span>}
              </div>
              <div className="plat-form-group">
                <label className="plat-form-label">Secondary Mobile</label>
                <NumericInput className="plat-form-input" name="mobile2" value={formData.mobile2} onChange={handleChange} placeholder="+91" />
              </div>
            </div>

            <div className="plat-form-grid-multi">
              <div className="plat-form-group">
                <label className="plat-form-label">Login Email</label>
                <input type="email" className="plat-form-input" name="email" value={formData.email} onChange={handleChange} placeholder="user@clinic.com" />
                {errors['email'] && <span className="plat-form-error">{errors['email']}</span>}
              </div>
              <div className="plat-form-group">
                <label className="plat-form-label">Initial Password {isEditing && '(keep blank to retain current)'}</label>
                <input type="password" className="plat-form-input" name="password" value={formData.password} onChange={handleChange} placeholder={isEditing ? '••••••••' : 'Setup password'} />
              </div>
            </div>
            
            {!isEditing && (
              <div className="plat-form-group" style={{ marginTop: '16px' }}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="sendWelcomeEmail"
                    checked={formData.sendWelcomeEmail || false}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, sendWelcomeEmail: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Send welcome email with credentials
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Professional Details */}
          <div className="plat-form-section">
            <h4 className="plat-form-section-title">
              <ShieldCheck size={16} /> Professional Registry
            </h4>
            
            <div className="plat-form-grid-multi">
              <div className="plat-form-group">
                <label className="plat-form-label">Designation</label>
                <input className="plat-form-input" name="designation" value={formData.designation} onChange={handleChange} placeholder="e.g. Senior Nurse" />
              </div>
              <div className="plat-form-group">
                <label className="plat-form-label">Tenure Status</label>
                <select className="plat-form-input" name="dateLeft" value={formData.dateLeft ? 'inactive' : ''} onChange={(e) => setFormData((p: any) => ({ ...p, dateLeft: e.target.value === 'inactive' ? new Date().toISOString().substring(0, 10) : '' }))}>
                  <option value="">Active Service</option>
                  <option value="inactive">Service Terminated</option>
                </select>
              </div>
            </div>

            {category === 'doctor' && (
              <div className="plat-form-grid-multi">
                <div className="plat-form-group">
                  <label className="plat-form-label">Qualification</label>
                  <input className="plat-form-input" name="qualification" value={formData.qualification} onChange={handleChange} placeholder="MBBS, MD" />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Registration ID</label>
                  <input className="plat-form-input" name="registrationId" value={formData.registrationId} onChange={handleChange} placeholder="Medical Board ID" />
                </div>
                <div className="plat-form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="plat-form-label">Alma Mater / Institute</label>
                  <input className="plat-form-input" name="institute" value={formData.institute} onChange={handleChange} placeholder="University Name" />
                </div>
              </div>
            )}

            <div className="plat-form-grid-multi">
              <div className="plat-form-group">
                <label className="plat-form-label">Monthly Retainer (₹)</label>
                <NumericInput className="plat-form-input" name="salaryCur" value={formData.salaryCur} onChange={handleChange} placeholder="0" />
              </div>
              {category === 'doctor' && (
                <div className="plat-form-group">
                  <label className="plat-form-label">Consultation Fee (₹)</label>
                  <NumericInput className="plat-form-input" name="consultationFee" value={formData.consultationFee} onChange={handleChange} placeholder="0" />
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="plat-form-section">
            <h4 className="plat-form-section-title">
              <MapPin size={16} /> Residency & Station
            </h4>
            
            <div className="plat-form-group">
              <label className="plat-form-label">City Station</label>
              <input className="plat-form-input" name="city" value={formData.city} onChange={handleChange} placeholder="City name" />
            </div>
            <div className="plat-form-group">
              <label className="plat-form-label">Residential Address</label>
              <textarea className="plat-form-input" name="address" value={formData.address} onChange={handleChange} placeholder="Full address" rows={3} style={{ height: 'auto', padding: '12px' }}></textarea>
            </div>
          </div>

          <div className="plat-modal-footer">
            <button type="button" className="plat-btn plat-btn-ghost" onClick={() => navigate('/staff')} disabled={isSubmitting}>
              Discard
            </button>
            <button type="submit" className="plat-btn plat-btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Syncing...' : (isEditing ? `Update ${categoryName}` : `Register ${categoryName}`)}
            </button>
          </div>
        </form>
      </div>
    </Drawer>
  );
}
