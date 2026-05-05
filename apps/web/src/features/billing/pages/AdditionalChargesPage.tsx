import React, { useState } from 'react';
import { PlusCircle, X, RefreshCw, Trash2, Edit2, Search, Receipt } from 'lucide-react';
import { useAdditionalCharges, useCreateAdditionalCharge, useUpdateAdditionalCharge, useDeleteAdditionalCharge } from '../hooks/use-accounts';
import { usePatient } from '../../patients/hooks/use-patients';
import type { AdditionalChargeWithPatient } from '@mmc/types';
import type { CreateAdditionalChargeInput } from '@mmc/validation';
import { Pagination } from '@/shared/components/Pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { Drawer } from '@/shared/components/drawer';
import '../styles/billing.css';
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const query = { page, limit: 10, regid: regidFilter ? parseInt(regidFilter, 10) : undefined };
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

  const handleDelete = async (e: React.MouseEvent, id: number, name: string) => {
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
      alert('Failed to delete charge: ' + (err.response?.data?.error || err.message));
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="pp-page-container plat-page animate-fade-in">
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
          <TableSkeleton rows={8} columns={7} />
        ) : filtered.length === 0 ? (
          <div className="plat-empty">
            <PlusCircle size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No additional charges found.</p>
          </div>
        ) : (
          <div className="plat-table-container" style={{ boxShadow: 'var(--pp-premium-shadow)' }}>
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
                    <td data-label="ID" style={{ fontFamily: 'var(--pp-font-mono)' }}>
                      <div>#{c.id}</div>
                    </td>
                    <td data-label="Patient" style={{ fontWeight: 500 }}>
                      <div>{c.patientName || `Reg ID: ${c.regid}` || '—'}</div>
                    </td>
                    <td data-label="Name">
                      <div>{c.additionalName}</div>
                    </td>
                    <td data-label="Qty" style={{ fontFamily: 'var(--pp-font-mono)' }}>
                      <div className="plat-cell-val">{c.additionalQuantity}</div>
                    </td>
                    <td data-label="Price" style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 600 }}>
                      <div className="plat-cell-val">₹{c.additionalPrice.toLocaleString()}</div>
                    </td>
                    <td data-label="Received" style={{ fontFamily: 'var(--pp-font-mono)', color: 'var(--pp-success-fg)' }}>
                      <div className="plat-cell-val">₹{c.receivedPrice.toLocaleString()}</div>
                    </td>
                    <td data-label="Actions">
                      <div className="plat-cell-val">
                        <div className="flex justify-end gap-3" style={{ width: '100%' }}>
                          <button className="plat-btn plat-btn-sm plat-btn-icon" style={{ width: 36, height: 36, borderRadius: 10 }} onClick={() => handleOpenEdit(c)}>
                            <Edit2 size={13} />
                          </button>
                          <button type="button" className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" style={{ width: 36, height: 36, borderRadius: 10 }} onClick={(e) => handleDelete(e, c.id, c.additionalName ?? '')}>
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

      <Pagination
        totalItems={total}
        itemsPerPage={10}
        currentPage={page}
        onPageChange={(p) => setPage(p)}
        onLimitChange={() => {}}
      />

      <Drawer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Charge' : 'Add Additional Charge'}
        maxWidth="500px"
      >
        <form onSubmit={handleSubmit} className="plat-form">
          <div className="plat-form-group">
            <label className="plat-form-label">Patient Reg ID</label>
            <input 
              className="plat-form-input" 
              type="number" 
              value={form.regid ?? ''} 
              onChange={e => setForm(f => ({ ...f, regid: e.target.value ? parseInt(e.target.value) : undefined }))} 
              style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--pp-font-mono)' }}
            />
            <PatientPreview regid={form.regid} />
          </div>
          
          <div className="plat-form-group plat-form-full">
            <label className="plat-form-label">Charge Name <span className="plat-form-required">*</span></label>
            <select 
              className="plat-form-input" 
              value={form.additionalName} 
              onChange={e => setForm(f => ({ ...f, additionalName: e.target.value }))} 
              required
              style={{ height: 44, borderRadius: 10 }}
            >
              <option value="">Select Charge Type...</option>
              <option value="Courier Charges">Courier Charges</option>
              <option value="Consultation Fees">Consultation Fees</option>
              <option value="Medicine Charges">Medicine Charges</option>
              <option value="Registration Fees">Registration Fees</option>
              <option value="Miscellaneous">Miscellaneous</option>
            </select>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="plat-form-group">
              <label className="plat-form-label">Price (₹)</label>
              <input 
                className="plat-form-input" 
                type="number" 
                min={0} 
                value={form.additionalPrice} 
                onChange={e => setForm(f => ({ ...f, additionalPrice: Number(e.target.value) }))} 
                style={{ fontWeight: 800, fontFamily: 'var(--pp-font-mono)' }}
              />
            </div>
            <div className="plat-form-group">
              <label className="plat-form-label">Quantity</label>
              <input 
                className="plat-form-input" 
                type="number" 
                min={1} 
                value={form.additionalQuantity} 
                onChange={e => setForm(f => ({ ...f, additionalQuantity: Number(e.target.value) }))} 
                style={{ fontFamily: 'var(--pp-font-mono)' }}
              />
            </div>
          </div>
          
          <div className="plat-form-group">
            <label className="plat-form-label">Received Amount (₹)</label>
            <input 
              className="plat-form-input" 
              type="number" 
              min={0} 
              value={form.receivedPrice} 
              onChange={e => setForm(f => ({ ...f, receivedPrice: Number(e.target.value) }))} 
              style={{ fontWeight: 800, color: 'var(--pp-blue)', fontFamily: 'var(--pp-font-mono)' }}
            />
          </div>

          <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
            <button type="button" className="plat-btn" style={{ flex: 1, height: 48, borderRadius: 14 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button 
              type="submit" 
              className="plat-btn plat-btn-primary" 
              style={{ flex: 2, height: 48, borderRadius: 14 }}
              disabled={createCharge.isPending || updateCharge.isPending}
            >
              {editingId ? 'Save Changes' : 'Add Charge'}
            </button>
          </div>
        </form>
      </Drawer>
      {deleteConfirmId && (
        <div className="plat-modal-overlay animate-fade-in" style={{ zIndex: 1100 }}>
          <div className="plat-modal" style={{ maxWidth: 400 }}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">Confirm Deletion</h2>
            </div>
            <div className="plat-modal-body">
              <p style={{ margin: 0, color: 'var(--pp-text-2)', fontSize: '13px' }}>
                Are you sure you want to delete this additional charge entry? This action cannot be undone.
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

function PatientPreview({ regid }: { regid?: number }) {
  const { data: patient, isLoading, isError } = usePatient(regid ?? 0);
  if (!regid) return null;
  if (isLoading) return <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>Checking ID...</div>;
  if (isError || !patient) return <div style={{ fontSize: '11px', color: 'var(--pp-danger-fg)', marginTop: 4 }}>Patient not found</div>;
  return (
    <div style={{ fontSize: '11px', color: 'var(--pp-success-fg)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, background: 'var(--pp-success-bg)', padding: '4px 8px', borderRadius: '4px', width: 'fit-content' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
      Patient Found: <strong>{patient.firstName} {patient.lastName}</strong>
    </div>
  );
}