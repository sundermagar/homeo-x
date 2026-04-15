import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, X, GraduationCap, Building2, Stethoscope, Mail, Phone, MapPin, Users, UserCheck, LayoutGrid, Award, Landmark } from 'lucide-react';
import { useStaffList, useDeleteStaff, useCreateStaff, useUpdateStaff, useStaffMember } from '@/features/staff/hooks/use-staff';
import type { StaffSummary, StaffMember } from '@mmc/types';
import type { CreateStaffInput, UpdateStaffInput } from '@mmc/validation';
import { createStaffSchema, updateStaffSchema } from '@mmc/validation';
import '../styles/platform.css';

const CATEGORY = 'doctor' as const;
const META = { label: 'Doctors', description: 'Manage clinical practitioners and specialized doctor profiles.' };
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
    registrationCertificate: '',
    aadharCard: '',
    panCard: '',
    appointmentLetter: '',
    aadharnumber: '',
    pannumber: '',
    joiningdate: '',
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
    registrationCertificate: staff.registrationCertificate || '',
    aadharCard: staff.aadharCard || '',
    panCard: staff.panCard || '',
    appointmentLetter: staff.appointmentLetter || '',
    aadharnumber: staff.aadharnumber || '',
    pannumber: staff.pannumber || '',
    joiningdate: staff.joiningdate || '',
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateStaff();
  const updateMutation = useUpdateStaff();
  const qc = useQueryClient();

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

    const fullName = `${form.firstname} ${form.middlename || ''} ${form.surname}`.replace(/\s+/g, ' ').trim();
    const finalForm = { ...form, name: fullName };

    const schema = mode === 'create' ? createStaffSchema : updateStaffSchema;
    const result = schema.safeParse(finalForm);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path.length > 0) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(finalForm as CreateStaffInput);
      } else {
        await updateMutation.mutateAsync({ 
          category: CATEGORY, 
          id: (staff as StaffMember).id, 
          ...(finalForm as UpdateStaffInput) 
        });
      }
      qc.invalidateQueries({ queryKey: ['staff'] });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrors({ general: err.message || 'An error occurred during submission' });
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
      <div className="plat-modal-content" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
        <div className="plat-modal-header">
          <h3 className="plat-modal-title">
            {isEdit ? 'Update Practitioner Record' : 'Register New Practitioner'}
          </h3>
          <button className="plat-btn plat-btn-icon plat-btn-ghost" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="plat-modal-body">
          {errors['general'] && (
            <div className="plat-error-banner mb-4">{errors['general']}</div>
          )}

          <div className="plat-form-grid">
            {/* Identity Group */}
            <div className="plat-form-group">
              <label className="plat-form-label">Practitioner Title *</label>
              <select
                className="plat-form-input"
                value={form.title || ''}
                onChange={(e) => updateForm('title', e.target.value)}
                disabled={isLoading}
              >
                <option value="">Select Title</option>
                <option value="Dr">Dr.</option>
                <option value="Dr. (Mrs)">Dr. (Mrs)</option>
                <option value="Dr. (Ms)">Dr. (Ms)</option>
              </select>
              {errors['title'] && <span className="plat-form-error">{errors['title']}</span>}
            </div>

            <div className="plat-form-group">
              <label className="plat-form-label">First Name *</label>
              <input
                type="text"
                className="plat-form-input"
                value={form.firstname || ''}
                onChange={(e) => updateForm('firstname', e.target.value)}
                disabled={isLoading}
              />
              {errors['firstname'] && <span className="plat-form-error">{errors['firstname']}</span>}
            </div>

            <div className="plat-form-group">
              <label className="plat-form-label">Surname *</label>
              <input
                type="text"
                className="plat-form-input"
                value={form.surname || ''}
                onChange={(e) => updateForm('surname', e.target.value)}
                disabled={isLoading}
              />
              {errors['surname'] && <span className="plat-form-error">{errors['surname']}</span>}
            </div>

            <div className="plat-form-group">
              <label className="plat-form-label">Primary Mobile *</label>
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
              <label className="plat-form-label">Consultation Fee (₹)</label>
              <input
                type="number"
                className="plat-form-input"
                value={form.consultationFee || ''}
                onChange={(e) => updateForm('consultationFee', e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="plat-form-group">
              <label className="plat-form-label">Specialist Dept.</label>
              <select
                className="plat-form-input"
                value={form.dept || 4}
                onChange={(e) => updateForm('dept', Number(e.target.value))}
                disabled={isLoading}
              >
                <option value={1}>General Medicine</option>
                <option value={4}>Homeopathy</option>
                <option value={2}>Cardiology</option>
              </select>
            </div>
            
            <div className="plat-form-group">
              <label className="plat-form-label">Registration ID</label>
              <input
                type="text"
                className="plat-form-input"
                value={form.registrationId || ''}
                onChange={(e) => updateForm('registrationId', e.target.value)}
                disabled={isLoading}
              />
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
          </div>

          <div className="plat-modal-footer">
            <button type="button" className="plat-btn plat-btn-ghost" onClick={onClose}>
              Discard
            </button>
            <button type="submit" className="plat-btn plat-btn-primary" disabled={isPending || isLoading}>
              {isPending ? 'Processing…' : isEdit ? 'Save Changes' : 'Register Practitioner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DoctorsPage() {
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
    if (!confirm('Are you sure you want to remove this practitioner?')) return;
    await deleteMutation.mutateAsync({ category: CATEGORY, id });
  };

  // return (
  return (
    <div className="plat-page">
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Stethoscope size={16} className="color-primary" />
            {META.label}
          </h1>
          <p className="plat-header-sub">{META.description}</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={openCreate}>
            <Plus size={14} /> Register Doctor
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <p className="plat-stat-label">Total Practitioners</p>
          <p className="plat-stat-value plat-stat-value-primary">{data?.total ?? 0}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Active Registry</p>
          <p className="plat-stat-value plat-stat-value-success">{activeCount}</p>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search className="plat-search-icon" size={14} />
          <input
            type="text"
            className="plat-form-input plat-search-input"
            placeholder="Search practitioners by name or ID..."
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
            <p className="plat-empty-text">Loading doctors...</p>
          </div>
        ) : staff.length === 0 ? (
          <div className="plat-empty" style={{ minHeight: 240 }}>
            <Stethoscope size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No doctors found.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Clinical Practitioner</th>
                  <th style={{ width: '220px' }}>Contact Details</th>
                  <th style={{ width: '180px' }}>Credentials</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '110px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s: StaffSummary, index: number) => (
                  <tr key={s.id} className="plat-table-row">
                    <td className="plat-mono-data text-xs" style={{ width: 40 }}>{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td>
                      <div className="font-semibold flex items-center gap-1.5">
                        <Link to={`/platform/doctors/${s.id}`} className="hover:text-[var(--pp-blue)] transition-colors plat-capitalize">
                          {s.name || 'Unknown'}
                        </Link>
                      </div>
                      <div className="text-[11px] color-muted font-medium">{s.email || '—'}</div>
                    </td>
                    <td>
                      <div className="plat-mono-data">{s.mobile || '—'}</div>
                      <div className="text-[10px] color-muted plat-capitalize flex items-center gap-1 font-medium">
                        <MapPin size={10} /> {s.city || 'Location N/A'}
                      </div>
                    </td>
                    <td>
                      <div className="text-xs font-semibold flex items-center gap-1 plat-capitalize">
                        <GraduationCap size={12} className="color-muted" />
                        {s.qualification || 'General'}
                      </div>
                      <div className="text-[10px] color-muted font-medium italic plat-capitalize">
                        {s.designation || 'Practitioner'}
                      </div>
                    </td>
                    <td>
                      <span className={s.isActive ? 'plat-badge plat-badge-info' : 'plat-badge plat-badge-default'}>
                        {s.isActive ? (
                          <span className="flex items-center gap-1"><UserCheck size={10} /> Active</span>
                        ) : 'Deactivated'}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button className="plat-btn plat-btn-icon plat-btn-ghost" title="Edit" onClick={() => openEdit(s)}>
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