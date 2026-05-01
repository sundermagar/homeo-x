import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, X, Users, UserCheck, Stethoscope, ClipboardList, ShieldCheck, UserCog, MapPin } from 'lucide-react';
import { NumericInput } from '@/shared/components/NumericInput';
import { useStaffList, useDeleteStaff, useCreateStaff, useUpdateStaff, useStaffMember } from '@/features/staff/hooks/use-staff';
import type { StaffCategory, StaffSummary, StaffMember } from '@mmc/types';
import type { CreateStaffInput, UpdateStaffInput } from '@mmc/validation';
import { createStaffSchema, updateStaffSchema } from '@mmc/validation';
import '../styles/platform.css';

import { Drawer } from '@/shared/components/drawer';

const mobileStyles = `
  @media (max-width: 1024px) {
    .plat-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
    .plat-header-actions { width: 100% !important; margin-top: 8px; }
    .plat-header-actions .plat-btn { width: 100% !important; height: 46px !important; border-radius: 12px !important; justify-content: center !important; }

    .plat-stats-bar { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; padding: 0 !important; }
    .plat-stat-card { padding: 16px 12px !important; }
    .plat-stat-value { font-size: 20px !important; }

    .plat-filters { 
      flex-direction: column !important; 
      align-items: stretch !important; 
      gap: 12px !important; 
      background: var(--bg-surface-2) !important;
      padding: 16px !important;
      border-radius: 16px !important;
      margin-bottom: 16px !important;
      border: 1px solid var(--border-main) !important;
    }
    .plat-filters > .flex { flex-direction: column !important; width: 100% !important; gap: 12px !important; }
    .plat-search-wrap { width: 100% !important; margin: 0 !important; }
    .plat-search-input { width: 100% !important; height: 44px !important; border-radius: 12px !important; font-size: 14px !important; }
    .plat-filters select { width: 100% !important; height: 44px !important; border-radius: 12px !important; font-size: 14px !important; }
    .plat-filters .plat-btn-ghost { width: 100% !important; height: 40px !important; justify-content: center !important; }

    .plat-card { border: none !important; box-shadow: none !important; background: transparent !important; padding: 0 !important; }
    .plat-table-container { 
      border: none !important; 
      background: transparent !important; 
      overflow: visible !important; 
      width: 100% !important;
      padding: 0 !important;
    }
    .plat-table { display: block !important; width: 100% !important; min-width: 0 !important; border: none !important; }
    .plat-table thead { display: none !important; }
    .plat-table tbody { display: block !important; width: 100% !important; }
    .plat-table tr { 
      display: block !important; 
      margin-bottom: 24px !important; 
      background: var(--bg-card) !important; 
      border: 1px solid var(--border-main) !important; 
      border-radius: 20px !important; 
      padding: 0 !important;
      box-shadow: var(--pp-shadow-md) !important;
      overflow: hidden !important;
    }
    .plat-table td {
      display: grid !important;
      grid-template-columns: 100px 1fr !important;
      gap: 12px !important;
      align-items: center !important;
      padding: 12px 20px !important;
      border-bottom: 1px dashed var(--border-main) !important;
      min-height: 52px;
      text-align: right !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    .plat-table td:last-child { border-bottom: none !important; background: var(--bg-surface-2) !important; padding-top: 16px !important; padding-bottom: 16px !important; }
    
    .plat-table td::before {
      content: attr(data-label);
      font-size: 10px !important;
      font-weight: 800 !important;
      color: var(--text-muted) !important;
      text-transform: uppercase !important;
      letter-spacing: 0.1em !important;
      text-align: left !important;
    }
    .plat-cell-val { width: 100% !important; text-align: right !important; display: flex !important; flex-direction: column !important; align-items: flex-end !important; }
    [data-label="#"], [data-label="ID"] { background: var(--bg-surface-2) !important; border-bottom: 1px solid var(--border-main) !important; padding: 12px 20px !important; }
  }
`;

const CATEGORY_META: Record<StaffCategory, { label: string; description: string; icon: any }> = {
  doctor: { label: 'Doctors', description: 'Clinical practitioners and specialized doctor profiles.', icon: Stethoscope },
  employee: { label: 'Employees', description: 'Support staff and facility employees.', icon: Users },
  receptionist: { label: 'Receptionists', description: 'Front desk and appointment coordinators.', icon: ClipboardList },
  clinicadmin: { label: 'Clinic Admins', description: 'Clinic administrators with management access.', icon: ShieldCheck },
  account: { label: 'Account Mgrs', description: 'Account managers handling clinic billing.', icon: UserCog },
};

const PAGE_SIZE = 30;

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
    <Drawer
      isOpen={true}
      onClose={onClose}
      title={isEdit ? `Update ${CATEGORY_META[category].label.replace(/s$/, '')}` : `Register New ${CATEGORY_META[category].label.replace(/s$/, '')}`}
      maxWidth="600px"
    >
      <div className="plat-modal-content" style={{ border: 'none', boxShadow: 'none', margin: 0, padding: 0 }}>
        <form onSubmit={handleSubmit} className="plat-modal-body">
          {errors['general'] && <div className="plat-error-banner mb-4">{errors['general']}</div>}

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

          <div className="plat-modal-footer">
            <button type="button" className="plat-btn plat-btn-ghost" onClick={onClose}>Discard</button>
            <button type="submit" className="plat-btn plat-btn-primary" disabled={isPending || isLoading}>
              {isPending ? 'Processing…' : isEdit ? 'Update Details' : 'Register Entry'}
            </button>
          </div>
        </form>
      </div>
    </Drawer>
  );
}

export default function StaffCategoryPage({ category }: { category: StaffCategory }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const meta = CATEGORY_META[category] || CATEGORY_META.doctor;
  const Icon = meta.icon;

  const { data, isLoading } = useStaffList(category, { page, limit: PAGE_SIZE, search: debouncedSearch });
  const deleteMutation = useDeleteStaff();
  const { data: editingStaff, isLoading: isLoadingStaff } = useStaffMember(category, editingId ?? 0);

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
        <div className="plat-search-wrap" style={{ flex: '1 1 300px' }}>
          <Search className="plat-search-icon" size={14} />
          <input className="plat-form-input plat-search-input" placeholder="Search registry..." value={search} onChange={(e) => handleSearchChange(e.target.value)} />
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty"><p className="plat-empty-text">Loading...</p></div>
        ) : staff.length === 0 ? (
          <div className="plat-empty"><Icon size={40} className="plat-empty-icon" /><p className="plat-empty-text">No records found.</p></div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead><tr><th>#</th><th>Identity Profile</th><th>Contact Details</th><th>Professional Role</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {staff.map((s: StaffSummary, i: number) => (
                  <tr key={s.id} className="plat-table-row">
                    <td data-label="#" className="plat-mono-data text-xs" style={{ width: 40 }}>
                      <div>{(page - 1) * PAGE_SIZE + i + 1}</div>
                    </td>
                    <td data-label="Profile">
                      <div className="plat-cell-val">
                        <div className="font-bold plat-capitalize" style={{ fontSize: '13.5px', color: 'var(--pp-ink)' }}>{s.name}</div>
                        <div className="text-[10px] uppercase tracking-wider font-bold opacity-60" style={{ color: s.gender === 'Female' ? '#db2777' : 'var(--pp-blue)' }}>{s.gender || 'Unknown'}</div>
                      </div>
                    </td>
                    <td data-label="Contact">
                      <div className="plat-cell-val">
                        <div className="font-mono text-sm" style={{ fontWeight: 600 }}>{s.mobile}</div>
                        <div className="text-[11px] color-muted font-medium plat-capitalize">{s.email || 'No email registered'}</div>
                      </div>
                    </td>
                    <td data-label="Role">
                      <div className="plat-cell-val">
                        <div className="font-semibold text-xs plat-capitalize">{s.designation || 'General Staff'}</div>
                        <div className="text-[10px] color-muted font-medium flex items-center gap-1">
                          <MapPin size={10} /> {s.city || 'Station N/A'}
                        </div>
                      </div>
                    </td>
                    <td data-label="Status">
                      <div className="plat-cell-val">
                        <span className={s.isActive ? 'plat-badge plat-badge-info' : 'plat-badge plat-badge-default'}>
                          {s.isActive ? (
                            <span className="flex items-center gap-1">
                              <UserCheck size={10} /> Active
                            </span>
                          ) : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td data-label="Actions">
                      <div className="plat-cell-val">
                        <div className="flex justify-end gap-2" style={{ width: '100%' }}>
                          <button className="plat-btn plat-btn-icon plat-btn-ghost" style={{ width: 36, height: 36, borderRadius: 10 }} onClick={() => handleEdit(s)}>
                            <Edit2 size={13} />
                          </button>
                          <button className="plat-btn plat-btn-icon plat-btn-danger" style={{ width: 36, height: 36, borderRadius: 10 }} onClick={() => handleDelete(s.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && <StaffModal category={category} mode={editingId ? 'edit' : 'create'} staff={editingStaff} isLoading={isLoadingStaff} onClose={() => { setModalOpen(false); setEditingId(null); }} onSuccess={() => setEditingId(null)} />}
      <style>{mobileStyles}</style>
    </div>
  );
}
