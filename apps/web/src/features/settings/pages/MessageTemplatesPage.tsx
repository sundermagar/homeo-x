import React, { useState } from 'react';
import { MessageSquare, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2, Send } from 'lucide-react';
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

  return (
    <div className="plat-page fade-in">
      <Link to="/settings" className="settings-back-link">
        <ArrowLeft size={14} />
        Back to Settings
      </Link>

      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <MessageSquare size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Message Templates
          </h1>
          <p className="plat-header-sub">Configure pre-defined messages for SMS and WhatsApp communications.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} strokeWidth={1.6} />
            Add Template
          </button>
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty">
            <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
          </div>
        ) : templates.length === 0 ? (
          <div className="plat-empty">
            <MessageSquare size={28} className="plat-empty-icon" />
            <p className="plat-empty-text">No message templates found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
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
                {templates.map((tpl: any) => (
                  <tr key={tpl.id}>
                    <td className="font-mono text-xs color-muted">{tpl.id}</td>
                    <td className="font-semibold">{tpl.name}</td>
                    <td>
                       <span className={`plat-badge ${tpl.type === 'WhatsApp' ? 'plat-badge-admin' : 'plat-badge-default'}`}>
                         {tpl.type}
                       </span>
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                       <div className="text-truncate" title={tpl.content}>{tpl.content}</div>
                    </td>
                    <td>
                       <span className={`plat-badge ${tpl.isActive ? 'plat-badge-staff' : 'plat-badge-default'}`}>
                         {tpl.isActive ? 'Active' : 'Inactive'}
                       </span>
                    </td>
                    <td>
                      <div className="flex gap-3">
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
        <div className="plat-modal-overlay fade-in" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="plat-modal" style={{ maxWidth: '500px' }}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">{editingId ? 'Edit Template' : 'Add Message Template'}</h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="plat-modal-body plat-form">
              <div className="plat-form-group plat-form-full">
                <label className="plat-form-label">Template Name <span className="plat-form-required">*</span></label>
                <input 
                  className="plat-form-input" 
                  value={form.name} 
                  onChange={e => setForm(f => ({...f, name: e.target.value}))}
                  required 
                  placeholder="e.g. Appointment Confirmation"
                />
              </div>
              <div className="plat-form-group plat-form-full">
                <label className="plat-form-label">Communication Channel</label>
                <div className="flex gap-4 p-2">
                   <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" className="plat-form-input" name="tpl-type" checked={form.type === 'SMS'} onChange={() => setForm(f => ({...f, type: 'SMS'}))} />
                      <span>SMS</span>
                   </label>
                   <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" className="plat-form-input" name="tpl-type" checked={form.type === 'WhatsApp'} onChange={() => setForm(f => ({...f, type: 'WhatsApp'}))} />
                      <span>WhatsApp</span>
                   </label>
                </div>
              </div>
              <div className="plat-form-group plat-form-full">
                <label className="plat-form-label">Message Content <span className="plat-form-required">*</span></label>
                <div className="bg-faded rounded p-2 mb-2 text-xs text-muted border border-main">
                   Tip: Use <b>{"{name}"}</b>, <b>{"{date}"}</b> for variables.
                </div>
                <textarea 
                  className="plat-form-input" 
                  style={{ minHeight: '120px', fontFamily: 'monospace' }}
                  value={form.content} 
                  onChange={e => setForm(f => ({...f, content: e.target.value}))}
                  required
                  placeholder="Hello {name}, your appointment is confirmed for {date}..."
                />
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
