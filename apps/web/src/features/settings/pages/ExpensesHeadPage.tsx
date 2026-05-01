import React, { useState } from 'react';
import { Wallet, Plus, X, RefreshCw, Trash2, Edit2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useExpenseHeads, useCreateExpenseHead, useUpdateExpenseHead, useDeleteExpenseHead } from '@/features/billing/hooks/use-accounts';
import { Drawer } from '@/shared/components/drawer';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';

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

  const filtered = heads.filter((h: any) =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    (h.description && h.description.toLowerCase().includes(search.toLowerCase()))
  );

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(filtered);

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
          <TableSkeleton rows={5} columns={5} />
        ) : filtered.length === 0 ? (
          <div className="plat-empty">
            <Wallet size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No expense categories found.</p>
          </div>
        ) : (
          <>
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
                {paginatedData.map((head: any) => (
                  <tr key={head.id} className="plat-table-row">
                    <td data-label="ID" className="plat-table-cell font-mono text-xs color-muted">
                      <div>#{head.id}</div>
                    </td>
                    <td data-label="Category" className="plat-table-cell font-semibold">
                      <div>{head.name}</div>
                    </td>
                    <td data-label="Description" className="plat-table-cell text-secondary">
                      <div>{head.description || '—'}</div>
                    </td>
                    <td data-label="Status" className="plat-table-cell">
                      <div className="plat-cell-val">
                        <span className={`plat-badge ${head.isActive ? 'plat-badge-staff' : 'plat-badge-default'}`}>
                          {head.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td data-label="Actions" className="plat-table-cell">
                      <div className="plat-cell-val">
                        <div className="flex justify-end gap-3" style={{ width: '100%' }}>
                          <button className="plat-btn plat-btn-sm plat-btn-icon" style={{ width: 36, height: 36, borderRadius: 10 }} onClick={() => handleOpenEdit(head)}>
                            <Edit2 size={13} />
                          </button>
                          <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" style={{ width: 36, height: 36, borderRadius: 10 }} onClick={() => handleDelete(head.id, head.name)}>
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
          <Pagination
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onLimitChange={setItemsPerPage}
          />
          </>
        )}
      </div>      <Drawer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Category' : 'Add Expense Category'}
        maxWidth="480px"
      >
        <form onSubmit={handleSubmit}>
          <div className="plat-modal-body" style={{ padding: 0 }}>
            <div className="plat-form-section" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
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
                    style={{ minHeight: '120px' }}
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
          <div className="plat-modal-footer" style={{ padding: '24px 0 0 0', marginTop: '24px' }}>
            <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="plat-btn plat-btn-primary" disabled={createHead.isPending || updateHead.isPending}>
              {editingId ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </Drawer>
      <style>{`
        @media (max-width: 1024px) {
          .plat-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
          .plat-header-actions { width: 100%; }
          .plat-header-actions .plat-btn { width: 100%; height: 44px; border-radius: 12px; justify-content: center; }

          .plat-stats-bar { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .plat-stat-card { padding: 12px !important; }
          .plat-stat-value { font-size: 18px !important; }

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
