import { useState } from 'react';
import { Plus, Edit2, Trash2, X, CheckCircle2, MessageSquare, RefreshCw, Search } from 'lucide-react';
import {
  useSmsTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate
} from '../hooks/use-communications';
import { SmsType } from '@mmc/types';
import type { SmsTemplate, CreateSmsTemplateDto } from '@mmc/types';
import { Drawer } from '@/shared/components/drawer';
import '../styles/communications.css';

const SMS_TYPES = Object.values(SmsType);

function TemplateDrawer({
  initial, onClose, onSave, isOpen
}: {
  initial?: SmsTemplate;
  onClose: () => void;
  onSave: (data: CreateSmsTemplateDto) => void;
  isOpen: boolean;
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
    <Drawer 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initial ? 'Edit Template' : 'New SMS Template'}
      maxWidth="540px"
    >
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
        <textarea className="comm-form-textarea" style={{ minHeight: '120px' }}
          placeholder="Enter your message..."
          value={form.message} onChange={e => set('message', e.target.value)} required />
        <div className={`comm-char-count${charCount > 160 ? ' over' : ''}`} style={{ marginTop: '4px' }}>
          {charCount} / 160 (SMS segment)
        </div>
      </div>
      <div className="comm-placeholder-hint">
        Available: <code>{'{#name#}'}</code> <code>{'{#date#}'}</code> <code>{'{#clinic#}'}</code>
      </div>
      {preview && (
        <div className="comm-form-group" style={{ marginTop: '16px' }}>
          <label className="comm-form-label">Preview</label>
          <div className="comm-preview-box" style={{ background: 'var(--pp-warm-1)', border: '1.5px dashed var(--pp-warm-4)', borderRadius: '12px' }}>
            {preview}
          </div>
        </div>
      )}
      <div className="comm-form-group" style={{ marginTop: '12px' }}>
        <label className="comm-form-checkbox">
          <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />
          Active (available for sending)
        </label>
      </div>
      <div className="plat-modal-footer" style={{ padding: '24px 0 0 0', marginTop: '24px', borderTop: '1px solid var(--pp-warm-4)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button type="button" className="pp-btn pp-btn-secondary" onClick={onClose}>Cancel</button>
        <button className="pp-btn pp-btn-primary" onClick={() => onSave(form as CreateSmsTemplateDto)}>
          <CheckCircle2 size={14} /> {initial ? 'Save Changes' : 'Create Template'}
        </button>
      </div>
    </Drawer>
  );
}

function TemplateSkeleton() {
  return (
    <div className="comm-template-item">
      <div className="comm-template-item-header">
        <div style={{ width: '100%' }}>
          <div className="pp-skeleton pp-skeleton-title" style={{ width: '40%' }}></div>
          <div className="pp-skeleton pp-skeleton-text" style={{ width: '20%', height: '16px' }}></div>
        </div>
      </div>
      <div className="pp-skeleton pp-skeleton-text" style={{ height: '40px', marginTop: '12px' }}></div>
      <div className="pp-skeleton pp-skeleton-text" style={{ width: '30%', marginTop: '8px' }}></div>
    </div>
  );
}

export default function SmsTemplatesPage() {
  const { data: templates = [], isLoading, refetch, isFetching } = useSmsTemplates();
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
    <div className="pp-page-container comm-page animate-fade-in">
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
          <button className="comm-btn comm-btn-sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={13} className={isFetching ? "comm-spin" : ""} /> Refresh
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
          <div className="comm-template-grid">
            {[1, 2, 3, 4].map(i => <TemplateSkeleton key={i} />)}
          </div>
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
        
        {/* Pagination */}
        {!isLoading && filtered.length > 0 && (
          <div className="pp-pagination-bar">
            <div className="pp-pagination-info-wrap">
              <span className="pp-pagination-info">Showing 1-{filtered.length} of {templates.length}</span>
            </div>
            <div className="pp-pagination-controls">
              <button className="pp-pagination-btn" disabled><RefreshCw size={14} /></button>
              <button className="pp-pagination-page is-active">1</button>
              <button className="pp-pagination-btn" disabled><RefreshCw size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <TemplateDrawer
        isOpen={!!modal}
        initial={(modal && typeof modal === 'object') ? modal : undefined}
        onClose={() => setModal(null)}
        onSave={handleSave}
      />
    </div>
  );
}
