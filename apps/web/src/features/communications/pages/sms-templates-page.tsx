import { useState } from 'react';
import { Plus, Edit2, Trash2, X, CheckCircle2, MessageSquare, RefreshCw, Search } from 'lucide-react';
import {
  useSmsTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate
} from '../hooks/use-communications';
import { SmsType } from '@mmc/types';
import type { SmsTemplate, CreateSmsTemplateDto } from '@mmc/types';
import '../styles/communications.css';

const SMS_TYPES = Object.values(SmsType);

function TemplateFormModal({
  initial, onClose, onSave,
}: {
  initial?: SmsTemplate;
  onClose: () => void;
  onSave: (data: CreateSmsTemplateDto) => void;
}) {
  const [form, setForm] = useState({
    name:     initial?.name     ?? '',
    message:  initial?.message  ?? '',
    smsType:  initial?.smsType  ?? SmsType.General,
    isActive: initial?.isActive ?? true,
  });

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const charCount = form.message.length;
  const preview = form.message
    .replace(/{#name#}/gi, 'Rajesh Kumar')
    .replace(/{#date#}/gi, new Date().toLocaleDateString('en-IN'));

  return (
    <div className="comm-modal-overlay" onClick={onClose}>
      <div className="comm-modal" onClick={e => e.stopPropagation()}>
        <div className="comm-modal-header">
          <h2 className="comm-modal-title">
            {initial ? 'Edit Template' : 'New SMS Template'}
          </h2>
          <button className="comm-btn comm-btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form as CreateSmsTemplateDto); }}>
          <div className="comm-modal-body">
            <div className="comm-form-group">
              <label className="comm-form-label">Template Name *</label>
              <input className="comm-form-input" placeholder="e.g. Appointment Reminder"
                value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="comm-form-group">
              <label className="comm-form-label">Category</label>
              <select className="comm-form-select" value={form.smsType} onChange={e => set('smsType', e.target.value)}>
                {SMS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="comm-form-group">
              <label className="comm-form-label">Message Body *</label>
              <textarea className="comm-form-textarea" placeholder="Enter your message..."
                value={form.message} onChange={e => set('message', e.target.value)} required />
              <div className={`comm-char-count${charCount > 160 ? ' over' : ''}`}>
                {charCount} / 160 (SMS segment)
              </div>
            </div>
            <div className="comm-placeholder-hint">
              Available placeholders: <code>{'{#name#}'}</code> <code>{'{#date#}'}</code> <code>{'{#clinic#}'}</code>
            </div>
            {preview && (
              <div className="comm-form-group">
                <label className="comm-form-label">Preview</label>
                <div className="comm-preview-box">{preview}</div>
              </div>
            )}
            <div className="comm-form-group">
              <label className="comm-form-checkbox">
                <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />
                Active (available for sending)
              </label>
            </div>
          </div>
          <div className="comm-modal-footer">
            <button type="button" className="comm-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="comm-btn comm-btn-primary">
              <CheckCircle2 size={14} /> {initial ? 'Save Changes' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SmsTemplatesPage() {
  const { data: templates = [], isLoading, refetch } = useSmsTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [modal, setModal] = useState<null | 'create' | SmsTemplate>(null);
  const [search, setSearch] = useState('');

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.smsType.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (data: CreateSmsTemplateDto) => {
    if (modal && typeof modal !== 'string') {
      await updateTemplate.mutateAsync({ id: modal.id, dto: data });
    } else {
      await createTemplate.mutateAsync(data);
    }
    setModal(null);
  };

  const handleDelete = async (t: SmsTemplate) => {
    if (confirm(`Delete template "${t.name}"?`)) {
      await deleteTemplate.mutateAsync(t.id);
    }
  };

  return (
    <div className="comm-page">
      {/* Header */}
      <header className="comm-header">
        <div>
          <h1 className="comm-title">
            <MessageSquare size={20} strokeWidth={1.6} className="comm-title-icon-blue" />
            SMS Templates
          </h1>
          <p className="comm-subtitle">{templates.length} templates · Manage reusable message templates</p>
        </div>
        <div className="comm-header-actions">
          <button className="comm-btn comm-btn-sm" onClick={() => refetch()}>
            <RefreshCw size={13} className="comm-spin" /> Refresh
          </button>
          <button className="comm-btn comm-btn-primary comm-btn-sm" onClick={() => setModal('create')}>
            <Plus size={14} /> New Template
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="comm-filters">
        <div className="comm-search-wrap">
          <Search size={14} className="comm-search-icon" />
          <input
            className="comm-filter-input comm-filter-input-search"
            placeholder="Search templates…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="comm-result-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Grid */}
      <div className="comm-card">
        {isLoading ? (
          <div className="comm-loading"><RefreshCw size={22} className="comm-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="comm-empty">
            <MessageSquare size={36} className="comm-empty-icon" />
            <p className="comm-empty-text">No templates found. Create your first one.</p>
          </div>
        ) : (
          <div className="comm-template-grid">
            {filtered.map(t => (
              <div key={t.id} className="comm-template-item">
                <div className="comm-template-item-header">
                  <div>
                    <div className="comm-template-name">{t.name}</div>
                    <span className="comm-type-tag">{t.smsType}</span>
                  </div>
                  <div className="comm-template-actions">
                    <button className="comm-btn comm-btn-icon comm-btn-sm" onClick={() => setModal(t)} title="Edit">
                      <Edit2 size={13} />
                    </button>
                    <button className="comm-btn comm-btn-icon comm-btn-sm comm-btn-danger" onClick={() => handleDelete(t)} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="comm-template-message">
                  {t.message.length > 100 ? t.message.slice(0, 100) + '…' : t.message}
                </div>
                <div className="comm-template-meta">
                  {t.message.length} chars ·{' '}
                  <span className={t.isActive ? 'comm-template-active' : 'comm-template-inactive'}>
                    {t.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <TemplateFormModal
          initial={typeof modal === 'object' ? modal : undefined}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
