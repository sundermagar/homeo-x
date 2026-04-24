import React, { useState } from 'react';
import { Wallet, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useExpenseHeads, useCreateExpenseHead, useUpdateExpenseHead, useDeleteExpenseHead } from '@/features/billing/hooks/use-accounts';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

const EMPTY_FORM = { name: '', description: '', isActive: true };

export default function ExpensesHeadPage() {
  const { data: heads = [], isLoading } = useExpenseHeads();
  const createHead = useCreateExpenseHead();
  const updateHead = useUpdateExpenseHead();
  const deleteHead = useDeleteExpenseHead();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (head: any) => {
    setEditingId(head.id);
    setForm({ name: head.name, description: head.description || '', isActive: head.isActive ?? true });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateHead.mutateAsync({ id: editingId, ...form });
    } else {
      await createHead.mutateAsync(form);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete expense category "${name}"?`)) return;
    await deleteHead.mutateAsync(id);
  };

  const filtered = heads.filter((h: any) =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    (h.description && h.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="plat-page fade-in">


      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Wallet size={20} className="color-primary" />
            Expenses Head
          </h1>
          <p className="plat-header-sub">Manage categories for clinic accounting and expense tracking.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} />
            Add Expense Head
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <p className="plat-stat-label">Expense Categories</p>
          <p className="plat-stat-value plat-stat-value-primary">{heads.length}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Active Listing</p>
          <p className="plat-stat-value plat-stat-value-success">
            {filtered.length}
          </p>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={14} className="plat-search-icon" />
          <input
            className="plat-form-input plat-search-input"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty">
            <RefreshCw size={22} className="animate-spin opacity-30" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="plat-empty">
            <Wallet size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No expense categories found.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Category Name</th>
                  <th>Description</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((head: any) => (
                  <tr key={head.id} className="plat-table-row">
                    <td data-label="ID" className="plat-table-cell font-mono text-xs color-muted">{head.id}</td>
                    <td data-label="Category" className="plat-table-cell font-semibold">{head.name}</td>
                    <td data-label="Description" className="plat-table-cell text-secondary">{head.description || '—'}</td>
                    <td data-label="Status" className="plat-table-cell">
                      <span className={`plat-badge ${head.isActive ? 'plat-badge-staff' : 'plat-badge-default'}`}>
                        {head.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="plat-table-cell">
                      <div className="flex justify-end gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(head)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(head.id, head.name)}>
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
      </div>      {isModalOpen && (
        <div className="plat-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="plat-modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">{editingId ? 'Edit Category' : 'Add Expense Category'}</h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="plat-modal-body">
                <div className="plat-form-section">
                  <div className="plat-form-grid-multi" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="plat-form-group">
                      <label className="plat-form-label">Category Name *</label>
                      <input
                        className="plat-form-input"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        required
                        placeholder="e.g. Electricity, Maintenance, Rent"
                      />
                    </div>
                    <div className="plat-form-group">
                      <label className="plat-form-label">Description</label>
                      <textarea
                        className="plat-form-input"
                        style={{ minHeight: '80px' }}
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Optional details about this category..."
                      />
                    </div>
                    <div className="flex items-center gap-2 py-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary"
                        id="is_active"
                        checked={form.isActive}
                        onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                      />
                      <label htmlFor="is_active" className="plat-form-label mb-0 cursor-pointer">Category is Active</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createHead.isPending || updateHead.isPending}>
                  {editingId ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
