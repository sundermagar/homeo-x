import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Users, Stethoscope, ClipboardList, ShieldCheck, UserCog } from 'lucide-react';
import { NumericInput } from '@/shared/components/NumericInput';
import { useStaffList, useDeleteStaff, useCreateStaff, useUpdateStaff, useStaffMember } from '@/features/staff/hooks/use-staff';
import type { StaffCategory, StaffSummary, StaffMember } from '@mmc/types';
import type { CreateStaffInput, UpdateStaffInput } from '@mmc/validation';
import { createStaffSchema, updateStaffSchema } from '@mmc/validation';
import '../styles/platform.css';

const CATEGORY_META: Record<StaffCategory, { label: string; description: string; icon: any }> = {
  doctor: { label: 'Doctors', description: 'Clinical practitioners and specialized doctor profiles.', icon: Stethoscope },
  employee: { label: 'Employees', description: 'Support staff and facility employees.', icon: Users },
  receptionist: { label: 'Receptionists', description: 'Front desk and appointment coordinators.', icon: ClipboardList },
  clinicadmin: { label: 'Clinic Admins', description: 'Clinic administrators with management access.', icon: ShieldCheck },
  account: { label: 'Account Mgrs', description: 'Account managers handling clinic billing.', icon: UserCog },
};

const PAGE_SIZE = 10;

function getDefaultStaffForm(category: StaffCategory): CreateStaffInput {
  return {
    category,
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
    category: staff.category,
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
    dateBirth: staff.dateBirth || '',
    dateLeft: staff.dateLeft || '',
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
  category,
  mode,
  staff,
  isLoading,
  onClose,
  onSuccess,
}: {
  category: StaffCategory;
  mode: 'create' | 'edit';
  staff?: StaffMember | null;
  isLoading: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<CreateStaffInput | UpdateStaffInput>(() => getDefaultStaffForm(category));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();

  useEffect(() => {
    if (mode === 'edit' && staff) {
      setForm(staffMemberToForm(staff));
    } else {
      setForm(getDefaultStaffForm(category));
    }
  }, [category, mode, staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const payload = {
      ...form,
      salaryCur: Number(form.salaryCur) || 0,
      dept: Number(form.dept) || 4,
      consultationFee: Number(form.consultationFee) || 0,
    };

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
          category,
          id: (staff as StaffMember).id,
          ...(payload as UpdateStaffInput)
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrors({ general: err.message || 'Server error' });
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
    <div className="plat-modal-overlay" onClick={onClose}>
      <div className="plat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="plat-modal-header">
          <h3 className="plat-modal-title">
            {isEdit ? `Update ${CATEGORY_META[category].label.replace(/s$/, '')}` : `Register New ${CATEGORY_META[category].label.replace(/s$/, '')}`}
          </h3>
          <button className="plat-btn plat-btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="plat-modal-body">
          {errors['general'] && <div className="plat-error-banner mb-4">{errors['general']}</div>}

          <div className="plat-form-grid">
            <div className="plat-form-group">
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
            </div>

            <div className="plat-form-group">
              <label className="plat-form-label">Mobile Number *</label>
              <NumericInput
                className="plat-form-input"
                value={form.mobile || ''}
                onChange={(e: any) => updateForm('mobile', e.target.value)}
                disabled={isLoading}
              />
              {errors['mobile'] && <span className="plat-form-error">{errors['mobile']}</span>}
            </div>

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
            
            {category === 'doctor' && (
              <div className="plat-form-group">
                <label className="plat-form-label">Consultation Fee (₹)</label>
                <NumericInput
                  className="plat-form-input"
                  value={form.consultationFee || ''}
                  onChange={(e: any) => updateForm('consultationFee', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}

            {mode === 'create' && (
              <div className="plat-form-group">
                <label className="plat-form-label">Login Password *</label>
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
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button type="button" className="plat-btn plat-btn-secondary" onClick={onClose} style={{ flex: 1 }}>Discard</button>
            <button type="submit" className="plat-btn plat-btn-primary" style={{ flex: 1 }} disabled={isPending || isLoading}>
              {isPending ? 'Processing…' : isEdit ? 'Update Details' : 'Register Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StaffCategoryPage({ category }: { category: StaffCategory }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const meta = CATEGORY_META[category] || CATEGORY_META.doctor;
  const Icon = meta.icon;

  const { data, isLoading } = useStaffList(category, { 
    page, 
    limit: PAGE_SIZE, 
    search: debouncedSearch,
    sortBy,
    sortOrder
  });
  const deleteMutation = useDeleteStaff();
  const { data: editingStaff, isLoading: isLoadingStaff } = useStaffMember(category, editingId ?? 0);

  const staff = data?.data || [];
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);
  const activeCount = data?.activeCount ?? 0;

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
    if (!confirm('Permanently remove this record?')) return;
    await deleteMutation.mutateAsync({ category, id });
  };

  return (
    <div className="plat-page fade-in">
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title"><Icon size={20} className="color-primary" /> {meta.label}</h1>
          <p className="plat-header-sub">{meta.description}</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={() => { setEditingId(null); setModalOpen(true); }}><Plus size={14} /> Add {meta.label.replace(/s$/, '')}</button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <p className="plat-stat-label">Total Volume</p>
          <p className="plat-stat-value plat-stat-value-primary">{data?.total ?? 0}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Active Listing</p>
          <p className="plat-stat-value plat-stat-value-success">{activeCount}</p>
        </div>
      </div>

      <div className="plat-filters">
        <div className="flex gap-4 flex-1">
          <div className="plat-search-wrap">
            <Search className="plat-search-icon" size={14} />
            <input
              className="plat-form-input plat-search-input"
              placeholder="Search registry..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold color-muted uppercase tracking-wider">Sort:</span>
            <select 
              className="plat-form-input !py-1 !text-xs !w-auto min-w-[140px]"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [col, order] = e.target.value.split('-');
                setSortBy(col);
                setSortOrder(order as 'ASC' | 'DESC');
                setPage(1);
              }}
            >
              <option value="id-DESC">Newest First</option>
              <option value="id-ASC">Oldest First</option>
              <option value="name-ASC">A-Z</option>
              <option value="name-DESC">Z-A</option>
            </select>
          </div>
        </div>

        <button 
          className="plat-btn plat-btn-ghost plat-btn-sm" 
          onClick={() => { 
            setSearch(''); 
            setDebouncedSearch(''); 
            setPage(1); 
            setSortBy('id');
            setSortOrder('DESC');
          }}
        >
          Reset
        </button>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty"><p className="plat-empty-text">Loading...</p></div>
        ) : staff.length === 0 ? (
          <div className="plat-empty"><Icon size={40} className="plat-empty-icon" /><p className="plat-empty-text">No records found.</p></div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead><tr><th>#</th><th>Identity Profile</th><th>Contact</th><th>Designation</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {staff.map((s: StaffSummary, i: number) => (
                  <tr key={s.id} className="plat-table-row">
                    <td className="plat-table-cell color-muted font-mono text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="plat-table-cell"><div className="font-bold plat-capitalize">{s.name}</div><div className="text-[11px] color-muted">{s.email}</div></td>
                    <td className="plat-table-cell"><div className="font-mono text-sm">{s.mobile}</div><div className="text-[10px] color-muted plat-capitalize">{s.city || 'Station N/A'}</div></td>
                    <td className="plat-table-cell text-sm color-secondary">{s.designation || 'General Staff'}</td>
                    <td className="plat-table-cell"><span className={s.isActive ? 'plat-badge plat-badge-primary' : 'plat-badge plat-badge-default'}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="plat-table-cell"><div className="flex justify-end gap-2"><button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleEdit(s)}><Edit2 size={13} /></button><button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(s.id)}><Trash2 size={13} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-6 mt-8">
          <button 
            className="plat-btn plat-btn-ghost plat-btn-sm" 
            disabled={page <= 1} 
            onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0); }}
          >
            ← Previous
          </button>
          <div className="text-sm font-bold color-muted">
            Page <span className="color-primary">{page}</span> of {totalPages}
          </div>
          <button 
            className="plat-btn plat-btn-ghost plat-btn-sm" 
            disabled={page >= totalPages} 
            onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }}
          >
            Next →
          </button>
        </div>
      )}

      {modalOpen && <StaffModal category={category} mode={editingId ? 'edit' : 'create'} staff={editingStaff} isLoading={isLoadingStaff} onClose={() => { setModalOpen(false); setEditingId(null); }} onSuccess={() => setEditingId(null)} />}
    </div>
  );
}
