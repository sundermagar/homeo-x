import React, { useState } from 'react';
import { PlusCircle, X, RefreshCw, Trash2, Edit2, Search, DollarSign, Wallet } from 'lucide-react';
import { 
  useExpenses, 
  useCreateExpense, 
  useUpdateExpense, 
  useDeleteExpense,
  useExpenseHeads,
  useCreateExpenseHead
} from '../hooks/use-accounts';
import type { ExpenseWithHead } from '@mmc/types';
import type { CreateExpenseInput, ListExpensesQuery } from '@mmc/validation';
import '../styles/billing.css';

const EMPTY_FORM = {
  dateval: '',
  expDate: new Date().toISOString().split('T')[0],
  head: undefined as number | undefined,
  amount: 0,
  detail: '',
};

export default function ExpensesPage() {
  const [page, setPage] = useState(1);
  const [headFilter, setHeadFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [customHeadName, setCustomHeadName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const query: ListExpensesQuery = {
    page, limit: 30,
    head: headFilter ? parseInt(headFilter, 10) : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  };

  const { data, isLoading } = useExpenses(query);
  const { data: heads = [] } = useExpenseHeads();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const createExpenseHead = useCreateExpenseHead();

  const expenses: ExpenseWithHead[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalAmount = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);

  const filtered = expenses.filter(e =>
    !search ||
    (e.detail ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (e.headName ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsOtherSelected(false);
    setCustomHeadName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exp: ExpenseWithHead) => {
    setEditingId(exp.id);
    setForm({
      dateval: exp.dateval ?? '',
      expDate: exp.expDate ?? new Date().toISOString().split('T')[0],
      head: exp.head ?? undefined,
      amount: exp.amount ?? 0,
      detail: exp.detail ?? '',
    });
    setIsOtherSelected(false);
    setCustomHeadName('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let headId = form.head;

    if (isOtherSelected) {
      if (!customHeadName.trim()) {
        alert('Please enter a category name');
        return;
      }
      // Create new expense head
      try {
        const newHead = await createExpenseHead.mutateAsync({ name: customHeadName, isActive: true });
        headId = newHead.id;
      } catch (err) {
        alert('Failed to create new category');
        return;
      }
    }

    if (!headId) {
      alert('Please select an expense head');
      return;
    }

    const payload = { ...form, head: headId };

    if (editingId) {
      await updateExpense.mutateAsync({ id: editingId, ...payload });
    } else {
      await createExpense.mutateAsync(payload as CreateExpenseInput);
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
      await deleteExpense.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert('Failed to delete expense: ' + (err.response?.data?.error || err.message));
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="bill-page fade-in">
      {/* ─── Header ─── */}
      <div className="bill-header">
        <div>
          <h1 className="bill-header-title">
            <DollarSign size={20} strokeWidth={1.6} style={{ color: 'var(--pp-blue)' }} />
            Clinic Expenses
          </h1>
          <p className="bill-header-sub">Record and track clinic expenses by category.</p>
        </div>
        <div className="bill-header-actions">
          <button className="bill-btn bill-btn-primary" onClick={handleOpenCreate}>
            <PlusCircle size={14} strokeWidth={2} />
            Add Expense
          </button>
        </div>
      </div>

      {/* ─── Stats Bar ─── */}
      <div className="bill-stats-bar">
        <div className="bill-stat-card">
          <div className="bill-stat-icon" style={{ background: 'var(--pp-blue-bg)', color: 'var(--pp-blue)' }}>
            <DollarSign size={22} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <p className="bill-stat-label">Total Entries</p>
            <div className="bill-stat-value">{total}</div>
          </div>
        </div>
        <div className="bill-stat-card" data-type="danger">
          <div className="bill-stat-icon" style={{ background: 'var(--pp-danger-bg)', color: 'var(--pp-danger-fg)' }}>
            <Wallet size={22} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <p className="bill-stat-label">Total Amount</p>
            <div className="bill-stat-value">₹{totalAmount.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="bill-filters">
        <div className="bill-search-wrap">
          <Search size={14} className="bill-search-icon" strokeWidth={2} />
          <input 
            className="bill-filter-input bill-search-input" 
            placeholder="Search expenses..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <select className="bill-filter-input" style={{ width: 160 }} value={headFilter} onChange={e => setHeadFilter(e.target.value)}>
          <option value="">All Categories</option>
          {heads.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <input 
          type="date" 
          className="bill-filter-input" 
          style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.82rem' }} 
          value={fromDate} 
          onChange={e => setFromDate(e.target.value)} 
        />
        <input 
          type="date" 
          className="bill-filter-input" 
          style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.82rem' }} 
          value={toDate} 
          onChange={e => setToDate(e.target.value)} 
        />
      </div>

      <div className="bill-card">
        {isLoading ? (
          <div className="bill-empty"><RefreshCw size={22} className="animate-spin opacity-30" /></div>
        ) : filtered.length === 0 ? (
          <div className="bill-empty">
            <Wallet size={40} className="bill-empty-icon" />
            <p className="bill-empty-text">No expenses recorded yet.</p>
          </div>
        ) : (
          <div className="bill-table-container">
            <table className="bill-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>ID</th>
                  <th style={{ width: 120 }}>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th style={{ width: 120 }}>Amount</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td data-label="ID" style={{ fontFamily: 'var(--pp-font-mono)' }}>#{e.id}</td>
                    <td data-label="Date" style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.78rem' }}>{e.expDate || '—'}</td>
                    <td data-label="Category">
                      <span className="bill-badge bill-badge-staff">{e.headName || `Head #${e.head}`}</span>
                    </td>
                    <td data-label="Description">{e.detail || '—'}</td>
                    <td data-label="Amount" style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 700, color: 'var(--pp-danger-fg)' }}>
                      ₹{(e.amount ?? 0).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="bill-btn bill-btn-sm bill-btn-icon" onClick={() => handleOpenEdit(e)}>
                          <Edit2 size={13} strokeWidth={2} />
                        </button>
                        <button type="button" className="bill-btn bill-btn-sm bill-btn-icon bill-btn-danger" onClick={(evt) => handleDelete(evt, e.id)}>
                          <Trash2 size={13} strokeWidth={2} />
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
        <div className="bill-modal-overlay fade-in" onClick={e => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="bill-modal" style={{ maxWidth: 500 }}>
            <div className="bill-modal-header">
              <h2 className="bill-modal-title">{editingId ? 'Edit Expense' : 'Add Expense Entry'}</h2>
              <button className="bill-btn bill-btn-icon" onClick={() => setIsModalOpen(false)} style={{ border: 'none' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="bill-modal-body bill-form">
                <div className="bill-form-group">
                  <label className="bill-form-label">Expense Head <span className="bill-form-required">*</span></label>
                  <select 
                    className="bill-form-select" 
                    value={isOtherSelected ? 'other' : (form.head ?? '')} 
                    onChange={e => {
                      if (e.target.value === 'other') {
                        setIsOtherSelected(true);
                        setForm(f => ({ ...f, head: undefined }));
                      } else {
                        setIsOtherSelected(false);
                        setForm(f => ({ ...f, head: e.target.value ? parseInt(e.target.value) : undefined }));
                      }
                    }} 
                    required
                  >
                    <option value="">Select category...</option>
                    {heads.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    <option value="other" style={{ fontWeight: 700, color: 'var(--pp-blue)' }}>+ Other (Create New)</option>
                  </select>
                </div>
                {isOtherSelected && (
                  <div className="bill-form-group fade-in">
                    <label className="bill-form-label">New Category Name <span className="bill-form-required">*</span></label>
                    <input 
                      className="bill-form-input" 
                      placeholder="Enter manual category name..." 
                      value={customHeadName} 
                      onChange={e => setCustomHeadName(e.target.value)}
                      required 
                      autoFocus
                    />
                  </div>
                )}
                <div className="bill-form-row bill-form-row-2">
                  <div className="bill-form-group">
                    <label className="bill-form-label">Date</label>
                    <input className="bill-form-input" type="date" value={form.expDate} onChange={e => setForm(f => ({ ...f, expDate: e.target.value }))} />
                  </div>
                  <div className="bill-form-group">
                    <label className="bill-form-label">Amount (₹) <span className="bill-form-required">*</span></label>
                    <input className="bill-form-input" type="number" min={0} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} required />
                  </div>
                </div>
                <div className="bill-form-group">
                  <label className="bill-form-label">Description / Detail</label>
                  <textarea className="bill-form-textarea" rows={3} value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} placeholder="e.g. Electricity bill for March 2026" />
                </div>
              </div>
              <div className="bill-modal-footer">
                <button type="button" className="bill-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="bill-btn bill-btn-primary" disabled={createExpense.isPending || updateExpense.isPending} style={{ minWidth: '120px' }}>
                  {editingId ? 'Save Changes' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleteConfirmId && (
        <div className="bill-modal-overlay fade-in" style={{ zIndex: 1100 }}>
          <div className="bill-modal" style={{ maxWidth: 400 }}>
            <div className="bill-modal-header">
              <h2 className="bill-modal-title">Confirm Deletion</h2>
            </div>
            <div className="bill-modal-body">
              <p style={{ margin: 0, color: 'var(--pp-text-2)', fontSize: '0.9rem' }}>
                Are you sure you want to delete this expense entry? This action cannot be undone.
              </p>
            </div>
            <div className="bill-modal-footer">
              <button type="button" className="bill-btn" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
              <button type="button" className="bill-btn bill-btn-danger" onClick={confirmDelete} disabled={deleteExpense.isPending}>
                {deleteExpense.isPending ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}