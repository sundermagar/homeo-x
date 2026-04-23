import React, { useState } from 'react';
import { PlusCircle, X, RefreshCw, Trash2, Edit2, Search, Calendar } from 'lucide-react';
import { useDayCharges, useCreateDayCharge, useUpdateDayCharge, useDeleteDayCharge } from '../hooks/use-accounts';
import type { DayCharge } from '@mmc/types';
import type { CreateDayChargeInput } from '@mmc/validation';
import '../../platform/styles/platform.css';

const EMPTY_FORM = { days: '', regularCharges: 0 };

export default function DayChargesPage() {
  const { data: charges = [], isLoading } = useDayCharges();
  const createCharge = useCreateDayCharge();
  const updateCharge = useUpdateDayCharge();
  const deleteCharge = useDeleteDayCharge();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const filtered = charges.filter(c =>
    !search || (c.days ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (charge: DayCharge) => {
    setEditingId(charge.id);
    setForm({ days: charge.days ?? '', regularCharges: charge.regularCharges ?? 0 });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateCharge.mutateAsync({ id: editingId, ...form });
    } else {
      await createCharge.mutateAsync(form as CreateDayChargeInput);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteCharge.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert('Failed to delete day charge: ' + (err.response?.data?.error || err.message));
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="plat-page animate-fade-in">
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Calendar size={20} className="color-primary" />
            Day Charges
          </h1>
          <p className="plat-header-sub">Configure duration-based pricing for treatments.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <PlusCircle size={14} />
            Add Day Charge
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <span className="plat-stat-label">Charge Plans</span>
          <span className="plat-stat-value">{charges.length}</span>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={16} className="plat-search-icon" />
          <input className="plat-filter-input plat-search-input" placeholder="Search by days..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty"><RefreshCw size={22} className="animate-spin opacity-30" /></div>
        ) : filtered.length === 0 ? (
          <div className="plat-empty">
            <Calendar size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No day charges configured. Add your first plan.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>ID</th>
                  <th>Duration (Days)</th>
                  <th style={{ width: 150 }}>Charges</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td data-label="ID" style={{ fontFamily: 'var(--pp-font-mono)' }}>#{c.id}</td>
                    <td data-label="Days" style={{ fontWeight: 500 }}>{c.days}</td>
                    <td data-label="Charges" style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 600 }}>₹{(c.regularCharges ?? 0).toLocaleString()}</td>
                    <td>
                      <div className="flex justify-end gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(c)}>
                          <Edit2 size={13} />
                        </button>
                        <button type="button" className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={(e) => handleDelete(e, c.id)}>
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
        <div className="plat-modal-overlay animate-fade-in" onClick={e => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="plat-modal" style={{ maxWidth: 450 }}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">{editingId ? 'Edit Day Charge' : 'Add Day Charge Plan'}</h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="plat-modal-body plat-form">
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Duration (Days) <span className="plat-form-required">*</span></label>
                  <input className="plat-form-input" value={form.days} onChange={e => setForm(f => ({ ...f, days: e.target.value }))} required placeholder="e.g. 1 day, 5 days, 2 weeks" />
                </div>
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Charges (₹) <span className="plat-form-required">*</span></label>
                  <input className="plat-form-input" type="number" min={0} value={form.regularCharges} onChange={e => setForm(f => ({ ...f, regularCharges: Number(e.target.value) }))} required />
                </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createCharge.isPending || updateCharge.isPending}>
                  {editingId ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteConfirmId && (
        <div className="plat-modal-overlay animate-fade-in" style={{ zIndex: 1100 }}>
          <div className="plat-modal" style={{ maxWidth: 400 }}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">Confirm Deletion</h2>
            </div>
            <div className="plat-modal-body">
              <p style={{ margin: 0, color: 'var(--pp-text-2)', fontSize: '13px' }}>
                Are you sure you want to delete this day charge plan? This action cannot be undone.
              </p>
            </div>
            <div className="plat-modal-footer">
              <button type="button" className="plat-btn" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
              <button type="button" className="plat-btn plat-btn-danger" onClick={confirmDelete} disabled={deleteCharge.isPending}>
                {deleteCharge.isPending ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}