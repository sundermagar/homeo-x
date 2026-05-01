import React, { useState } from 'react';
import { History, RefreshCw, Filter, Package, Plus, X, ArrowUp, ArrowDown, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useStockLogs, useMedicines, useAddStock, useDeleteStockLog } from '../hooks/use-settings';
import { Drawer } from '@/shared/components/drawer';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import { TableSkeleton } from '@/shared/components/TableSkeleton';

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
          <p className="plat-stat-label">Total Stock In</p>
          <p className="plat-stat-value" style={{ color: '#16a34a' }}>+{totalIn}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Total Stock Out</p>
          <p className="plat-stat-value" style={{ color: '#dc2626' }}>-{totalOut}</p>
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
        <button className="plat-btn" onClick={() => refetch()} style={{ marginLeft: 'auto' }}>
          <RefreshCw size={13} /> Refresh
        </button>
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
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '180px' }}>Date & Time</th>
                  <th>Medicine</th>
                  <th style={{ width: '140px' }}>Movement</th>
                  <th style={{ width: '90px' }}>Qty</th>
                  <th style={{ width: '170px' }}>Stock Shift</th>
                  <th>Reason / Note</th>
                  <th style={{ width: '70px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((log: any) => {
                  const medicine = (medicines as any[]).find((m: any) => m.id === log.medicineId);
                  const isPositive = log.changeType === 'INVENTORY_ADD';
                  return (
                    <tr key={log.id} className="plat-table-row">
                      <td className="plat-table-cell" style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(log.createdAt).toLocaleString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td className="plat-table-cell">
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>
                          {medicine?.name || `Medicine #${log.medicineId}`}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Clinical Pharmacy
                        </div>
                      </td>
                      <td className="plat-table-cell">
                        <span className={`plat-badge ${isPositive ? 'plat-badge-staff' : ''}`}
                          style={isPositive
                            ? { display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content', fontSize: '10px' }
                            : { display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content', fontSize: '10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }
                          }
                        >
                          {isPositive ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                          {isPositive ? 'Stock In' : 'Stock Out'}
                        </span>
                      </td>
                      <td className="plat-table-cell"
                        style={{ fontFamily: 'monospace', fontWeight: 900, color: isPositive ? '#16a34a' : '#dc2626' }}>
                        {isPositive ? '+' : '-'}{log.quantity}
                      </td>
                      <td className="plat-table-cell">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{log.previousStock ?? '—'}</span>
                          <span style={{ opacity: 0.3 }}>→</span>
                          <span style={{ fontWeight: 700 }}>{log.newStock ?? '—'}</span>
                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', opacity: 0.6 }}>units</span>
                        </div>
                      </td>
                      <td className="plat-table-cell" style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                        {log.reason || 'System Auto-Adjustment'}
                      </td>
                      <td className="plat-table-cell" style={{ textAlign: 'center' }}>
                        <button
                          className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger"
                          title="Delete log entry"
                          disabled={deletingId === log.id}
                          onClick={() => handleDelete(log.id)}
                        >
                          {deletingId === log.id
                            ? <RefreshCw size={12} className="animate-spin" />
                            : <Trash2 size={12} />}
                        </button>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f0fdf4', color: '#16a34a', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                <CheckCircle size={16} /> {successMsg}
              </div>
            )}

            <div className="plat-form-section" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
              <div className="plat-form-group">
                <label className="plat-form-label">Medicine *</label>
                <select
                  className="plat-form-input"
                  required
                  value={form.medicineId}
                  onChange={e => setForm(f => ({ ...f, medicineId: e.target.value }))}
                >
                  <option value="">Select Medicine</option>
                  {(medicines as any[]).map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#fefce8', color: '#92400e', borderRadius: '8px', marginTop: '16px', fontSize: '12px' }}>
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
