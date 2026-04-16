import React, { useState } from 'react';
import { Wallet, Plus, X, RefreshCw, Trash2, Edit2, Search  } from 'lucide-react';

import { useExpenseHeads, useCreateExpenseHead, useUpdateExpenseHead, useDeleteExpenseHead } from '../hooks/use-settings';
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
    <div className="plat-page animate-fade-in">
      

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
          <span className="plat-stat-label">Expense Categories</span>
          <span className="plat-stat-value">{heads.length}</span>
        </div>
        <div className="plat-stat-card">
          <span className="plat-stat-label">Active Listing</span>
          <span className="plat-stat-value plat-stat-value-success">
            {filtered.length}
          </span>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={16} className="plat-search-icon" />
          <input 
            className="plat-filter-input plat-search-input"
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
                  <tr key={head.id}>
                    <td data-label="ID">{head.id}</td>
                    <td data-label="Category">{head.name}</td>
                    <td data-label="Description">{head.description || '—'}</td>
                    <td data-label="Status">
                       <span className={`plat-badge ${head.isActive ? 'plat-badge-staff' : 'plat-badge-default'}`}>
                          {head.isActive ? 'Active' : 'Inactive'}
                       </span>
                    </td>
                    <td>
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
      </div>

      {isModalOpen && (
        <div className="plat-modal-overlay animate-fade-in" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="plat-modal" style={{ maxWidth: '450px' }}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">{editingId ? 'Edit Category' : 'Add Expense Category'}</h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="plat-modal-body plat-form">
              <div className="plat-form-group plat-form-full">
                <label className="plat-form-label">Category Name <span className="plat-form-required">*</span></label>
                <input 
                  className="plat-form-input" 
                  value={form.name} 
                  onChange={e => setForm(f => ({...f, name: e.target.value}))}
                  required 
                  placeholder="e.g. Electricity, Maintenance, Rent"
                />
              </div>
              <div className="plat-form-group plat-form-full">
                <label className="plat-form-label">Description</label>
                <textarea 
                  className="plat-form-input" 
                  style={{ minHeight: '80px' }}
                  value={form.description} 
                  onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  placeholder="Optional details about this category..."
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
                  <label htmlFor="is_active" className="plat-form-label cursor-pointer">Category is Active</label>
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
