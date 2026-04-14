import React, { useState } from 'react';
import { StickyNote, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStickers, useCreateSticker, useUpdateSticker, useDeleteSticker } from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

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
      <Link to="/settings" className="settings-back-link">
        <ArrowLeft size={14} />
        Back to Settings
      </Link>

      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <StickyNote size={20} className="color-primary" />
            Medicine Stickers
          </h1>
          <p className="plat-header-sub">Configure templates for printing medicine dosage stickers.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} />
            Add Template
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <span className="plat-stat-label">Sticker Templates</span>
          <span className="plat-stat-value">{stickers.length}</span>
        </div>
        <div className="plat-stat-card">
          <span className="plat-stat-label">Filtered</span>
          <span className="plat-stat-value plat-stat-value-success">
            {filteredStickers.length}
          </span>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={16} className="plat-search-icon" />
          <input 
            className="plat-filter-input plat-search-input"
            placeholder="Search sticker templates..."
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
        ) : filteredStickers.length === 0 ? (
          <div className="plat-empty">
            <StickyNote size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No sticker templates found.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Name</th>
                  <th>Content Preview</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStickers.map((sticker: any, idx: number) => (
                  <tr key={sticker.id} className="plat-table-row">
                    <td data-label="#" className="plat-table-cell font-mono text-xs color-muted">{idx + 1}</td>
                    <td data-label="Name" className="plat-table-cell font-semibold">{sticker.name}</td>
                    <td data-label="Detail" className="plat-table-cell text-secondary">
                      <div className="truncate max-w-[280px]" title={sticker.detail}>
                        {sticker.detail}
                      </div>
                    </td>
                    <td className="plat-table-cell">
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
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="plat-modal-overlay fade-in" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="plat-modal" style={{ maxWidth: '500px' }}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">{editingId ? 'Edit Template' : 'Add Sticker Template'}</h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="plat-modal-body plat-form">
                {error && (
                  <div className="plat-alert plat-alert-danger" style={{ marginBottom: '1rem', fontSize: '13px' }}>
                    {error}
                  </div>
                )}
                <div className="plat-form-group plat-form-full">
                <label className="plat-form-label">Template Name <span className="plat-form-required">*</span></label>
                <input 
                  className="plat-form-input" 
                  value={form.name} 
                  onChange={e => setForm(f => ({...f, name: e.target.value}))}
                  required 
                  placeholder="e.g. 5 drops 3 times a day"
                />
              </div>
              <div className="plat-form-group plat-form-full">
                <label className="plat-form-label">Default Content <span className="plat-form-required">*</span></label>
                <textarea 
                  className="plat-form-input" 
                  style={{ minHeight: '120px' }}
                  value={form.detail} 
                  onChange={e => setForm(f => ({...f, detail: e.target.value}))}
                  required
                  placeholder="The text that will appear on the sticker..."
                />
              </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createSticker.isPending || updateSticker.isPending}>
                  {editingId ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
