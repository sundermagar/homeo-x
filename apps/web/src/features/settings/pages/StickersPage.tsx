import React, { useState } from 'react';
import { StickyNote, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStickers, useCreateSticker, useUpdateSticker, useDeleteSticker } from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

const EMPTY_FORM = { title: '', content: '' };

export default function StickersPage() {
  const { data: stickers = [], isLoading } = useStickers();
  const createSticker = useCreateSticker();
  const updateSticker = useUpdateSticker();
  const deleteSticker = useDeleteSticker();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const filteredStickers = stickers.filter((sticker: any) =>
    sticker.title?.toLowerCase().includes(search.toLowerCase()) ||
    sticker.content?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sticker: any) => {
    setEditingId(sticker.id);
    setForm({ 
      title: sticker.title, 
      content: sticker.content
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateSticker.mutateAsync({ id: editingId, ...form });
    } else {
      await createSticker.mutateAsync(form);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Delete sticker template "${title}"?`)) return;
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
            <StickyNote size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Medicine Stickers
          </h1>
          <p className="plat-header-sub">Configure templates for printing medicine dosage stickers.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} strokeWidth={1.6} />
            Add Template
          </button>
        </div>
      </div>

      <div className="plat-card">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-main)' }}>
          <input
            className="plat-form-input"
            style={{ maxWidth: '280px' }}
            placeholder="Search sticker templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="plat-empty">
            <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
          </div>
        ) : filteredStickers.length === 0 ? (
          <div className="plat-empty">
            <StickyNote size={28} className="plat-empty-icon" />
            <p className="plat-empty-text">No sticker templates found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Title</th>
                  <th>Content Preview</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStickers.map((sticker: any, idx: number) => (
                  <tr key={sticker.id}>
                    <td className="font-mono text-xs color-muted">{idx + 1}</td>
                    <td className="font-semibold">{sticker.title}</td>
                    <td className="text-secondary">
                      <div className="max-w-xs truncate" title={sticker.content}>
                        {sticker.content}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(sticker)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(sticker.id, sticker.title)}>
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
              <div className="plat-form-group plat-form-full">
                <label className="plat-form-label">Template Title <span className="plat-form-required">*</span></label>
                <input 
                  className="plat-form-input" 
                  value={form.title} 
                  onChange={e => setForm(f => ({...f, title: e.target.value}))}
                  required 
                  placeholder="e.g. 5 drops 3 times a day"
                />
              </div>
              <div className="plat-form-group plat-form-full">
                <label className="plat-form-label">Default Content <span className="plat-form-required">*</span></label>
                <textarea 
                  className="plat-form-input" 
                  style={{ minHeight: '120px' }}
                  value={form.content} 
                  onChange={e => setForm(f => ({...f, content: e.target.value}))}
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
