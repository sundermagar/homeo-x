import React, { useMemo, useState } from 'react';
import { MapPin, Plus, X, RefreshCw, Trash2, Edit2, Phone, Mail, User, Briefcase, Calendar, Info, Search, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispensaries, useCreateDispensary, useUpdateDispensary, useDeleteDispensary } from '../hooks/use-settings';
import { Drawer } from '@/shared/components/drawer';
import { NumericInput } from '@/shared/components/NumericInput';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';

interface Dispensary {
  id: number;
  name: string;
  email?: string;
  gender?: string;
  mobile?: string;
  mobile2?: string;
  location?: string;
  city?: string;
  address?: string;
  about?: string;
  designation?: string;
  dept?: string;
  dateBirth?: string;
  contactNumber?: string;
  isActive?: boolean;
}

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  gender: 'Male',
  mobile: '',
  mobile2: '',
  location: '',
  city: '',
  address: '',
  about: '',
  designation: '',
  dept: '',
  dateBirth: '',
  contactNumber: '',
  isActive: true
};

export default function DispensariesPage() {
  const { data: dispensaries = [], isLoading } = useDispensaries();
  const createDisp = useCreateDispensary();
  const updateDisp = useUpdateDispensary();
  const deleteDisp = useDeleteDispensary();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => dispensaries.filter((d: Dispensary) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.email && d.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.city && d.city.toLowerCase().includes(searchQuery.toLowerCase()))
  ), [dispensaries, searchQuery]);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(filteredItems);

  const activeStaffCount = useMemo(() => dispensaries.filter((d: Dispensary) => d.isActive).length, [dispensaries]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (disp: Dispensary) => {
    setEditingId(disp.id || null);
    setForm({
      name: disp.name || '',
      email: disp.email || '',
      password: '',
      gender: disp.gender || 'Male',
      mobile: disp.mobile || '',
      mobile2: disp.mobile2 || '',
      location: disp.location || '',
      city: disp.city || '',
      address: disp.address || '',
      about: disp.about || '',
      designation: disp.designation || '',
      dept: disp.dept || '',
      dateBirth: disp.dateBirth ? disp.dateBirth.substring(0, 10) : '',
      contactNumber: disp.contactNumber || '',
      isActive: disp.isActive ?? true
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDisp.mutateAsync({ id: editingId, ...form });
      } else {
        await createDisp.mutateAsync(form);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('[DispensaryOrder] Submission Error', err);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Permanently remove pharmacist "${name}"? Access will be revoked immediately.`)) return;
    await deleteDisp.mutateAsync(id);
  };

  return (
    <div className="plat-page fade-in">


      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <ShieldCheck size={20} className="color-primary" />
            Pharmacy & Dispensary Registry
          </h1>
          <p className="plat-header-sub">Manage pharmaceutical staff, access credentials, and station assignments.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} /> Add Staff Account
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <p className="plat-stat-label">Total Staff</p>
          <p className="plat-stat-value plat-stat-value-primary">{dispensaries.length}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Active Presence</p>
          <p className="plat-stat-value plat-stat-value-success">{activeStaffCount}</p>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={14} className="plat-search-icon" />
          <input
            className="plat-form-input plat-search-input"
            placeholder="Search by name, identity, or city station..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : filteredItems.length === 0 ? (
          <EmptyState 
            icon={MapPin}
            title={searchQuery ? "No matches found" : "No dispensary staff found"}
            description={searchQuery ? `No pharmacy staff matching "${searchQuery}" were found.` : "Register your first pharmacy staff member to begin managing clinical dispensaries."}
            actionLabel={searchQuery ? "Clear Search" : "Add Staff Account"}
            onAction={searchQuery ? () => setSearchQuery('') : handleOpenCreate}
            variant="card"
            className="my-8"
          />
        ) : (
          <>
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Identity Profile</th>
                  <th>Contact Details</th>
                  <th>Station & Role</th>
                  <th style={{ width: '100px' }}>Access</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((disp: Dispensary, index: number) => (
                  <tr key={disp.id} className="plat-table-row">
                    <td className="plat-table-cell color-muted font-mono text-xs">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="plat-table-cell">
                      <div className="font-bold text-[14px]">{disp.name}</div>
                      <div className="text-[11px] color-muted flex items-center gap-1 italic">
                        <User size={10} className="opacity-60" /> {disp.gender || 'Not Specified'}
                      </div>
                    </td>
                    <td className="plat-table-cell">
                      <div className="flex flex-col gap-1">
                        {disp.email && <div className="text-[11px] font-mono flex items-center gap-1.5"><Mail size={12} className="color-muted" /> {disp.email}</div>}
                        {disp.mobile && <div className="text-[11px] font-mono flex items-center gap-1.5"><Phone size={12} className="color-muted" /> {disp.mobile}</div>}
                      </div>
                    </td>
                    <td className="plat-table-cell">
                      <div className="font-bold text-[12px]">{disp.designation || 'Staff'}</div>
                      <div className="text-[10px] color-muted uppercase font-black flex items-center gap-1">
                        <MapPin size={10} /> {disp.city || 'Station N/A'}
                      </div>
                    </td>
                    <td className="plat-table-cell">
                      <span className={`plat-badge ${disp.isActive ? 'plat-badge-primary' : 'plat-badge-default'}`}>
                        {disp.isActive ? 'Authorized' : 'Suspended'}
                      </span>
                    </td>
                    <td className="plat-table-cell">
                      <div className="flex justify-end gap-2">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(disp)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(disp.id, disp.name)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '20px' }}>
            <Pagination
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onLimitChange={setItemsPerPage}
          />
          </div>
          </>
        )}
      </div>

      <Drawer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Modify Access Credentials' : 'Register New Pharmacy Account'}
        maxWidth="640px"
      >
        <form onSubmit={handleSubmit}>
          <div className="plat-modal-body" style={{ padding: 0 }}>
            <div className="plat-form-section" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
              <div className="plat-form-grid-multi" style={{ gridTemplateColumns: '1fr' }}>
                <div className="plat-form-group">
                  <label className="plat-form-label">Full Account Name *</label>
                  <input
                    className="plat-form-input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    placeholder="e.g. Pharmacy Manager"
                  />
                </div>
              </div>

              <div className="plat-form-grid-multi mt-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="plat-form-group">
                  <label className="plat-form-label">Official Email</label>
                  <div className="plat-input-wrapper">
                    <Mail size={14} className="plat-input-icon" />
                    <input
                      type="email"
                      className="plat-form-input"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="email@clinic.com"
                    />
                  </div>
                </div>

                {!editingId && (
                  <div className="plat-form-group">
                    <label className="plat-form-label">Initial Password *</label>
                    <div className="plat-input-wrapper">
                      <ShieldCheck size={14} className="plat-input-icon" />
                      <input
                        type="password"
                        className="plat-form-input"
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        required={!editingId}
                        placeholder="Security credential"
                      />
                    </div>
                  </div>
                )}

                <div className="plat-form-group">
                  <label className="plat-form-label">Gender</label>
                  <select
                    className="plat-form-input"
                    value={form.gender}
                    onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="plat-form-group">
                  <label className="plat-form-label">Primary Mobile</label>
                  <div className="plat-input-wrapper">
                    <Phone size={14} className="plat-input-icon" />
                    <NumericInput
                      className="plat-form-input"
                      name="mobile"
                      value={form.mobile}
                      onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                      placeholder="Contact number"
                    />
                  </div>
                </div>

                <div className="plat-form-group">
                  <label className="plat-form-label">Station City</label>
                  <div className="plat-input-wrapper">
                    <MapPin size={14} className="plat-input-icon" />
                    <input
                      className="plat-form-input"
                      value={form.city}
                      onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      placeholder="City assigned"
                    />
                  </div>
                </div>

                <div className="plat-form-group">
                  <label className="plat-form-label">Designation</label>
                  <div className="plat-input-wrapper">
                    <Briefcase size={14} className="plat-input-icon" />
                    <input
                      className="plat-form-input"
                      value={form.designation}
                      onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                      placeholder="e.g. Pharmacist In-Charge"
                    />
                  </div>
                </div>
              </div>

              <label className="plat-checkbox-group">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                />
                <span className="plat-checkbox-label">Authorized for System Access</span>
              </label>
            </div>
          </div>
          <div className="plat-modal-footer" style={{ padding: '24px 0 0 0', marginTop: '24px' }}>
            <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="plat-btn plat-btn-primary" disabled={createDisp.isPending || updateDisp.isPending}>
              {editingId ? 'Save Profile' : 'Register Account'}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
