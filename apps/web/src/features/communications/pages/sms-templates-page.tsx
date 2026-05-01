import { useState } from 'react';
import { Plus, Edit2, Trash2, CheckCircle2, MessageSquare, RefreshCw, Search } from 'lucide-react';
import {
  useSmsTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate
} from '../hooks/use-communications';
import { SmsType } from '@mmc/types';
import type { SmsTemplate, CreateSmsTemplateDto } from '@mmc/types';
import { Drawer } from '@/shared/components/drawer';
import { Pagination } from '@/components/shared/pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import '../../platform/styles/platform.css';
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
        <button type="button" className="plat-btn plat-btn-ghost" onClick={onClose}>Cancel</button>
        <button className="plat-btn plat-btn-primary" onClick={() => onSave(form as CreateSmsTemplateDto)}>
          <CheckCircle2 size={14} /> {initial ? 'Save Changes' : 'Create Template'}
        </button>
      </div>
    </Drawer>
  );
}

export default function SmsTemplatesPage() {
  const { data: templates = [], isLoading, refetch, isFetching } = useSmsTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [modal, setModal] = useState<null | 'create' | SmsTemplate>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.smsType.toLowerCase().includes(search.toLowerCase())
  );

  const totalItems = filtered.length;
  const paginatedData = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

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
    <div className="plat-page animate-fade-in">
      {/* Header */}
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <MessageSquare size={16} className="color-primary" />
            SMS Templates
          </h1>
          <p className="plat-header-sub">{templates.length} templates · Manage reusable message templates</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={() => setModal('create')}>
            <Plus size={14} /> New Template
          </button>
        </div>
      </div>

      {/* Search / Filters */}
      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search className="plat-search-icon" size={14} />
          <input
            type="text"
            className="plat-form-input plat-search-input"
            placeholder="Search templates by name or category..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="plat-card">
        {isLoading ? (
          <TableSkeleton rows={itemsPerPage} columns={6} />
        ) : filtered.length === 0 ? (
          <div className="plat-empty" style={{ minHeight: 240 }}>
            <MessageSquare size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No templates found. Create your first one.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Template Name</th>
                  <th style={{ width: '130px' }}>Category</th>
                  <th>Message Preview</th>
                  <th style={{ width: '90px' }}>Status</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((t, index) => (
                  <tr key={t.id} className="plat-table-row">
                    <td data-label="#" className="plat-mono-data text-xs">{(page - 1) * itemsPerPage + index + 1}</td>
                    <td data-label="NAME">
                      <div className="plat-tpl-name" style={{ fontWeight: 700, color: 'var(--pp-ink)' }}>{t.name}</div>
                    </td>
                    <td data-label="CATEGORY">
                      <span className="plat-badge plat-badge-default">{t.smsType}</span>
                    </td>
                    <td data-label="MESSAGE">
                      <div className="plat-tpl-preview">
                        {t.message}
                      </div>
                      <div className="plat-tpl-meta">
                        {t.message.length} chars · {Math.ceil(t.message.length / 160)} segment{Math.ceil(t.message.length / 160) > 1 ? 's' : ''}
                      </div>
                    </td>
                    <td data-label="STATUS">
                      <span className={t.isActive ? 'plat-badge plat-badge-info' : 'plat-badge plat-badge-default'}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td data-label="ACTIONS">
                      <div className="plat-tpl-actions" style={{ display: 'flex', gap: '6px' }}>
                        <button className="plat-btn plat-btn-ghost plat-btn-sm" onClick={() => setModal(t)} title="Edit">
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-ghost plat-btn-sm" style={{ color: 'var(--pp-danger-fg)' }} onClick={() => handleDelete(t)} title="Delete">
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

        {/* Pagination */}
        {!isLoading && totalItems > 0 && (
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(totalItems / itemsPerPage)}
            pageSize={itemsPerPage}
            totalItems={totalItems}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(size) => { setItemsPerPage(size); setPage(1); }}
          />
        )}
      </div>

      {/* Drawer */}
      <TemplateDrawer
        isOpen={!!modal}
        initial={(modal && typeof modal === 'object') ? modal : undefined}
        onClose={() => setModal(null)}
        onSave={handleSave}
      />

      <style>{`
        @media (max-width: 1024px) {
          .plat-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
          .plat-header-actions { width: 100%; }
          .plat-header-actions .plat-btn { width: 100%; justify-content: center; height: 44px; border-radius: 12px; }
          
          .plat-table-container { border: none !important; background: transparent !important; overflow: visible !important; }
          .plat-table { display: block !important; width: 100% !important; min-width: 0 !important; }
          .plat-table thead { display: none !important; }
          .plat-table tbody { display: block !important; width: 100% !important; }
          .plat-table-row { 
            display: block !important; 
            margin-bottom: 20px !important; 
            background: var(--bg-card) !important; 
            border: 1px solid var(--border-main) !important; 
            border-radius: 16px !important; 
            padding: 8px 0 !important;
            box-shadow: var(--pp-shadow-sm) !important;
            overflow: hidden;
          }
          .plat-table td {
            display: grid !important;
            grid-template-columns: 100px 1fr !important;
            gap: 12px !important;
            align-items: center !important;
            padding: 12px 20px !important;
            border-bottom: 1px dashed var(--border-main) !important;
            min-height: 44px;
            text-align: right !important;
            width: 100% !important;
            height: auto !important;
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
            opacity: 0.8;
          }
          
          .plat-tpl-name { font-weight: 700 !important; color: var(--text-main) !important; font-size: 14px !important; line-height: 1.2; }
          .plat-tpl-preview { 
            color: var(--text-main) !important; 
            font-size: 13px !important;
            white-space: normal !important; 
            text-align: right !important; 
            width: 100% !important; 
            word-break: break-word !important;
            line-height: 1.4 !important;
          }
          .plat-tpl-meta { text-align: right !important; width: 100% !important; font-size: 11px !important; color: var(--text-muted) !important; margin-top: 4px !important; }
          .plat-tpl-actions { justify-content: flex-end !important; width: 100% !important; gap: 12px !important; }
          .plat-tpl-actions .plat-btn { flex: 1; height: 40px; border-radius: 10px; }
          
          .plat-filters { flex-direction: column; align-items: stretch; }
          .plat-search-wrap { width: 100% !important; }
          .plat-search-input { width: 100% !important; height: 44px !important; border-radius: 12px !important; }
        }
      `}</style>
    </div>
  );
}
