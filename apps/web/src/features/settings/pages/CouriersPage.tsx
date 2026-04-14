import React, { useState } from 'react';
import { Truck, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2, Phone, User, Globe, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCouriers, useCreateCourier, useUpdateCourier, useDeleteCourier } from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

const EMPTY_FORM = { name: '', contactPerson: '', phone: '', trackingUrl: '', isActive: true };

export default function CouriersPage() {
  const { data: couriers = [], isLoading } = useCouriers();
  const createCourier = useCreateCourier();
  const updateCourier = useUpdateCourier();
  const deleteCourier = useDeleteCourier();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = couriers.filter((c: any) => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.contactPerson && c.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (courier: any) => {
    setEditingId(courier.id);
    setForm({ 
      name: courier.name, 
      contactPerson: courier.contactPerson || '', 
      phone: courier.phone || '',
      trackingUrl: courier.trackingUrl || '',
      isActive: courier.isActive ?? true 
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[CourierForm] Submit', { editingId, form });
    if (editingId) {
      await updateCourier.mutateAsync({ id: editingId, ...form });
    } else {
      await createCourier.mutateAsync(form);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete courier provider "${name}"?`)) return;
    await deleteCourier.mutateAsync(id);
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
            <Truck size={20} className="color-primary" />
            Courier Services
          </h1>
          <p className="plat-header-sub">Manage shipping partners and tracking integration for medicine delivery.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} />
            Add Courier
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <span className="plat-stat-label">Courier Partners</span>
          <span className="plat-stat-value">{couriers.length}</span>
        </div>
        <div className="plat-stat-card">
          <span className="plat-stat-label">Active Services</span>
          <span className="plat-stat-value plat-stat-value-success">
            {couriers.filter((c: any) => c.isActive).length}
          </span>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={16} className="plat-search-icon" />
          <input 
            className="plat-filter-input plat-search-input"
            placeholder="Search providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty">
            <RefreshCw size={22} className="animate-spin opacity-30" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="plat-empty">
            <Truck size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No courier partners found.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th>Courier Name</th>
                  <th>Contact Information</th>
                  <th>Tracking Link</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((c: any) => (
                  <tr key={c.id} className="plat-table-row">
                    <td data-label="Courier Name" className="plat-table-cell font-semibold">{c.name}</td>
                    <td data-label="Contact" className="plat-table-cell">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2"><User size={12} className="color-muted" /> {c.contactPerson || '—'}</div>
                        <div className="flex items-center gap-2 font-mono"><Phone size={12} className="color-muted" /> {c.phone || '—'}</div>
                      </div>
                    </td>
                    <td data-label="Tracking" className="plat-table-cell">
                      {c.trackingUrl ? (
                         <a href={c.trackingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 color-primary text-xs underline">
                            <Globe size={12} /> View Tracking Portal
                         </a>
                      ) : 'Manual Tracking Only'}
                    </td>
                    <td data-label="Status" className="plat-table-cell">
                       <span className={`plat-badge ${c.isActive ? 'plat-badge-staff' : 'plat-badge-default'}`}>
                         {c.isActive ? 'Active' : 'Inactive'}
                       </span>
                    </td>
                    <td className="plat-table-cell">
                      <div className="flex justify-end gap-2">
                        <button className="plat-btn plat-btn-icon" onClick={() => handleOpenEdit(c)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="plat-btn plat-btn-icon plat-btn-danger" onClick={() => handleDelete(c.id, c.name)}>
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
          <div className="plat-modal" style={{ maxWidth: '450px' }}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">{editingId ? 'Edit Courier' : 'Add Courier'}</h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="plat-modal-form">
              <div className="plat-modal-body">
                <div className="plat-form">
                  <div className="plat-form-group plat-form-full">
                    <label className="plat-form-label">Courier Name *</label>
                    <div className="plat-input-wrapper">
                      <Truck size={16} className="plat-input-icon" />
                      <input 
                        className="plat-form-input" 
                        value={form.name} 
                        onChange={e => setForm(f => ({...f, name: e.target.value}))}
                        required 
                        placeholder="e.g. BlueDart, DTDC, FedEx"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="plat-form-group">
                      <label className="plat-form-label">Contact Person</label>
                      <div className="plat-input-wrapper">
                        <User size={16} className="plat-input-icon" />
                        <input 
                          className="plat-form-input" 
                          value={form.contactPerson} 
                          onChange={e => setForm(f => ({...f, contactPerson: e.target.value}))}
                          placeholder="Billing / Ops contact"
                        />
                      </div>
                    </div>
                    <div className="plat-form-group">
                      <label className="plat-form-label">Phone Number</label>
                      <div className="plat-input-wrapper">
                        <Phone size={16} className="plat-input-icon" />
                        <input 
                          className="plat-form-input" 
                          value={form.phone} 
                          onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                          placeholder="+91 00000 00000"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="plat-form-group plat-form-full">
                    <label className="plat-form-label">Tracking Base URL</label>
                    <div className="plat-input-wrapper">
                      <Globe size={16} className="plat-input-icon" />
                      <input 
                        className="plat-form-input" 
                        value={form.trackingUrl} 
                        onChange={e => setForm(f => ({...f, trackingUrl: e.target.value}))}
                        placeholder="https://tracker.service.com/..."
                      />
                    </div>
                  </div>

                  <div className="plat-form-group plat-form-full plat-form-row">
                    <input 
                       type="checkbox" 
                       className="plat-form-input"
                       id="is_active"
                       checked={form.isActive} 
                       onChange={e => setForm(f => ({...f, isActive: e.target.checked}))}
                    />
                    <label htmlFor="is_active" className="plat-form-label cursor-pointer">Courier is Active</label>
                  </div>
                </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createCourier.isPending || updateCourier.isPending}>
                  {editingId ? 'Update Courier' : 'Add Courier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
