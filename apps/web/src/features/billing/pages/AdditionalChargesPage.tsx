import React, { useState } from 'react';
import { PlusCircle, X, RefreshCw, Trash2, Edit2, Search, Receipt } from 'lucide-react';
import { useAdditionalCharges, useCreateAdditionalCharge, useUpdateAdditionalCharge, useDeleteAdditionalCharge } from '../hooks/use-accounts';
import type { AdditionalChargeWithPatient } from '@mmc/types';
import type { CreateAdditionalChargeInput } from '@mmc/validation';
import '../../platform/styles/platform.css';

const EMPTY_FORM = {
  regid: undefined as number | undefined,
  additionalName: '',
  additionalPrice: 0,
  additionalQuantity: 1,
  receivedPrice: 0,
};

export default function AdditionalChargesPage() {
  const [page, setPage] = useState(1);
  const [regidFilter, setRegidFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const query = { page, limit: 30, regid: regidFilter ? parseInt(regidFilter, 10) : undefined };
  const { data, isLoading } = useAdditionalCharges(query);
  const createCharge = useCreateAdditionalCharge();
  const updateCharge = useUpdateAdditionalCharge();
  const deleteCharge = useDeleteAdditionalCharge();

  const charges: AdditionalChargeWithPatient[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const filtered = charges.filter(c =>
    !search || (c.additionalName ?? '').toLowerCase().includes(search.toLowerCase()) ||
    c.patientName.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (charge: AdditionalChargeWithPatient) => {
    setEditingId(charge.id);
    setForm({
      regid: charge.regid ?? undefined,
      additionalName: charge.additionalName ?? '',
      additionalPrice: charge.additionalPrice,
      additionalQuantity: charge.additionalQuantity,
      receivedPrice: charge.receivedPrice,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateCharge.mutateAsync({ id: editingId, ...form });
      } else {
        await createCharge.mutateAsync(form as CreateAdditionalChargeInput);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Submission failed:', err);
      // The error is handled by the mutation's onError if configured, 
      // but we can also handle it here for direct UX feedback.
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete charge "${name}"?`)) return;
    await deleteCharge.mutateAsync(id);
  };

  return (
    <div className="plat-page animate-fade-in">
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <PlusCircle size={20} className="color-primary" />
            Additional Charges
          </h1>
          <p className="plat-header-sub">Manage extra services and charges for patient billing.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <PlusCircle size={14} />
            Add Charge
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <span className="plat-stat-label">Total Charges</span>
          <span className="plat-stat-value">{total}</span>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={16} className="plat-search-icon" />
          <input
            className="plat-filter-input plat-search-input"
            placeholder="Search charges..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <input
          type="text"
          className="plat-filter-input"
          style={{ width: 140, fontFamily: 'var(--pp-font-mono)', fontSize: '0.82rem' }}
          placeholder="Filter by Reg ID..."
          value={regidFilter}
          onChange={e => { setRegidFilter(e.target.value); setPage(1); }}
        />
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty"><RefreshCw size={22} className="animate-spin opacity-30" /></div>
        ) : filtered.length === 0 ? (
          <div className="plat-empty">
            <PlusCircle size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No additional charges found.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>ID</th>
                  <th>Patient</th>
                  <th>Charge Name</th>
                  <th style={{ width: 100 }}>Qty</th>
                  <th style={{ width: 110 }}>Price</th>
                  <th style={{ width: 110 }}>Received</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td data-label="ID" style={{ fontFamily: 'var(--pp-font-mono)' }}>#{c.id}</td>
                    <td data-label="Patient" style={{ fontWeight: 500 }}>{c.patientName || '—'}</td>
                    <td data-label="Name">{c.additionalName}</td>
                    <td data-label="Qty" style={{ fontFamily: 'var(--pp-font-mono)' }}>{c.additionalQuantity}</td>
                    <td data-label="Price" style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 600 }}>₹{c.additionalPrice.toLocaleString()}</td>
                    <td data-label="Received" style={{ fontFamily: 'var(--pp-font-mono)', color: 'var(--pp-success-fg)' }}>₹{c.receivedPrice.toLocaleString()}</td>
                    <td>
                      <div className="flex justify-end gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(c)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(c.id, c.additionalName ?? '')}>
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
          <div className="plat-modal" style={{ maxWidth: 500 }}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">{editingId ? 'Edit Charge' : 'Add Additional Charge'}</h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="plat-modal-body plat-form">
                <div className="plat-form-group">
                  <label className="plat-form-label">Patient Reg ID</label>
                  <input className="plat-form-input" type="number" value={form.regid ?? ''} onChange={e => setForm(f => ({ ...f, regid: e.target.value ? parseInt(e.target.value) : undefined }))} />
                </div>
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Charge Name <span className="plat-form-required">*</span></label>
                  <input className="plat-form-input" value={form.additionalName} onChange={e => setForm(f => ({ ...f, additionalName: e.target.value }))} required placeholder="e.g. Courier Charges, Consulting" />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Price</label>
                  <input className="plat-form-input" type="number" min={0} value={form.additionalPrice} onChange={e => setForm(f => ({ ...f, additionalPrice: Number(e.target.value) }))} />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Quantity</label>
                  <input className="plat-form-input" type="number" min={1} value={form.additionalQuantity} onChange={e => setForm(f => ({ ...f, additionalQuantity: Number(e.target.value) }))} />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Received</label>
                  <input className="plat-form-input" type="number" min={0} value={form.receivedPrice} onChange={e => setForm(f => ({ ...f, receivedPrice: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="plat-modal-footer">
                {(createCharge.error || updateCharge.error) && (
                  <div className="plat-form-error" style={{ marginRight: 'auto', fontSize: '0.8rem', color: 'var(--pp-danger-fg)' }}>
                    {((createCharge.error || updateCharge.error) as any)?.response?.data?.error || 'Validation failed'}
                  </div>
                )}
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createCharge.isPending || updateCharge.isPending}>
                  {editingId ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}