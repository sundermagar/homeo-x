import React, { useState } from 'react';
import { MapPin, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2, Phone, Mail, User, Briefcase, Calendar, Info, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispensaries, useCreateDispensary, useUpdateDispensary, useDeleteDispensary } from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

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

  const filteredItems = dispensaries.filter((d: any) => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.email && d.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.city && d.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (disp: any) => {
    setEditingId(disp.id || null);
    setForm({ 
      name: disp.name || '', 
      email: disp.email || '',
      password: '', // sensitive
      gender: disp.gender || 'Male',
      mobile: disp.mobile || '',
      mobile2: disp.mobile2 || '',
      location: disp.location || '', 
      city: disp.city || '',
      address: disp.address || '',
      about: disp.about || '',
      designation: disp.designation || '',
      dept: disp.dept || '',
      dateBirth: disp.dateBirth ? new Date(disp.dateBirth).toISOString().split('T')[0] || '' : '',
      contactNumber: disp.contactNumber || '', 
      isActive: disp.isActive ?? true 
    });
    setIsModalOpen(true);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateDisp.mutateAsync({ id: editingId, ...form });
    } else {
      await createDisp.mutateAsync(form);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete dispensary "${name}"?`)) return;
    await deleteDisp.mutateAsync(id);
  };

  return (
    <div className="plat-page fade-in">
      <Link to="/settings" className="settings-back-link">
        <ArrowLeft size={14} />
        Back to Settings
      </Link>

      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <MapPin size={20} className="color-primary" />
            Dispensaries
          </h1>
          <p className="plat-header-sub">Manage pharmacy staff and dispensary account information.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} />
            Add Dispensary
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <span className="plat-stat-label">Total Dispensaries</span>
          <span className="plat-stat-value">{dispensaries.length}</span>
        </div>
        <div className="plat-stat-card">
          <span className="plat-stat-label">Active Staff</span>
          <span className="plat-stat-value plat-stat-value-success">
            {dispensaries.filter((d: any) => d.isActive).length}
          </span>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={16} className="plat-search-icon" />
          <input 
            className="plat-filter-input plat-search-input"
            placeholder="Search by name, email or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty">
            <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="plat-empty">
            <MapPin size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No dispensaries found matching search.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Staff Name</th>
                  <th>Contact Information</th>
                  <th>Professional Details</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((disp: any, index: number) => (
                  <tr key={disp.id} className="plat-table-row">
                    <td data-label="ID" className="plat-table-cell font-mono text-xs color-muted">{index + 1}</td>
                    <td data-label="Staff Name" className="plat-table-cell">
                      <div className="font-semibold">{disp.name}</div>
                      <div className="text-xs color-muted flex items-center gap-1">
                        <User size={10} /> {disp.gender}
                      </div>
                    </td>
                    <td data-label="Contact" className="plat-table-cell">
                      <div className="flex flex-col gap-1">
                        {disp.email && <div className="text-xs flex items-center gap-1.5"><Mail size={12} className="color-muted" /> {disp.email}</div>}
                        {(disp.mobile || disp.contactNumber) && (
                          <div className="text-xs flex items-center gap-1.5 font-mono">
                            <Phone size={12} className="color-muted" /> {disp.mobile || disp.contactNumber}
                          </div>
                        )}
                        {disp.city && <div className="text-xs flex items-center gap-1.5 color-muted"><MapPin size={12} /> {disp.city}</div>}
                      </div>
                    </td>
                    <td data-label="Professional" className="plat-table-cell">
                      <div className="flex flex-col gap-1">
                        {disp.designation && <div className="text-xs font-medium">{disp.designation}</div>}
                        {disp.dept && <div className="text-[10px] color-muted font-bold uppercase tracking-wider">{disp.dept}</div>}
                      </div>
                    </td>
                    <td data-label="Status" className="plat-table-cell">
                       <span className={`plat-badge ${disp.isActive ? 'plat-badge-staff' : 'plat-badge-default'}`}>
                         {disp.isActive ? 'Active' : 'Inactive'}
                       </span>
                    </td>
                    <td className="plat-table-cell">
                      <div className="flex justify-end gap-2">
                        <button className="plat-btn plat-btn-icon" onClick={() => handleOpenEdit(disp)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="plat-btn plat-btn-icon plat-btn-danger" onClick={() => handleDelete(disp.id, disp.name)}>
                          <Trash2 size={14} />
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

      {isModalOpen && (
        <div className="plat-modal-overlay fade-in" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="plat-modal" style={{ maxWidth: '800px' }}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">
                {editingId ? 'Edit Dispensary Details' : 'Add New Dispensary'}
              </h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="plat-modal-form">
              <div className="plat-modal-body">
                <div className="plat-form">
                  <div className="plat-form-group plat-form-full">
                    <label className="plat-form-label">Full Name <span className="plat-form-required">*</span></label>
                    <div className="plat-input-wrapper">
                      <User className="plat-input-icon" size={14} />
                      <input 
                        className="plat-form-input" 
                        value={form.name} 
                        onChange={e => setForm(f => ({...f, name: e.target.value}))}
                        required 
                        placeholder="e.g. John Doe"
                      />
                    </div>
                  </div>

                  <div className="plat-form-group">
                    <label className="plat-form-label">Email Address</label>
                    <div className="plat-input-wrapper">
                      <Mail className="plat-input-icon" size={14} />
                      <input 
                        type="email"
                        className="plat-form-input" 
                        value={form.email} 
                        onChange={e => setForm(f => ({...f, email: e.target.value}))}
                        placeholder="e.g. john@example.com"
                      />
                    </div>
                  </div>

                  {!editingId && (
                    <div className="plat-form-group">
                      <label className="plat-form-label">Password <span className="plat-form-required">*</span></label>
                      <input 
                        type="password"
                        className="plat-form-input" 
                        value={form.password} 
                        onChange={e => setForm(f => ({...f, password: e.target.value}))}
                        required={!editingId}
                        placeholder="Min. 6 characters"
                        minLength={6}
                      />
                    </div>
                  )}

                  <div className="plat-form-group">
                    <label className="plat-form-label">Gender</label>
                    <select 
                      className="plat-form-input" 
                      value={form.gender} 
                      onChange={e => setForm(f => ({...f, gender: e.target.value}))}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="plat-form-group">
                    <label className="plat-form-label">Date of Birth</label>
                    <div className="plat-input-wrapper">
                      <Calendar className="plat-input-icon" size={14} />
                      <input 
                        type="date"
                        className="plat-form-input" 
                        value={form.dateBirth} 
                        onChange={e => setForm(f => ({...f, dateBirth: e.target.value}))}
                      />
                    </div>
                  </div>

                  <div className="plat-form-group">
                    <label className="plat-form-label">Primary Mobile</label>
                    <div className="plat-input-wrapper">
                      <Phone className="plat-input-icon" size={14} />
                      <input 
                        className="plat-form-input" 
                        value={form.mobile} 
                        onChange={e => setForm(f => ({...f, mobile: e.target.value}))}
                        placeholder="+91 9876543210"
                      />
                    </div>
                  </div>

                  <div className="plat-form-group">
                    <label className="plat-form-label">Alternate Mobile</label>
                    <div className="plat-input-wrapper">
                      <Phone className="plat-input-icon" size={14} />
                      <input 
                        className="plat-form-input" 
                        value={form.mobile2} 
                        onChange={e => setForm(f => ({...f, mobile2: e.target.value}))}
                        placeholder="+91 8888888888"
                      />
                    </div>
                  </div>

                  <div className="plat-form-group">
                    <label className="plat-form-label">City</label>
                    <div className="plat-input-wrapper">
                      <MapPin className="plat-input-icon" size={14} />
                      <input 
                        className="plat-form-input" 
                        value={form.city} 
                        onChange={e => setForm(f => ({...f, city: e.target.value}))}
                        placeholder="e.g. Mumbai"
                      />
                    </div>
                  </div>

                  <div className="plat-form-group">
                    <label className="plat-form-label">Designation</label>
                    <div className="plat-input-wrapper">
                      <Briefcase className="plat-input-icon" size={14} />
                      <input 
                        className="plat-form-input" 
                        value={form.designation} 
                        onChange={e => setForm(f => ({...f, designation: e.target.value}))}
                        placeholder="e.g. Senior Pharmacist"
                      />
                    </div>
                  </div>

                  <div className="plat-form-group">
                    <label className="plat-form-label">Department</label>
                    <div className="plat-input-wrapper">
                      <Briefcase className="plat-input-icon" size={14} />
                      <input 
                        className="plat-form-input" 
                        value={form.dept} 
                        onChange={e => setForm(f => ({...f, dept: e.target.value}))}
                        placeholder="e.g. Pharmacy"
                      />
                    </div>
                  </div>

                  <div className="plat-form-group plat-form-full">
                    <label className="plat-form-label">Full Address</label>
                    <textarea 
                      className="plat-form-input" 
                      style={{ height: '60px' }}
                      value={form.address} 
                      onChange={e => setForm(f => ({...f, address: e.target.value}))}
                      placeholder="Room, Street, Locality..."
                    />
                  </div>

                  <div className="plat-form-group plat-form-full">
                    <label className="plat-form-label">About / Bio</label>
                    <div className="plat-input-wrapper">
                      <Info className="plat-input-icon" size={14} style={{ top: '12px' }} />
                      <textarea 
                        className="plat-form-input" 
                        style={{ height: '60px', paddingLeft: '32px' }}
                        value={form.about} 
                        onChange={e => setForm(f => ({...f, about: e.target.value}))}
                        placeholder="Professional background, notes..."
                      />
                    </div>
                  </div>

                  <div className="plat-form-group plat-form-row plat-form-full">
                    <input 
                      type="checkbox" 
                      className="plat-form-input"
                      id="disp-active"
                      checked={form.isActive} 
                      onChange={e => setForm(f => ({...f, isActive: e.target.checked}))}
                    />
                    <label htmlFor="disp-active" className="plat-form-label mb-0 cursor-pointer">Account is active and can login</label>
                  </div>
                </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createDisp.isPending || updateDisp.isPending}>
                  {editingId ? 'Update Information' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

