import React, { useState } from 'react';
import { Sparkles, Plus, X, RefreshCw, Trash2, Edit2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePotencies, useCreatePotency, useUpdatePotency, useDeletePotency } from '../hooks/use-settings';
import { Drawer } from '@/shared/components/drawer';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';

interface Potency {
  id: number;
  name: string;
  detail?: string;
}

const EMPTY_FORM = { name: '', detail: '' };

export default function PotenciesPage() {
  const { data: potencies = [], isLoading } = usePotencies();
  const createPot = useCreatePotency();
  const updatePot = useUpdatePotency();
  const deletePot = useDeletePotency();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const filtered = potencies.filter((p: Potency) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.detail?.toLowerCase().includes(search.toLowerCase())
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

  const handleOpenEdit = (pot: Potency) => {
    setEditingId(pot.id);
    setForm({ name: pot.name, detail: pot.detail || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updatePot.mutateAsync({ id: editingId, ...form });
    } else {
      await createPot.mutateAsync(form);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete potency "${name}"?`)) return;
    await deletePot.mutateAsync(id);
  };

  return (
    <div className="plat-page fade-in">


      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Sparkles size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Potencies
          </h1>
          <p className="plat-header-sub">Manage medicine potencies (e.g. 30C, 200C, 1M).</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} strokeWidth={1.6} />
            Add Potency
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <p className="plat-stat-label">Total Potencies</p>
          <p className="plat-stat-value plat-stat-value-primary">{potencies.length}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Filtered View</p>
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
            placeholder="Search potencies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : filtered.length === 0 ? (
          <div className="plat-empty">
            <Sparkles size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No potencies found matching search.</p>
          </div>
        ) : (
          <>
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Potency Name</th>
                  <th>Description / Detail</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((pot: Potency, idx: number) => (
                  <tr key={pot.id} className="plat-table-row">
                    <td data-label="ID" className="plat-table-cell font-mono text-xs color-muted">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td data-label="Potency Name" className="plat-table-cell font-semibold">{pot.name}</td>
                    <td data-label="Detail" className="plat-table-cell text-secondary">{pot.detail || '—'}</td>
                    <td className="plat-table-cell">
                      <div className="flex justify-end gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(pot)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(pot.id, pot.name)}>
                          <Trash2 size={13} />
                        </button>
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
      </div>

      <Drawer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Potency' : 'Add Potency'}
        maxWidth="480px"
      >
        <form onSubmit={handleSubmit}>
          <div className="plat-modal-body" style={{ padding: 0 }}>
            <div className="plat-form-section" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
              <div className="plat-form-grid-multi" style={{ gridTemplateColumns: '1fr' }}>
                <div className="plat-form-group">
                  <label className="plat-form-label">Potency Name *</label>
                  <input
                    className="plat-form-input"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. 30C"
                  />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Description / Detail</label>
                  <textarea
                    className="plat-form-input"
                    rows={4}
                    style={{ minHeight: '120px' }}
                    value={form.detail}
                    onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
                    placeholder="Optional description..."
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="plat-modal-footer" style={{ padding: '24px 0 0 0', marginTop: '24px' }}>
            <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="plat-btn plat-btn-primary" disabled={createPot.isPending || updatePot.isPending}>
              {editingId ? 'Save Changes' : 'Add Potency'}
            </button>
          </div>
        </form>
      </Drawer>
      <style>{`
        @media (max-width: 1024px) {
          .plat-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
          .plat-header-actions { width: 100%; }
          .plat-header-actions .plat-btn { width: 100%; height: 44px; border-radius: 12px; justify-content: center; }
          
          .plat-stats-bar { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .plat-stat-card { padding: 12px !important; }
          .plat-stat-value { font-size: 18px !important; }
          
          .plat-filters { flex-direction: column; align-items: stretch; gap: 12px; }
          .plat-search-wrap { width: 100% !important; }
          .plat-search-input { width: 100% !important; height: 44px !important; border-radius: 12px !important; }
          
          .plat-card { border: none !important; box-shadow: none !important; background: transparent !important; padding: 0 !important; }
          .plat-table-container { border: none !important; background: transparent !important; overflow: visible !important; }
          .plat-table { display: block !important; width: 100% !important; }
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
            grid-template-columns: 110px 1fr !important;
            gap: 12px !important;
            align-items: center !important;
            padding: 12px 20px !important;
            border-bottom: 1px dashed var(--border-main) !important;
            min-height: 48px;
            text-align: right !important;
            width: 100% !important;
          }
          .plat-table td:last-child { border-bottom: none !important; background: var(--bg-surface-2) !important; padding-top: 16px !important; padding-bottom: 16px !important; border-bottom-left-radius: 15px; border-bottom-right-radius: 15px; }
          .plat-table td::before {
            content: attr(data-label);
            font-size: 10px !important;
            font-weight: 800 !important;
            color: var(--text-muted) !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
            text-align: left !important;
          }
        }
      `}</style>
    </div>
  );
}
