import React, { useState } from 'react';
import { PlusCircle, X, RefreshCw, Trash2, Edit2, Search, DollarSign, Wallet } from 'lucide-react';
import { 
  useExpenses, 
  useCreateExpense, 
  useUpdateExpense, 
  useDeleteExpense,
  useExpenseHeads 
} from '../hooks/use-accounts';
import type { ExpenseWithHead } from '@mmc/types';
import type { CreateExpenseInput, ListExpensesQuery } from '@mmc/validation';
import '../../platform/styles/platform.css';

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
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.head) {
      alert('Please select an expense head');
      return;
    }
    if (editingId) {
      await updateExpense.mutateAsync({ id: editingId, ...form });
    } else {
      await createExpense.mutateAsync(form as CreateExpenseInput);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this expense entry?')) return;
    await deleteExpense.mutateAsync(id);
  };

  return (
    <div className="plat-page animate-fade-in">
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <DollarSign size={20} className="color-primary" />
            Expenses
          </h1>
          <p className="plat-header-sub">Record and track clinic expenses by category.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <PlusCircle size={14} />
            Add Expense
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <span className="plat-stat-label">Total Entries</span>
          <span className="plat-stat-value">{total}</span>
        </div>
        <div className="plat-stat-card">
          <span className="plat-stat-label">Total Amount</span>
          <span className="plat-stat-value">₹{totalAmount.toLocaleString()}</span>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={16} className="plat-search-icon" />
          <input className="plat-filter-input plat-search-input" placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="plat-filter-input" style={{ width: 160 }} value={headFilter} onChange={e => setHeadFilter(e.target.value)}>
          <option value="">All Categories</option>
          {heads.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <input type="date" className="plat-filter-input" style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.82rem' }} value={fromDate} onChange={e => setFromDate(e.target.value)} placeholder="From" />
        <input type="date" className="plat-filter-input" style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.82rem' }} value={toDate} onChange={e => setToDate(e.target.value)} placeholder="To" />
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty"><RefreshCw size={22} className="animate-spin opacity-30" /></div>
        ) : filtered.length === 0 ? (
          <div className="plat-empty">
            <Wallet size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No expenses recorded yet.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
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
                      <span className="plat-badge plat-badge-staff">{e.headName || `Head #${e.head}`}</span>
                    </td>
                    <td data-label="Description">{e.detail || '—'}</td>
                    <td data-label="Amount" style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 600, color: 'var(--pp-danger-fg)' }}>
                      ₹{(e.amount ?? 0).toLocaleString()}
                    </td>
                    <td>
                      <div className="flex justify-end gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(e)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(e.id)}>
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
              <h2 className="plat-modal-title">{editingId ? 'Edit Expense' : 'Add Expense'}</h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="plat-modal-body plat-form">
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Expense Head <span className="plat-form-required">*</span></label>
                  <select className="plat-form-input" value={form.head ?? ''} onChange={e => setForm(f => ({ ...f, head: e.target.value ? parseInt(e.target.value) : undefined }))} required>
                    <option value="">Select category...</option>
                    {heads.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Date</label>
                  <input className="plat-form-input" type="date" value={form.expDate} onChange={e => setForm(f => ({ ...f, expDate: e.target.value }))} />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Amount (₹) <span className="plat-form-required">*</span></label>
                  <input className="plat-form-input" type="number" min={0} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} required />
                </div>
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Description / Detail</label>
                  <textarea className="plat-form-input" rows={3} value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} placeholder="e.g. Electricity bill for March 2026" />
                </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createExpense.isPending || updateExpense.isPending}>
                  {editingId ? 'Save Changes' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}