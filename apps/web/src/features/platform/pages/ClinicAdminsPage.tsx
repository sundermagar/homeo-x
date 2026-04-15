import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit2, Trash2, X, ShieldCheck, Mail, Phone, MapPin, Users, UserCheck, Calendar, Briefcase, Info, BadgeIndianRupee, RefreshCw } from 'lucide-react';
import { useStaffList, useDeleteStaff, useCreateStaff, useUpdateStaff, useStaffMember } from '@/features/staff/hooks/use-staff';
import type { StaffSummary, StaffMember } from '@mmc/types';
import type { CreateStaffInput, UpdateStaffInput } from '@mmc/validation';
import { createStaffSchema, updateStaffSchema } from '@mmc/validation';
import '../styles/platform.css';

const CATEGORY = 'clinicadmin' as const;
const META = { label: 'Clinic Admins', description: 'Manage clinical administrators, facility directors, and operational heads.' };
const PAGE_SIZE = 30;

function getDefaultStaffForm(): CreateStaffInput {
  return {
    category: CATEGORY,
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
    title: 'Mr', // Schema required fallback
    firstname: '',
    middlename: '',
    surname: '',
    qualification: 'Higher Secondary', // Schema required fallback
    institute: '',
    passedOut: '',
    registrationId: 'N/A', // Schema required fallback
    consultationFee: 0,
    permanentAddress: '',
    password: '',
    clinicId: null,
    aadharnumber: '',
    pannumber: '',
    joiningdate: new Date().toISOString().split('T')[0] || '', // Schema required fallback
    registrationCertificate: '',
    aadharCard: '',
    panCard: '',
    appointmentLetter: '',
    profilepic: '',
    col10Document: '',
    col12Document: '',
    bhmsDocument: '',
    mdDocument: '',
  };
}

function staffMemberToForm(staff: StaffMember): CreateStaffInput {
  const gender = (staff.gender === 'Female' || staff.gender === 'Other') ? staff.gender : 'Male';
  return {
    ...getDefaultStaffForm(), // Ensure all schema fields are present
    ...staff,
    category: CATEGORY,
    gender,
    mobile2: staff.mobile2 || '',
    dateBirth: staff.dateBirth ?? '',
    consultationFee: Number(staff.consultationFee) || 0,
    password: '', // Kept blank to avoid overwriting on edit
  } as CreateStaffInput;
}

function StaffModal({
  mode,
  staff,
  isLoading,
  onClose,
  onSuccess,
}: {
  mode: 'create' | 'edit';
  staff?: StaffMember | null;
  isLoading: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<CreateStaffInput | UpdateStaffInput>(getDefaultStaffForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();

  useEffect(() => {
    if (mode === 'edit' && staff) {
      setForm(staffMemberToForm(staff));
    } else if (mode === 'create') {
      setForm(getDefaultStaffForm());
    }
  }, [mode, staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    console.log("[StaffModal:Admin] Raw Form State:", form);

    // 1. Name splitting logic for backend schema compliance
    const nameParts = (form.name || '').trim().split(/\s+/);
    const fName = nameParts[0] || '';
    const sName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Admin'; // Default surname

    // 2. Prepare payload with required schema fallbacks
    const payload = {
      ...form,
      firstname: fName,
      surname: sName,
      // Fallbacks to satisfy z.string().optional().nullable().default(null) -> string | null
      title: form.title || 'Mr',
      qualification: form.qualification || 'Advanced Management',
      joiningdate: form.joiningdate ?? getDefaultStaffForm().joiningdate,
      registrationId: form.registrationId ?? 'AD-N/A',
      
      // Numeric casting for data integrity
      salaryCur: Number(form.salaryCur) || 0,
      dept: Number(form.dept) || 4,
      consultationFee: 0, // Not applicable for admins
    };

    console.log("[StaffModal:Admin] Processed Payload:", payload);

    const schema = mode === 'create' ? createStaffSchema : updateStaffSchema;
    const result = schema.safeParse(payload);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      console.error("[StaffModal:Admin] Validation Errors:", result.error.flatten().fieldErrors);
      
      result.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(payload as CreateStaffInput);
      } else {
        await updateMutation.mutateAsync({
          category: CATEGORY,
          id: (staff as StaffMember).id,
          ...(payload as UpdateStaffInput)
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("[StaffModal:Admin] API Submission Error:", err);
      setErrors({ general: err.message || 'Verification failed. Please check record data.' });
    }
  };

  const updateForm = (field: string, value: any) => {
    let castValue = value;
    if (field === 'dept' || field === 'salaryCur') castValue = value === '' ? 0 : Number(value);
    setForm((prev) => ({ ...prev, [field]: castValue }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEdit = mode === 'edit';

  return (
    <div className="plat-modal-backdrop" onClick={onClose}>
      <div className="plat-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="plat-modal-header">
          <h3 className="plat-modal-title">{isEdit ? 'Update Administrator Profile' : 'Register New Clinic Admin'}</h3>
          <button className="plat-btn plat-btn-icon plat-btn-ghost" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="plat-modal-body">
          {errors['general'] && <div className="plat-error-banner mb-4">{errors['general']}</div>}

          <div className="plat-form-grid">
            {/* Account Details */}
            <div className="plat-form-group">
              <label className="plat-form-label">Full Name *</label>
              <input type="text" className="plat-form-input" value={form.name || ''} onChange={(e) => updateForm('name', e.target.value)} disabled={isLoading} placeholder="Full Legal Name" />
              {errors['name'] && <span className="plat-form-error">{errors['name']}</span>}
            </div>

            <div className="plat-form-group">
              <label className="plat-form-label">Email Address</label>
              <input type="email" className="plat-form-input" value={form.email || ''} onChange={(e) => updateForm('email', e.target.value)} disabled={isLoading} placeholder="admin@mmc.com" />
            </div>

            <div className="plat-form-group">
              <label className="plat-form-label">Primary Mobile *</label>
              <input type="tel" className="plat-form-input" value={form.mobile || ''} onChange={(e) => updateForm('mobile', e.target.value)} disabled={isLoading} />
              {errors['mobile'] && <span className="plat-form-error">{errors['mobile']}</span>}
            </div>

            <div className="plat-form-group">
              <label className="plat-form-label">Secondary Mobile</label>
              <input type="tel" className="plat-form-input" value={form.mobile2 || ''} onChange={(e) => updateForm('mobile2', e.target.value)} disabled={isLoading} />
            </div>

            {/* Personal Info */}
            <div className="plat-form-group">
              <label className="plat-form-label">Gender</label>
              <select className="plat-form-select" value={form.gender || 'Male'} onChange={(e) => updateForm('gender', e.target.value)} disabled={isLoading}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="plat-form-group">
              <label className="plat-form-label">Date of Birth</label>
              <input type="date" className="plat-form-input" value={form.dateBirth || ''} onChange={(e) => updateForm('dateBirth', e.target.value)} disabled={isLoading} />
            </div>

            {/* Roles & Station */}
            <div className="plat-form-group">
              <label className="plat-form-label">Professional Rank</label>
              <input type="text" className="plat-form-input" value={form.designation || ''} onChange={(e) => updateForm('designation', e.target.value)} disabled={isLoading} placeholder="e.g. Facility Director" />
            </div>

            <div className="plat-form-group">
              <label className="plat-form-label">Department</label>
              <select className="plat-form-select" value={form.dept || 4} onChange={(e) => updateForm('dept', e.target.value)} disabled={isLoading}>
                <option value={1}>Administration</option>
                <option value={2}>Operations</option>
                <option value={3}>Human Resources</option>
                <option value={4}>General Clinic Management</option>
              </select>
            </div>

            <div className="plat-form-group">
              <label className="plat-form-label">Basic Monthly Pay (₹)</label>
              <input type="number" className="plat-form-input" value={form.salaryCur || ''} onChange={(e) => updateForm('salaryCur', e.target.value)} disabled={isLoading} />
            </div>

            <div className="plat-form-group">
              <label className="plat-form-label">Jurisdiction / City</label>
              <input type="text" className="plat-form-input" value={form.city || ''} onChange={(e) => updateForm('city', e.target.value)} disabled={isLoading} />
            </div>

            {/* Content Blocks */}
            <div className="plat-form-group plat-form-full">
              <label className="plat-form-label">Official Address</label>
              <textarea className="plat-form-input" rows={2} value={form.address || ''} onChange={(e) => updateForm('address', e.target.value)} disabled={isLoading} />
            </div>

            <div className="plat-form-group plat-form-full">
              <label className="plat-form-label">Executive Summmary / Admin Notes</label>
              <textarea className="plat-form-input" rows={2} value={form.about || ''} onChange={(e) => updateForm('about', e.target.value)} disabled={isLoading} />
            </div>

            {mode === 'create' && (
              <div className="plat-form-group">
                <label className="plat-form-label">Credential: Set Password *</label>
                <input type="password" className="plat-form-input" value={form.password || ''} onChange={(e) => updateForm('password', e.target.value)} disabled={isLoading} />
              </div>
            )}

            {mode === 'edit' && (
              <div className="plat-form-group">
                <label className="plat-form-label">Relieved From Duty (Date Left)</label>
                <input type="date" className="plat-form-input" value={form.dateLeft || ''} onChange={(e) => updateForm('dateLeft', e.target.value)} disabled={isLoading} />
              </div>
            )}
          </div>

          <div className="plat-modal-footer">
            <button type="button" className="plat-btn plat-btn-ghost" onClick={onClose}>Discard Changes</button>
            <button type="submit" className="plat-btn plat-btn-primary" disabled={isPending || isLoading}>
              {isPending ? 'Synchronizing Registry…' : isEdit ? 'Update Admin Profile' : 'Register Administrator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClinicAdminsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, isLoading } = useStaffList(CATEGORY, { page, limit: PAGE_SIZE, search: debouncedSearch });
  const deleteMutation = useDeleteStaff();
  const { data: editingStaff, isLoading: isLoadingStaff } = useStaffMember(CATEGORY, editingId ?? 0);

  const staff = data?.data || [];
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);
  const activeCount = useMemo(() => (staff as StaffSummary[]).filter((s: StaffSummary) => s.isActive).length, [staff]);

  const handleEdit = (s: StaffSummary) => {
    setEditingId(s.id);
    setModalOpen(true);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout((window as any).__staffSearchTimer);
    (window as any).__staffSearchTimer = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('This will permanently archive the admin account and revoke all system permissions. Proceed?')) return;
    await deleteMutation.mutateAsync({ category: CATEGORY, id });
  };

  return (
    <div className="plat-page">
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <ShieldCheck size={16} className="color-primary" /> 
            {META.label}
          </h1>
          <p className="plat-header-sub">{META.description}</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={() => { setEditingId(null); setModalOpen(true); }}>
            <Plus size={14} /> 
            Add Admin
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <p className="plat-stat-label">Executive Block</p>
          <p className="plat-stat-value plat-stat-value-primary">{data?.total ?? 0}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Authorized Access</p>
          <p className="plat-stat-value plat-stat-value-success">{activeCount}</p>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search className="plat-search-icon" size={14} />
          <input 
            className="plat-form-input plat-search-input" 
            placeholder="Search executive names..." 
            value={search} 
            onChange={(e) => handleSearchChange(e.target.value)} 
          />
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty" style={{ minHeight: 200 }}><RefreshCw size={24} className="animate-spin opacity-20" /></div>
        ) : staff.length === 0 ? (
          <div className="plat-empty"><ShieldCheck size={40} className="plat-empty-icon" /><p className="plat-empty-text">No clinical administrators found.</p></div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead><tr><th>#</th><th>Admin Profile</th><th>Contact</th><th>Professional Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {staff.map((s: StaffSummary, i: number) => (
                  <tr key={s.id} className="plat-table-row">
                    <td className="plat-mono-data text-xs" style={{ width: 40 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-[11px] color-muted font-medium">{s.email || 'No contact email'}</div>
                    </td>
                    <td>
                      <div className="plat-mono-data">{s.mobile}</div>
                      <div className="text-[10px] color-muted plat-capitalize flex items-center gap-1 font-medium">
                        <MapPin size={10} /> {s.city || 'Station N/A'}
                      </div>
                    </td>
                    <td><div className="font-medium">{s.designation || 'Facility Admin'}</div></td>
                    <td>
                      <span className={s.isActive ? 'plat-badge plat-badge-info' : 'plat-badge plat-badge-default'}>
                        {s.isActive ? ( 
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <UserCheck size={10} /> Active
                          </span> 
                        ) : 'Revoked'}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button className="plat-btn plat-btn-icon plat-btn-ghost" onClick={() => handleEdit(s)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-icon plat-btn-danger" onClick={() => handleDelete(s.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && <StaffModal mode={editingId ? 'edit' : 'create'} staff={editingStaff} isLoading={isLoadingStaff} onClose={() => { setModalOpen(false); setEditingId(null); }} onSuccess={() => setEditingId(null)} />}
    </div>
  );
}