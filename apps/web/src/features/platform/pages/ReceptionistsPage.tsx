import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit2, Trash2, X, ClipboardList, Mail, Phone, MapPin, Users, UserCheck, Calendar, Briefcase, Info, BadgeIndianRupee, RefreshCw, Upload, FileText } from 'lucide-react';
import { useStaffList, useDeleteStaff, useCreateStaff, useUpdateStaff, useStaffMember } from '@/features/staff/hooks/use-staff';
import type { StaffSummary, StaffMember } from '@mmc/types';
import type { CreateStaffInput, UpdateStaffInput } from '@mmc/validation';
import { createStaffSchema, updateStaffSchema } from '@mmc/validation';
import { apiClient } from '@/infrastructure/api-client';
import '../styles/platform.css';

function FileInputRow({ 
  label, 
  field, 
  value, 
  onChange, 
  error, 
  accept = "image/*,application/pdf",
  className = "",
  style = {}
}: { 
  label: string; 
  field: string; 
  value?: string; 
  onChange: (f: string, e: React.ChangeEvent<HTMLInputElement>) => void; 
  error?: string; 
  accept?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`plat-form-group ${className}`} style={style}>
      <label className="plat-form-label">{label}</label>
      <div className="plat-file-input-wrapper">
        <div className="plat-file-trigger">
          <Upload size={14} /> Upload {label}
        </div>
        <input 
          type="file" 
          accept={accept}
          onChange={(e) => onChange(field, e)} 
        />
      </div>
      {value && (
        <div className="plat-file-preview">
          <span className="plat-file-preview-name" title={value}>{value.split('/').pop() || 'Uploaded File'}</span>
          {value.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
            <img src={value} alt="Preview" className="plat-file-preview-image" />
          ) : (
            <FileText size={16} className="color-muted" />
          )}
        </div>
      )}
      {error && <span className="plat-form-error">{error}</span>}
    </div>
  );
}

const CATEGORY = 'receptionist' as const;
const META = { label: 'Receptionists', description: 'Manage front-desk staff, shift rosters, and patient intake coordination.' };
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
    title: '',
    firstname: '',
    middlename: '',
    surname: '',
    qualification: '',
    institute: '',
    passedOut: '',
    registrationId: '',
    consultationFee: 0,
    permanentAddress: '',
    password: '',
    clinicId: null,
    aadharnumber: '',
    pannumber: '',
    joiningdate: '',
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
    ...getDefaultStaffForm(), // Fallback for missing fields
    ...staff,
    category: CATEGORY,
    gender,
    mobile2: staff.mobile2 || '',
    dateBirth: staff.dateBirth ?? '',
    consultationFee: Number(staff.consultationFee) || 0,
    password: '', // Keep blank on edit
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
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

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

    // Debugging ke liye full data check karein
    console.log("[StaffModal] Raw Form Data:", form);

    // 1. Name split logic: 'name' field se firstname aur surname nikalna
    const nameParts = (form.name || '').trim().split(/\s+/);
    const fName = nameParts[0] || '';
    // Agar user ne surname nahi dala, toh hum default 'Staff' ya 'Member' bhej sakte hain
    const sName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Member';

    // 2. Payload prepare karein (zod schema ke exact requirements ke hisaab se)
    const payload = {
      ...form,
      firstname: fName,
      surname: sName,
      // Fallbacks for common strict schema fields
      title: form.title || 'Mr',
      qualification: form.qualification || 'Higher Secondary',
      joiningdate: form.joiningdate ?? (new Date().toISOString().split('T')[0] || ''),
      registrationId: form.registrationId ?? 'N/A',

      // Numeric casting
      salaryCur: Number(form.salaryCur) || 0,
      dept: Number(form.dept) || 4,
      consultationFee: 0,
    };

    console.log("[StaffModal] Processed Payload for Validation:", payload);

    const schema = mode === 'create' ? createStaffSchema : updateStaffSchema;
    const result = schema.safeParse(payload);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      // Sabse important: Console mein dekhein kaunsa specific field fail hua
      console.error("[StaffModal] Zod Validation Errors:", result.error.flatten().fieldErrors);

      result.error.errors.forEach((err) => {
        const path = err.path[0] as string;
        fieldErrors[path] = err.message;
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
      console.error("[StaffModal] API Exception:", err);
      setErrors({ general: err.message || 'Server error' });
    }
  };

  const updateForm = (field: string, value: any) => {
    let castValue = value;
    if (field === 'dept' || field === 'salaryCur') castValue = value === '' ? 0 : Number(value);
    setForm((prev) => ({ ...prev, [field]: castValue }));
  };

  const handleFileUpload = async (field: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.post('/staff/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const resData = (res as any)._original ?? res.data;
      if (resData?.success && resData?.path) {
         updateForm(field, resData.path);
      } else {
         setErrors((prev) => ({ ...prev, [field]: 'Upload failed' }));
      }
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, [field]: err.message || 'Upload failed' }));
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEdit = mode === 'edit';

  return (
    <div className="plat-modal-backdrop" onClick={onClose}>
      <div className="plat-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="plat-modal-header">
          <h3 className="plat-modal-title">{isEdit ? 'Update Receptionist Profile' : 'Register New Receptionist'}</h3>
          <button className="plat-btn plat-btn-icon plat-btn-ghost" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="plat-modal-body">
          {errors['general'] && <div className="plat-error-banner mb-4">{errors['general']}</div>}

          {/* Section 1: Personal & Contact */}
          <div className="plat-form-section">
            <h4 className="plat-form-section-title">Personal & Contact</h4>
            <div className="plat-form-grid-multi">
              <div className="plat-form-group" style={{ gridColumn: 'span 2' }}>
                <label className="plat-form-label">Full Name *</label>
                <input
                  type="text"
                  className="plat-form-input"
                  value={form.name || ''}
                  onChange={(e) => updateForm('name', e.target.value)}
                  disabled={isLoading}
                />
                {errors['name'] && <span className="plat-form-error">{errors['name']}</span>}
              </div>

              <div className="plat-form-group">
                <label className="plat-form-label">Email Address</label>
                <input
                  type="email"
                  className="plat-form-input"
                  value={form.email || ''}
                  onChange={(e) => updateForm('email', e.target.value)}
                  disabled={isLoading}
                />
                {errors['email'] && <span className="plat-form-error">{errors['email']}</span>}
              </div>

              <div className="plat-form-group">
                <label className="plat-form-label">Mobile Number *</label>
                <input
                  type="tel"
                  className="plat-form-input"
                  value={form.mobile || ''}
                  onChange={(e) => updateForm('mobile', e.target.value)}
                  disabled={isLoading}
                />
                {errors['mobile'] && <span className="plat-form-error">{errors['mobile']}</span>}
              </div>

              <div className="plat-form-group">
                <label className="plat-form-label">Secondary Mobile</label>
                <input
                  type="tel"
                  className="plat-form-input"
                  value={form.mobile2 || ''}
                  onChange={(e) => updateForm('mobile2', e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="plat-form-group">
                <label className="plat-form-label">Gender</label>
                <select
                  className="plat-form-input"
                  value={form.gender || 'Male'}
                  onChange={(e) => updateForm('gender', e.target.value)}
                  disabled={isLoading}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="plat-form-group">
                <label className="plat-form-label">Date of Birth</label>
                <input
                  type="date"
                  className="plat-form-input"
                  value={form.dateBirth?.split('T')[0] || ''}
                  onChange={(e) => updateForm('dateBirth', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Professional & Location */}
          <div className="plat-form-section">
            <h4 className="plat-form-section-title">Professional & Location</h4>
            <div className="plat-form-grid-multi">
              <div className="plat-form-group">
                <label className="plat-form-label">Designation</label>
                <input
                  type="text"
                  className="plat-form-input"
                  value={form.designation || ''}
                  onChange={(e) => updateForm('designation', e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="plat-form-group">
                <label className="plat-form-label">Department</label>
                <select
                  className="plat-form-input"
                  value={form.dept || 4}
                  onChange={(e) => updateForm('dept', e.target.value)}
                  disabled={isLoading}
                >
                  <option value={1}>Finance</option>
                  <option value={2}>Reception</option>
                  <option value={3}>Logistics</option>
                  <option value={4}>Homeopathy</option>
                </select>
              </div>

              <div className="plat-form-group">
                <label className="plat-form-label">Monthly Salary (₹)</label>
                <input
                  type="number"
                  className="plat-form-input"
                  value={form.salaryCur || ''}
                  onChange={(e) => updateForm('salaryCur', e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="plat-form-group">
                <label className="plat-form-label">Station/City</label>
                <input
                  type="text"
                  className="plat-form-input"
                  value={form.city || ''}
                  onChange={(e) => updateForm('city', e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="plat-form-group" style={{ gridColumn: 'span 2' }}>
                <label className="plat-form-label">Residential Address</label>
                <textarea
                  className="plat-form-input"
                  value={form.address || ''}
                  onChange={(e) => updateForm('address', e.target.value)}
                  disabled={isLoading}
                  rows={2}
                />
              </div>

              <div className="plat-form-group" style={{ gridColumn: 'span 2' }}>
                <label className="plat-form-label">About / Bio</label>
                <textarea
                  className="plat-form-input"
                  value={form.about || ''}
                  onChange={(e) => updateForm('about', e.target.value)}
                  disabled={isLoading}
                  rows={2}
                />
              </div>

              {mode === 'create' && (
                <div className="plat-form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="plat-form-label">Initial Password *</label>
                  <input
                    type="password"
                    className="plat-form-input"
                    value={form.password || ''}
                    onChange={(e) => updateForm('password', e.target.value)}
                    disabled={isLoading}
                  />
                  {errors['password'] && <span className="plat-form-error">{errors['password']}</span>}
                </div>
              )}

              {mode === 'edit' && (
                <div className="plat-form-group">
                  <label className="plat-form-label">End Date</label>
                  <input
                    type="date"
                    className="plat-form-input"
                    value={form.dateLeft?.split('T')[0] || ''}
                    onChange={(e) => updateForm('dateLeft', e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Statutory Documents */}
          <div className="plat-form-section">
            <h4 className="plat-form-section-title">Statutory Documents</h4>
            <div className="plat-form-grid-multi">
              <div className="plat-form-group">
                <label className="plat-form-label">Aadhar Number</label>
                <input
                  type="text"
                  className="plat-form-input"
                  value={form.aadharnumber || ''}
                  onChange={(e) => updateForm('aadharnumber', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <FileInputRow label="Aadhar Card" field="aadharCard" value={form.aadharCard} onChange={handleFileUpload} error={errors['aadharCard']} />

              <div className="plat-form-group">
                <label className="plat-form-label">PAN Number</label>
                <input
                  type="text"
                  className="plat-form-input"
                  value={form.pannumber || ''}
                  onChange={(e) => updateForm('pannumber', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <FileInputRow label="PAN Card" field="panCard" value={form.panCard} onChange={handleFileUpload} error={errors['panCard']} />
            </div>
          </div>

          <div className="plat-modal-footer">
            <button type="button" className="plat-btn plat-btn-ghost" onClick={onClose}>Discard Changes</button>
            <button type="submit" className="plat-btn plat-btn-primary" disabled={isPending || isLoading}>
              {isPending ? 'Saving Registry…' : isEdit ? 'Update Receptionist' : 'Register Receptionist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReceptionistsPage() {
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
    if (!confirm('This will revoke all clinical access for this receptionist. Proceed?')) return;
    await deleteMutation.mutateAsync({ category: CATEGORY, id });
  };

  // return (
  return (
    <div className="plat-page">
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <ClipboardList size={16} className="color-primary" /> 
            {META.label}
          </h1>
          <p className="plat-header-sub">{META.description}</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={() => { setEditingId(null); setModalOpen(true); }}>
            <Plus size={14} /> 
            Add Receptionist
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <p className="plat-stat-label">Desk Force</p>
          <p className="plat-stat-value plat-stat-value-primary">{data?.total ?? 0}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Active on Roster</p>
          <p className="plat-stat-value plat-stat-value-success">{activeCount}</p>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search className="plat-search-icon" size={14} />
          <input 
            className="plat-form-input plat-search-input" 
            placeholder="Search by name or identity..." 
            value={search} 
            onChange={(e) => handleSearchChange(e.target.value)} 
          />
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty" style={{ minHeight: 400 }}><RefreshCw size={24} className="animate-spin opacity-20" /></div>
        ) : staff.length === 0 ? (
          <div className="plat-empty" style={{ minHeight: 400 }}>
            <div className="plat-empty-icon-wrap mb-6">
              <ClipboardList size={48} className="text-blue-500 opacity-20" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No Receptionists Registered</h3>
            <p className="text-sm text-slate-500 max-w-xs text-center mb-8">
              Front-desk operations start here. Add your first receptionist to begin coordinating patient intake.
            </p>
            <button className="plat-btn plat-btn-primary" onClick={() => { setEditingId(null); setModalOpen(true); }}>
              <Plus size={14} /> Register First Receptionist
            </button>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead><tr><th>#</th><th>Staff Identity</th><th>Contact Information</th><th>Primary Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {staff.map((s: StaffSummary, i: number) => (
                  <tr key={s.id} className="plat-table-row">
                    <td className="plat-mono-data text-xs" style={{ width: 40 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-[11px] color-muted font-medium">{s.email || 'No email provided'}</div>
                    </td>
                    <td>
                      <div className="plat-mono-data">{s.mobile}</div>
                      <div className="text-[10px] color-muted plat-capitalize flex items-center gap-1 font-medium">
                        <MapPin size={10} /> {s.city || 'Station N/A'}
                      </div>
                    </td>
                    <td><div className="font-medium">{s.designation || 'Front Desk'}</div></td>
                    <td>
                      <span className={s.isActive ? 'plat-badge plat-badge-info' : 'plat-badge plat-badge-default'}>
                        {s.isActive ? (
                          <span className="flex items-center gap-1">
                            <UserCheck size={10} /> Authorized
                          </span>
                        ) : 'Offline'}
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