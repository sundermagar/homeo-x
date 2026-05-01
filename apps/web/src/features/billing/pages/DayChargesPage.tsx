import React, { useState } from 'react';
import { PlusCircle, X, RefreshCw, Trash2, Edit2, Search, Calendar } from 'lucide-react';
import { useDayCharges, useCreateDayCharge, useUpdateDayCharge, useDeleteDayCharge } from '../hooks/use-accounts';
import type { DayCharge } from '@mmc/types';
import type { CreateDayChargeInput } from '@mmc/validation';
import { Drawer } from '@/shared/components/drawer';
import { Pagination } from '@/shared/components/Pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import '../../platform/styles/platform.css';
import '../styles/billing.css';

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

  const [page, setPage] = useState(1);

  const filtered = charges.filter(c =>
    !search || (c.days ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * 10, page * 10);

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
    <div className="pp-page-container bill-page animate-fade-in">
      <div className="bill-header">
        <div>
          <h1 className="plat-header-title">
            <Calendar size={20} className="color-primary" />
            Day Charges
          </h1>
          <p className="plat-header-sub">Configure duration-based pricing for treatments.</p>
        </div>
        <div className="bill-header-actions">
          <button className="bill-btn bill-btn-primary" onClick={handleOpenCreate}>
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
          <TableSkeleton rows={5} columns={4} />
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
                {paginated.map(c => (
                  <tr key={c.id}>
                    <td data-label="ID" style={{ fontFamily: 'var(--pp-font-mono)' }}>
                      <div>#{c.id}</div>
                    </td>
                    <td data-label="Days" style={{ fontWeight: 500 }}>
                      <div>{c.days}</div>
                    </td>
                    <td data-label="Charges" style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 600 }}>
                      <div className="plat-cell-val">₹{(c.regularCharges ?? 0).toLocaleString()}</div>
                    </td>
                    <td data-label="Actions">
                      <div className="plat-cell-val">
                        <div className="flex justify-end gap-3" style={{ width: '100%' }}>
                          <button className="plat-btn plat-btn-sm plat-btn-icon" style={{ width: 36, height: 36, borderRadius: 10 }} onClick={() => handleOpenEdit(c)}>
                            <Edit2 size={13} />
                          </button>
                          <button type="button" className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" style={{ width: 36, height: 36, borderRadius: 10 }} onClick={(e) => handleDelete(e, c.id)}>
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
        totalItems={filtered.length}
        itemsPerPage={10}
        currentPage={page}
        onPageChange={setPage}
        onLimitChange={() => {}}
      />

      <Drawer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Day Charge' : 'Add Day Charge Plan'}
        maxWidth="400px"
      >
        <form onSubmit={handleSubmit} className="bill-form">
          <div className="bill-form-group">
            <label className="bill-form-label">Duration (Days) <span className="plat-form-required">*</span></label>
            <input className="bill-form-input" value={form.days} onChange={e => setForm(f => ({ ...f, days: e.target.value }))} required placeholder="e.g. 1 day, 5 days, 2 weeks" />
          </div>
          <div className="bill-form-group">
            <label className="bill-form-label">Charges (₹) <span className="plat-form-required">*</span></label>
            <input className="bill-form-input" type="number" min={0} value={form.regularCharges} onChange={e => setForm(f => ({ ...f, regularCharges: Number(e.target.value) }))} required />
          </div>
          <button type="submit" className="bill-btn bill-btn-primary" style={{ marginTop: 24, width: '100%', height: 44 }} disabled={createCharge.isPending || updateCharge.isPending}>
            {editingId ? 'Save Changes' : 'Create'}
          </button>
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
      <style>{`
        @media (max-width: 1024px) {
          .bill-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
          .bill-header-actions { width: 100%; }
          .bill-header-actions .bill-btn { width: 100%; height: 44px; border-radius: 12px; justify-content: center; }
          
          .plat-stats-bar { grid-template-columns: 1fr !important; }
          .plat-filters { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
          .plat-search-wrap { width: 100% !important; }
          .plat-search-input { width: 100% !important; height: 44px; border-radius: 12px; }

          .plat-card { border: none !important; box-shadow: none !important; background: transparent !important; }
          .plat-table-container { border: none !important; background: transparent !important; overflow: visible !important; }
          .plat-table { display: block !important; width: 100% !important; min-width: 0 !important; }
          .plat-table thead { display: none !important; }
          .plat-table tbody { display: block !important; width: 100% !important; }
          .plat-table tr { 
            display: block !important; 
            margin-bottom: 20px !important; 
            background: var(--bg-card) !important; 
            border: 1px solid var(--border-main) !important; 
            border-radius: 16px !important; 
            padding: 8px 0 !important;
            box-shadow: var(--pp-shadow-sm) !important;
          }
          .plat-table td {
            display: grid !important;
            grid-template-columns: 120px 1fr !important;
            gap: 12px !important;
            align-items: center !important;
            padding: 12px 20px !important;
            border-bottom: 1px dashed var(--border-main) !important;
            min-height: 48px;
            text-align: right !important;
            width: 100% !important;
          }
          .plat-table td:last-child { border-bottom: none !important; background: var(--bg-surface-2) !important; margin-top: 4px; padding-top: 16px !important; padding-bottom: 16px !important; }
          
          .plat-table td::before {
            content: attr(data-label);
            font-size: 10px !important;
            font-weight: 800 !important;
            color: var(--text-muted) !important;
            text-transform: uppercase !important;
            letter-spacing: 0.08em !important;
            text-align: left !important;
          }
          .plat-cell-val { width: 100% !important; text-align: right !important; display: flex !important; flex-direction: column !important; align-items: flex-end !important; }
          [data-label="ID"] { background: var(--bg-surface-2) !important; border-bottom: 1px solid var(--border-main) !important; margin-bottom: 4px; }
        }
      `}</style>
    </div>
  );
}