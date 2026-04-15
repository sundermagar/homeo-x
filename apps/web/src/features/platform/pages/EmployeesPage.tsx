import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit2, Trash2, X, Users, UserCheck } from 'lucide-react';
import { useStaffList, useDeleteStaff, useCreateStaff, useUpdateStaff, useStaffMember } from '@/features/staff/hooks/use-staff';
import type { StaffSummary, StaffMember } from '@mmc/types';
import type { CreateStaffInput, UpdateStaffInput } from '@mmc/validation';
import { createStaffSchema, updateStaffSchema } from '@mmc/validation';
import '../styles/platform.css';

type StaffFormErrors = {
  general?: string;
  name?: string;
  email?: string;
  mobile?: string;
  password?: string;
  [key: string]: string | undefined;
};

const CATEGORY = 'employee' as const;
const META = { label: 'Employees', description: 'Manage your support staff and office employees.' };
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
  const gender = staff.gender === 'Female' || staff.gender === 'Other' ? (staff.gender as "Female" | "Other") : 'Male';
  return {
    category: CATEGORY,
    name: staff.name,
    email: staff.email,
    mobile: staff.mobile,
    mobile2: staff.mobile2 || '',
    gender,
    designation: staff.designation,
    dept: staff.department,
    city: staff.city,
    address: staff.address,
    about: staff.about,
    dateBirth: staff.dateBirth ?? '',
    dateLeft: staff.dateLeft ?? '',
    salaryCur: staff.salary,
    title: staff.title || '',
    firstname: staff.firstname || '',
    middlename: staff.middlename || '',
    surname: staff.surname || '',
    qualification: staff.qualification || '',
    institute: staff.institute || '',
    passedOut: staff.passedOut || '',
    registrationId: staff.registrationId || '',
    consultationFee: Number(staff.consultationFee) || 0,
    permanentAddress: staff.permanentAddress || '',
    password: '',
    clinicId: staff.clinicId,
    aadharnumber: staff.aadharnumber || '',
    pannumber: staff.pannumber || '',
    joiningdate: staff.joiningdate || '',
    registrationCertificate: staff.registrationCertificate || '',
    aadharCard: staff.aadharCard || '',
    panCard: staff.panCard || '',
    appointmentLetter: staff.appointmentLetter || '',
    profilepic: staff.profilepic || '',
    col10Document: staff.col10Document || '',
    col12Document: staff.col12Document || '',
    bhmsDocument: staff.bhmsDocument || '',
    mdDocument: staff.mdDocument || '',
  };
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
  const [errors, setErrors] = useState<StaffFormErrors>({});

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

    if (!form.name?.trim()) {
      setErrors({ name: 'Full name is required' });
      return;
    }

    const nameParts = form.name.trim().split(/\s+/);
    const derivedFirstname = nameParts[0] || '';
    const derivedSurname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    const payload = {
      ...form,
      firstname: form.firstname || derivedFirstname,
      surname: form.surname || derivedSurname,
      salaryCur: Number(form.salaryCur) || 0,
      dept: Number(form.dept) || 4,
      consultationFee: Number(form.consultationFee) || 0,
      title: form.title || 'Mr/Ms'
    };

    if (!payload.surname && (CATEGORY as string) === 'doctor') {
      setErrors({ name: 'Please enter both first name and surname' });
      return;
    }

    const schema = mode === 'create' ? createStaffSchema : updateStaffSchema;
    const result = schema.safeParse(payload);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
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
      const apiMsg = err.response?.data?.message || err.message || 'Server error';
      setErrors({ general: apiMsg });
    }
  };

  const updateForm = (field: string, value: any) => {
    let castValue = value;

    if (field === 'dept' || field === 'salaryCur' || field === 'consultationFee') {
      castValue = value === '' ? 0 : Number(value);
    }

    setForm((prev) => ({ ...prev, [field]: castValue }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEdit = mode === 'edit';

  return (
    <div className="plat-modal-backdrop" onClick={onClose}>
      <div className="plat-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="plat-modal-header">
          <h3 className="plat-modal-title">{isEdit ? 'Update Employee Record' : 'Register New Employee'}</h3>
          <button className="plat-btn plat-btn-icon plat-btn-ghost" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="plat-modal-body">
          {errors['general'] && (
            <div className="plat-error-banner mb-4">
              {errors['general']}
            </div>
          )}

          <div className="plat-form-grid">
            <div className="plat-form-group">
              <label className="plat-form-label">Full Name *</label>
              <input
                type="text"
                className="plat-form-input"
                value={form.name || ''}
                onChange={(e) => updateForm('name', e.target.value)}
                disabled={isLoading}
                placeholder="Full name as per ID"
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
                placeholder="employee@homeox.com"
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
                placeholder="9876543210"
              />
              {errors['mobile'] && <span className="plat-form-error">{errors['mobile']}</span>}
            </div>

            <div className="plat-form-group">
              <label className="plat-form-label">Emergency Mobile</label>
              <input
                type="tel"
                className="plat-form-input"
                value={form.mobile2 || ''}
                onChange={(e) => updateForm('mobile2', e.target.value)}
                disabled={isLoading}
                placeholder="Alternative number"
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
              <label className="plat-form-label">Designation</label>
              <input
                type="text"
                className="plat-form-input"
                value={form.designation || ''}
                onChange={(e) => updateForm('designation', e.target.value)}
                disabled={isLoading}
                placeholder="e.g. Receptionist, Admin"
              />
            </div>

            <div className="plat-form-group">
              <label className="plat-form-label">Primary Department</label>
              <select
                className="plat-form-input"
                value={form.dept || 4}
                onChange={(e) => updateForm('dept', Number(e.target.value))}
                disabled={isLoading}
              >
                <option value={1}>General Medicine</option>
                <option value={2}>Cardiology</option>
                <option value={3}>Dermatology</option>
                <option value={4}>Homeopathy</option>
                <option value={5}>Ayurveda</option>
              </select>
            </div>

            <div className="plat-form-group">
              <label className="plat-form-label">City Station</label>
              <input
                type="text"
                className="plat-form-input"
                value={form.city || ''}
                onChange={(e) => updateForm('city', e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="plat-form-group">
              <label className="plat-form-label">Residential Address</label>
              <textarea
                className="plat-form-input"
                value={form.address || ''}
                onChange={(e) => updateForm('address', e.target.value)}
                disabled={isLoading}
                rows={2}
              />
            </div>

            <div className="plat-form-group">
              <label className="plat-form-label">Employee Bio</label>
              <textarea
                className="plat-form-input"
                value={form.about || ''}
                onChange={(e) => updateForm('about', e.target.value)}
                disabled={isLoading}
                rows={2}
              />
            </div>

            <div className="plat-form-group">
              <label className="plat-form-label">Date of Birth</label>
              <input
                type="date"
                className="plat-form-input"
                value={form.dateBirth || ''}
                onChange={(e) => updateForm('dateBirth', e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="plat-form-group">
              <label className="plat-form-label">Monthly Salary (₹)</label>
              <input
                type="number"
                className="plat-form-input"
                value={form.salaryCur || ''}
                onChange={(e) => updateForm('salaryCur', e.target.value)}
                disabled={isLoading}
                placeholder="0"
              />
            </div>

            {mode === 'create' && (
              <div className="plat-form-group">
                <label className="plat-form-label">Initial Password *</label>
                <input
                  type="password"
                  className="plat-form-input"
                  value={form.password || ''}
                  onChange={(e) => updateForm('password', e.target.value)}
                  disabled={isLoading}
                  placeholder="Set login password"
                />
                {errors['password'] && <span className="plat-form-error">{errors['password']}</span>}
              </div>
            )}
          </div>

          <div className="plat-modal-footer">
            <button type="button" className="plat-btn plat-btn-ghost" onClick={onClose}>
              Discard
            </button>
            <button type="submit" className="plat-btn plat-btn-primary" disabled={isPending || isLoading}>
              {isPending ? 'Processing…' : isEdit ? 'Update Details' : 'Register Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  const { data, isLoading } = useStaffList(CATEGORY, { page, limit: PAGE_SIZE, search: debouncedSearch });
  const deleteMutation = useDeleteStaff();
  const { data: editingStaff, isLoading: isLoadingStaff } = useStaffMember(CATEGORY, editingId ?? 0);

  const staff = data?.data || [];
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);
  const activeCount = useMemo(() => (staff as StaffSummary[]).filter((s: StaffSummary) => s.isActive).length, [staff]);

  const openCreate = () => {
    setModalMode('create');
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (s: StaffSummary) => {
    setModalMode('edit');
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
    if (!confirm('Are you sure you want to remove this employee record?')) return;
    await deleteMutation.mutateAsync({ category: CATEGORY, id });
  };

  // return (
  return (
    <div className="plat-page">
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Users size={16} className="color-primary" />
            {META.label}
          </h1>
          <p className="plat-header-sub">{META.description}</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={openCreate}>
            <Plus size={14} /> Add Employee
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <p className="plat-stat-label">Total Roster</p>
          <p className="plat-stat-value plat-stat-value-primary">{data?.total ?? 0}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Active Staff</p>
          <p className="plat-stat-value plat-stat-value-success">{activeCount}</p>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search className="plat-search-icon" size={14} />
          <input
            type="text"
            className="plat-form-input plat-search-input"
            placeholder={`Search ${META.label.toLowerCase()} names...`}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <button className="plat-btn plat-btn-ghost plat-btn-sm" onClick={() => { setSearch(''); setDebouncedSearch(''); setPage(1); }}>
          Reset
        </button>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty" style={{ minHeight: 240 }}>
            <div className="animate-spin opacity-30 text-2xl mb-4">⟳</div>
            <p className="plat-empty-text">Loading employees...</p>
          </div>
        ) : staff.length === 0 ? (
          <div className="plat-empty" style={{ minHeight: 240 }}>
            <Users size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No {META.label.toLowerCase()} found.</p>
            <p className="text-xs color-muted mt-2">Use the "Add Employee" button to populate the registry.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Employee Profile</th>
                  <th style={{ width: '220px' }}>Contact</th>
                  <th style={{ width: '140px' }}>Designation</th>
                  <th style={{ width: '90px' }}>Status</th>
                  <th style={{ width: '110px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s: StaffSummary, index: number) => (
                  <tr key={s.id} className="plat-table-row">
                    <td className="plat-mono-data text-xs" style={{ width: 40 }}>{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td>
                      <div className="font-semibold plat-capitalize">{s.name || 'Unknown'}</div>
                      <div className="text-[11px] color-muted font-medium">{s.email || '—'}</div>
                    </td>
                    <td>
                      <div className="plat-mono-data">{s.mobile || '—'}</div>
                      <div className="text-[10px] color-muted plat-capitalize font-medium">{s.city || 'Station N/A'}</div>
                    </td>
                    <td>
                      <div className="font-medium plat-capitalize">
                        {s.designation || 'General Staff'}
                      </div>
                    </td>
                    <td>
                      <span className={s.isActive ? 'plat-badge plat-badge-info' : 'plat-badge plat-badge-default'}>
                        {s.isActive ? (
                          <span className="flex items-center gap-1"><UserCheck size={10} /> Active</span>
                        ) : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button className="plat-btn plat-btn-icon plat-btn-ghost" title="Edit" onClick={() => openEdit(s)}>
                          <X size={13} className="rotate-45" /> {/* Using X as Edit alternative if Edit2 is too bulky */}
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-icon plat-btn-danger" title="Delete" onClick={() => handleDelete(s.id)} disabled={deleteMutation.isPending}>
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

      {totalPages > 1 && (
        <div className="flex justify-center gap-4 mt-8">
          <button className="plat-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
          <button className="plat-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {modalOpen && (
        <StaffModal
          mode={modalMode}
          staff={editingStaff}
          isLoading={modalMode === 'edit' ? isLoadingStaff : false}
          onClose={() => { setModalOpen(false); setEditingId(null); }}
          onSuccess={() => { setEditingId(null); }}
        />
      )}
    </div>
  );
}