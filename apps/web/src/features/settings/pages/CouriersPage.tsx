import React, { useState } from 'react';
import { Truck, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2, Phone, User, Globe } from 'lucide-react';
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
            <Truck size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Courier Services
          </h1>
          <p className="plat-header-sub">Manage shipping partners and tracking integration for medicine delivery.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} strokeWidth={1.6} />
            Add Courier
          </button>
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty">
            <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
          </div>
        ) : couriers.length === 0 ? (
          <div className="plat-empty">
            <Truck size={28} className="plat-empty-icon" />
            <p className="plat-empty-text">No courier partners defined.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="plat-table">
              <thead>
                <tr>
                  <th>Courier Name</th>
                  <th>Contact Person</th>
                  <th>Phone No</th>
                  <th>Tracking Link</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {couriers.map((c: any) => (
                  <tr key={c.id}>
                    <td className="font-semibold">{c.name}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <User size={12} className="color-muted" />
                        {c.contactPerson || '—'}
                      </div>
                    </td>
                    <td className="font-mono">
                      <div className="flex items-center gap-2">
                        <Phone size={12} className="color-muted" />
                        {c.phone || '—'}
                      </div>
                    </td>
                    <td className="max-w-[150px] truncate">
                      {c.trackingUrl ? (
                         <a href={c.trackingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 color-primary text-xs underline">
                            <Globe size={12} />
                            View Site
                         </a>
                      ) : '—'}
                    </td>
                    <td>
                       <span className={`plat-badge ${c.isActive ? 'plat-badge-staff' : 'plat-badge-default'}`}>
                         {c.isActive ? 'Active' : 'Inactive'}
                       </span>
                    </td>
                    <td>
                      <div className="flex gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(c)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(c.id, c.name)}>
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

      {isModalOpen && (
        <div className="plat-modal-overlay fade-in" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="plat-modal" style={{ maxWidth: '450px' }}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">{editingId ? 'Edit Courier' : 'Add Courier'}</h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="plat-modal-body plat-form">
              <div className="plat-form-group plat-form-full">
                <label className="plat-form-label">Courier Name <span className="plat-form-required">*</span></label>
                <input 
                  className="plat-form-input" 
                  value={form.name} 
                  onChange={e => setForm(f => ({...f, name: e.target.value}))}
                  required 
                  placeholder="e.g. BlueDart, DTDC, FedEx"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="plat-form-group">
                  <label className="plat-form-label">Contact Person</label>
                  <input 
                    className="plat-form-input" 
                    value={form.contactPerson} 
                    onChange={e => setForm(f => ({...f, contactPerson: e.target.value}))}
                    placeholder="Billing / Ops contact"
                  />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Phone Number</label>
                  <input 
                    className="plat-form-input" 
                    value={form.phone} 
                    onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                    placeholder="+91 00000 00000"
                  />
                </div>
              </div>
              <div className="plat-form-group plat-form-full">
                <label className="plat-form-label">Tracking Base URL</label>
                <input 
                  className="plat-form-input" 
                  value={form.trackingUrl} 
                  onChange={e => setForm(f => ({...f, trackingUrl: e.target.value}))}
                  placeholder="https://tracker.service.com/..."
                />
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
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createCourier.isPending || updateCourier.isPending}>
                  {editingId ? 'Save Changes' : 'Create Courier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
