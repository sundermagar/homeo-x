import React, { useState } from 'react';
import { MessageSquare, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2, Send, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMessageTemplates, useCreateMessageTemplate, useUpdateMessageTemplate, useDeleteMessageTemplate } from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

const EMPTY_FORM = { name: '', content: '', type: 'SMS', isActive: true };

export default function MessageTemplatesPage() {
  const { data: templates = [], isLoading } = useMessageTemplates();
  const createTpl = useCreateMessageTemplate();
  const updateTpl = useUpdateMessageTemplate();
  const deleteTpl = useDeleteMessageTemplate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tpl: any) => {
    setEditingId(tpl.id);
    setForm({
      name: tpl.name,
      content: tpl.content,
      type: tpl.type || 'SMS',
      isActive: tpl.isActive ?? true
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateTpl.mutateAsync({ id: editingId, ...form });
    } else {
      await createTpl.mutateAsync(form as any);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete message template "${name}"?`)) return;
    await deleteTpl.mutateAsync(id);
  };

  const filtered = templates.filter((t: any) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="plat-page fade-in">


      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <MessageSquare size={20} className="color-primary" />
            Message Templates
          </h1>
          <p className="plat-header-sub">Configure pre-defined communication templates.</p>
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
          <p className="plat-stat-label">Templates</p>
          <p className="plat-stat-value plat-stat-value-primary">{templates.length}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Filtered</p>
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
            placeholder="Search templates..."
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
            <MessageSquare size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No templates found.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Template Name</th>
                  <th style={{ width: '100px' }}>Channel</th>
                  <th>Message Preview</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tpl: any) => (
                  <tr key={tpl.id} className="plat-table-row">
                    <td data-label="ID" className="plat-table-cell font-mono text-xs color-muted">{tpl.id}</td>
                    <td data-label="Name" className="plat-table-cell font-semibold">{tpl.name}</td>
                    <td data-label="Channel" className="plat-table-cell">
                      <span className={`plat-badge ${tpl.type === 'WhatsApp' ? 'plat-badge-admin' : 'plat-badge-default'}`}>
                        {tpl.type}
                      </span>
                    </td>
                    <td data-label="Preview" className="plat-table-cell">
                      <div className="truncate max-w-[280px] text-secondary text-sm" title={tpl.content}>{tpl.content}</div>
                    </td>
                    <td data-label="Status" className="plat-table-cell">
                      <span className={`plat-badge ${tpl.isActive ? 'plat-badge-staff' : 'plat-badge-default'}`}>
                        {tpl.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="plat-table-cell">
                      <div className="flex justify-end gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(tpl)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(tpl.id, tpl.name)}>
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
        <div className="plat-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="plat-modal-content max-w-xl" onClick={e => e.stopPropagation()}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">{editingId ? 'Edit Template' : 'Add Message Template'}</h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="plat-modal-body">
                <div className="plat-form-section">
                  <div className="plat-form-grid-multi" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="plat-form-group">
                      <label className="plat-form-label">Template Name *</label>
                      <input
                        className="plat-form-input"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        required
                        placeholder="e.g. Appointment Confirmation"
                      />
                    </div>
                    <div className="plat-form-group">
                      <label className="plat-form-label">Communication Channel</label>
                      <div className="flex gap-4 p-2 border border-main rounded-lg bg-soft">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" className="w-4 h-4 accent-primary" name="tpl-type" checked={form.type === 'SMS'} onChange={() => setForm(f => ({ ...f, type: 'SMS' }))} />
                          <span className="text-sm">SMS</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" className="w-4 h-4 accent-primary" name="tpl-type" checked={form.type === 'WhatsApp'} onChange={() => setForm(f => ({ ...f, type: 'WhatsApp' }))} />
                          <span className="text-sm font-bold color-primary">WhatsApp</span>
                        </label>
                      </div>
                    </div>
                    <div className="plat-form-group">
                      <label className="plat-form-label">Message Content *</label>
                      <div className="bg-faded rounded-lg p-3 mb-2 text-[11px] text-muted border border-dashed border-main">
                        Tip: Use <b>{"{name}"}</b>, <b>{"{date}"}</b> for variables.
                      </div>
                      <textarea
                        className="plat-form-input"
                        style={{ minHeight: '120px', fontFamily: 'monospace', fontSize: '13px' }}
                        value={form.content}
                        onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                        required
                        placeholder="Hello {name}, your appointment is confirmed for {date}..."
                      />
                    </div>

                    <div className="flex items-center gap-2 py-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary"
                        id="isActiveTpl"
                        checked={form.isActive}
                        onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                      />
                      <label htmlFor="isActiveTpl" className="plat-form-label mb-0 cursor-pointer">Template is Active</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createTpl.isPending || updateTpl.isPending}>
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
