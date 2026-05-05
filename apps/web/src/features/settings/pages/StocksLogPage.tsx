import React, { useState } from 'react';
import { History, RefreshCw, Filter, Package, Plus, X, ArrowUp, ArrowDown, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useStockLogs, useMedicines, useAddStock, useDeleteStockLog } from '../hooks/use-settings';
import { Drawer } from '@/shared/components/drawer';
import { CustomSearchSelect } from '@/shared/components/custom-search-select';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';

const EMPTY_FORM = {
  medicineId: '',
  quantity: '',
  changeType: 'INVENTORY_ADD',
  reason: '',
};

export default function StocksLogPage() {
  const [selectedMedicine, setSelectedMedicine] = useState<number | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [successMsg, setSuccessMsg] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: logs = [], isLoading, refetch } = useStockLogs(selectedMedicine);
  const { data: medicines = [] } = useMedicines();
  const addStock = useAddStock();
  const deleteStockLog = useDeleteStockLog();

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(logs);

  const handleOpenAdd = () => {
    setForm(EMPTY_FORM);
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicineId || !form.quantity) return;
    try {
      await addStock.mutateAsync({
        medicineId: Number(form.medicineId),
        quantity: Number(form.quantity),
        changeType: form.changeType,
        reason: form.reason || undefined,
      });
      const med = (medicines as any[]).find((m) => m.id === Number(form.medicineId));
      setSuccessMsg(`Stock ${form.changeType === 'INVENTORY_ADD' ? 'added' : 'deducted'} for "${med?.name || 'medicine'}" successfully.`);
      setForm(EMPTY_FORM);
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMsg('');
      }, 1500);
    } catch (err) {
      console.error('Add stock failed:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this stock log entry?')) return;
    setDeletingId(id);
    try {
      await deleteStockLog.mutateAsync(id);
    } finally {
      setDeletingId(null);
    }
  };

  const totalIn  = (logs as any[]).filter((l) => l.changeType === 'INVENTORY_ADD').reduce((s: number, l: any) => s + Number(l.quantity), 0);
  const totalOut = (logs as any[]).filter((l) => l.changeType !== 'INVENTORY_ADD').reduce((s: number, l: any) => s + Number(l.quantity), 0);

  return (
    <div className="plat-page fade-in">

      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <History size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Stock Logs
          </h1>
          <p className="plat-header-sub">Track inventory movements — add or deduct stock for medicines in the catalog.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenAdd}>
            <Plus size={14} /> Add Stock
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <p className="plat-stat-label">Total Entries</p>
          <p className="plat-stat-value plat-stat-value-primary">{(logs as any[]).length}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Stock In</p>
          <p className="plat-stat-value" style={{ color: 'var(--pp-success-fg)' }}>+{totalIn}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Stock Out</p>
          <p className="plat-stat-value" style={{ color: 'var(--pp-danger-fg)' }}>-{totalOut}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Filter size={14} className="plat-search-icon" />
          <select
            className="plat-form-input plat-search-input"
            style={{ width: '220px' }}
            value={selectedMedicine ?? ''}
            onChange={e => setSelectedMedicine(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">All Medicines</option>
            {(medicines as any[]).map((m: any) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <TableSkeleton rows={5} columns={7} />
        ) : (logs as any[]).length === 0 ? (
          <div className="plat-empty" style={{ minHeight: 200 }}>
            <Package size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No inventory movements yet. Use the "Add Stock" button to get started.</p>
            <button className="plat-btn plat-btn-primary" onClick={handleOpenAdd} style={{ marginTop: '12px' }}>
              <Plus size={14} /> Add First Stock Entry
            </button>
          </div>
        ) : (
          <>
          <div className="plat-table-container">
            <table className="plat-table" style={{ tableLayout: 'fixed', width: '100%', minWidth: '900px' }}>
              <thead>
                <tr>
                  <th style={{ width: '160px' }}>Date & Time</th>
                  <th style={{ width: 'auto' }}>Medicine</th>
                  <th style={{ width: '120px' }}>Movement</th>
                  <th style={{ width: '100px' }}>Qty</th>
                  <th style={{ width: '160px', textAlign: 'right' }}>Stock Shift</th>
                  <th style={{ width: 'auto', textAlign: 'right' }}>Reason / Note</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((log: any) => {
                  const medicine = (medicines as any[]).find((m: any) => m.id === log.medicineId);
                  const isPositive = log.changeType === 'INVENTORY_ADD';
                  return (
                    <tr key={log.id} className="plat-table-row">
                      <td data-label="DATE & TIME" className="plat-table-cell" style={{ width: '160px' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--pp-text-3)' }}>
                          {new Date(log.createdAt).toLocaleString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td data-label="MEDICINE" className="plat-table-cell" style={{ width: 'auto' }}>
                        <div className="plat-stock-info">
                          <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--pp-ink)' }}>
                            {medicine?.name || `Medicine #${log.medicineId}`}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--pp-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Clinical Pharmacy
                          </div>
                        </div>
                      </td>
                      <td data-label="MOVEMENT" className="plat-table-cell" style={{ width: '120px' }}>
                        <div className="plat-stock-badge-wrap">
                          <span className={`plat-badge ${isPositive ? 'plat-badge-staff' : ''}`}
                            style={isPositive
                              ? { display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content', fontSize: '10px' }
                              : { display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content', fontSize: '10px', background: 'var(--pp-danger-bg)', color: 'var(--pp-danger-fg)', border: '1px solid var(--pp-danger-border)' }
                            }
                          >
                            {isPositive ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                            {isPositive ? 'Stock In' : 'Stock Out'}
                          </span>
                        </div>
                      </td>
                      <td data-label="QTY" className="plat-table-cell" style={{ width: '100px' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 600, color: isPositive ? 'var(--pp-success-fg)' : 'var(--pp-danger-fg)', fontSize: '15px' }}>
                          {isPositive ? '+' : '-'}{log.quantity}
                        </div>
                      </td>
                      <td data-label="SHIFT" className="plat-table-cell" style={{ width: '160px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace', fontSize: '12px', justifyContent: 'flex-end' }}>
                          <span style={{ color: 'var(--pp-text-3)' }}>{log.previousStock ?? '—'}</span>
                          <span style={{ opacity: 0.3, color: 'var(--pp-ink)' }}>→</span>
                          <span style={{ fontWeight: 600, color: 'var(--pp-ink)' }}>{log.newStock ?? '—'}</span>
                          <span style={{ fontSize: '9px', color: 'var(--pp-text-3)', opacity: 0.6 }}>units</span>
                        </div>
                      </td>
                      <td data-label="REASON" className="plat-table-cell" style={{ width: 'auto' }}>
                        <div style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--pp-text-3)', textAlign: 'right' }}>
                          {log.reason || 'System Auto-Adjustment'}
                        </div>
                      </td>
                      <td data-label="ACTION" className="plat-table-cell" style={{ width: '80px', textAlign: 'center' }}>
                        <div className="plat-stock-actions" style={{ display: 'flex', justifyContent: 'center' }}>
                          <button
                            className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger"
                            title="Delete log entry"
                            disabled={deletingId === log.id}
                            onClick={() => handleDelete(log.id)}
                            style={{ width: 36, height: 36, borderRadius: 10 }}
                          >
                            {deletingId === log.id
                              ? <RefreshCw size={14} className="animate-spin" />
                              : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onLimitChange={setItemsPerPage}
          />
          </>
        )}
      </div>

      <Drawer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Stock Entry"
        maxWidth="480px"
      >
        <form onSubmit={handleSubmit}>
          <div className="plat-modal-body" style={{ padding: 0 }}>
            {successMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--pp-success-bg)', color: 'var(--pp-success-fg)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                <CheckCircle size={16} /> {successMsg}
              </div>
            )}

            <div className="plat-form-section" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
              <CustomSearchSelect
                label="Medicine *"
                value={(medicines as any[]).find(m => m.id === Number(form.medicineId))?.name || ''}
                options={medicines as any[]}
                onChange={(name, id) => setForm(f => ({ ...f, medicineId: String(id) }))}
                placeholder="Select Medicine"
              />

              <div className="plat-form-grid-multi mt-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="plat-form-group">
                  <label className="plat-form-label">Movement Type *</label>
                  <select
                    className="plat-form-input"
                    value={form.changeType}
                    onChange={e => setForm(f => ({ ...f, changeType: e.target.value }))}
                  >
                    <option value="INVENTORY_ADD">Stock In (Add)</option>
                    <option value="INVENTORY_SUB">Stock Out (Deduct)</option>
                    <option value="SALE">Sale</option>
                    <option value="DISPENSE">Dispense to Patient</option>
                  </select>
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Quantity *</label>
                  <input
                    type="number"
                    className="plat-form-input"
                    required
                    min={1}
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="e.g. 50"
                  />
                </div>
              </div>

              <div className="plat-form-group mt-4">
                <label className="plat-form-label">Reason / Notes</label>
                <textarea
                  className="plat-form-input"
                  style={{ minHeight: '80px' }}
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. New stock received, Batch B-2024-01"
                />
              </div>

              {form.changeType !== 'INVENTORY_ADD' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--pp-warning-bg)', color: 'var(--pp-warning-fg)', borderRadius: '8px', marginTop: '16px', fontSize: '12px' }}>
                  <AlertCircle size={14} />
                  This will deduct the specified quantity from the current medicine stock level.
                </div>
              )}
            </div>
          </div>
          <div className="plat-modal-footer" style={{ padding: '24px 0 0 0', marginTop: '24px' }}>
            <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="plat-btn plat-btn-primary" disabled={addStock.isPending}>
              {addStock.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
              {addStock.isPending ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </Drawer>

    </div>
  );
}
