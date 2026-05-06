import React, { useState } from 'react';
import { StickyNote, Plus, X, RefreshCw, Trash2, Edit2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStickers, useCreateSticker, useUpdateSticker, useDeleteSticker } from '../hooks/use-settings';
import { Drawer } from '@/shared/components/drawer';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';

const EMPTY_FORM = { name: '', detail: '' };

export default function StickersPage() {
  const { data: stickers = [], isLoading } = useStickers();
  const createSticker = useCreateSticker();
  const updateSticker = useUpdateSticker();
  const deleteSticker = useDeleteSticker();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filteredStickers = stickers.filter((sticker: any) =>
    sticker.name?.toLowerCase().includes(search.toLowerCase()) ||
    sticker.detail?.toLowerCase().includes(search.toLowerCase())
  );

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(filteredStickers);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sticker: any) => {
    setEditingId(sticker.id);
    setForm({ 
      name: sticker.name, 
      detail: sticker.detail
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await updateSticker.mutateAsync({ id: editingId, ...form });
      } else {
        await createSticker.mutateAsync(form);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Sticker Op Error:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Operation failed';
      setError(msg);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete sticker template "${name}"?`)) return;
    await deleteSticker.mutateAsync(id);
  };

  return (
    <div className="plat-page fade-in">


      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            <StickyNote size={22} style={{ color: 'var(--pp-blue)' }} />
            Medicine Stickers
          </h1>
          <p className="pp-page-hero-sub">Configure templates for printing medicine dosage stickers.</p>
        </div>
        <div className="pp-page-hero-actions">
          <button className="btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} strokeWidth={1.8} /> Add Template
          </button>
        </div>
      </div>

      <div className="pp-stat-grid">
        <div className="pp-stat-card-enhanced">
          <div className="pp-stat-label">Sticker Templates</div>
          <div className="pp-stat-value is-primary">{stickers.length}</div>
        </div>
        <div className="pp-stat-card-enhanced">
          <div className="pp-stat-label">Filtered Results</div>
          <div className="pp-stat-value is-success">{filteredStickers.length}</div>
        </div>
      </div>

      <div className="pp-filter-card">
        <div className="pp-filter-search-wrap">
          <Search size={14} />
          <input 
            type="text"
            placeholder="Search sticker templates..."
            className="pp-filter-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="pp-table-container-enhanced">
        {isLoading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : filteredStickers.length === 0 ? (
          <div className="pp-empty-enhanced" style={{ border: 'none', background: 'transparent' }}>
            <div className="pp-empty-icon-circle">
              <StickyNote size={32} />
            </div>
            <p className="pp-empty-title">No templates found</p>
            <p className="pp-empty-sub">Add a new sticker template to simplify your medicine dispensing workflow.</p>
          </div>
        ) : (
          <>
            <table className="pp-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Name</th>
                  <th>Content Preview</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((sticker: any, idx: number) => (
                  <tr key={sticker.id} className="pp-hover-row" onClick={() => handleOpenEdit(sticker)} style={{ cursor: 'pointer' }}>
                    <td data-label="#" className="plat-table-cell font-mono text-xs color-muted">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td data-label="Name" className="plat-table-cell font-semibold">{sticker.name}</td>
                    <td data-label="Detail" className="plat-table-cell text-secondary">
                      <div className="truncate max-w-[280px]" title={sticker.detail}>
                        {sticker.detail}
                      </div>
                    </td>
                    <td data-label="Action" className="plat-table-cell">
                      <div className="flex justify-end gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(sticker)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(sticker.id, sticker.name)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              </>
            )}
          </div>

          {!isLoading && filteredStickers.length > 0 && (
            <div style={{ marginTop: '20px' }}>
            <Pagination
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                onLimitChange={setItemsPerPage}
              />
          </div>
          )}

      <Drawer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Template' : 'Add Sticker Template'}
        maxWidth="480px"
      >
        <form onSubmit={handleSubmit}>
          <div className="plat-modal-body" style={{ padding: 0 }}>
            <div className="plat-form-section" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
              <div className="plat-form-grid-multi" style={{ gridTemplateColumns: '1fr' }}>
                {error && (
                  <div className="plat-alert plat-alert-danger" style={{ marginBottom: '1rem', fontSize: '13px' }}>
                    {error}
                  </div>
                )}
                <div className="plat-form-group">
                  <label className="plat-form-label">Template Name *</label>
                  <input
                    className="plat-form-input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    placeholder="e.g. 5 drops 3 times a day"
                  />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Default Content *</label>
                  <textarea
                    className="plat-form-input"
                    style={{ minHeight: '160px' }}
                    value={form.detail}
                    onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
                    required
                    placeholder="The text that will appear on the sticker..."
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="plat-modal-footer" style={{ padding: '24px 0 0 0', marginTop: '24px' }}>
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={createSticker.isPending || updateSticker.isPending}>
              {editingId ? 'Save Changes' : 'Create Template'}
            </button>
          </div>
        </form>
      </Drawer>

    </div>
  );
}
