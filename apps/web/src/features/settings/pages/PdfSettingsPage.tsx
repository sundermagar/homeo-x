import React, { useState } from 'react';
import { FileText, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2, Layout, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePdfSettings, useCreatePdfSetting, useUpdatePdfSetting, useDeletePdfSetting } from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

const EMPTY_FORM = { templateName: '', headerHtml: '', footerHtml: '', margin: '20mm', isDefault: false };

export default function PdfSettingsPage() {
  const { data: configs = [], isLoading } = usePdfSettings();
  const createPdf = useCreatePdfSetting();
  const updatePdf = useUpdatePdfSetting();
  const deletePdf = useDeletePdfSetting();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (config: any) => {
    setEditingId(config.id);
    setForm({ 
      templateName: config.templateName, 
      headerHtml: config.headerHtml || '', 
      footerHtml: config.footerHtml || '', 
      margin: config.margin || '20mm',
      isDefault: config.isDefault || false
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updatePdf.mutateAsync({ id: editingId, ...form });
    } else {
      await createPdf.mutateAsync(form);
    }
    setIsModalOpen(false);
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
            <FileText size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            PDF & Report Settings
          </h1>
          <p className="plat-header-sub">Configure document headers, footers and printing layouts for clinical reports.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} strokeWidth={1.6} />
            Add Configuration
          </button>
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty">
            <RefreshCw size={22} className="animate-spin opacity-30" />
          </div>
        ) : configs.length === 0 ? (
          <div className="plat-empty">
            <Layout size={28} className="plat-empty-icon" />
            <p className="plat-empty-text">No PDF configurations found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>ID</th>
                  <th>Template Name</th>
                  <th>Margin</th>
                  <th style={{ width: '120px' }}>Type</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {configs.map((config: any) => (
                  <tr key={config.id}>
                    <td className="font-mono text-xs color-muted">{config.id}</td>
                    <td className="font-semibold">
                      <div className="flex items-center gap-2">
                        {config.templateName}
                        {config.isDefault && <CheckCircle2 size={14} className="text-success" />}
                      </div>
                    </td>
                    <td className="font-mono text-xs">{config.margin}</td>
                    <td>{config.isDefault ? <span className="plat-badge plat-badge-staff">Default</span> : <span className="plat-badge plat-badge-default">Custom</span>}</td>
                    <td>
                      <div className="flex gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(config)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => { if(confirm(`Delete config?`)) deletePdf.mutate(config.id) }}>
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
          <div className="plat-modal" style={{ maxWidth: '800px' }}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">{editingId ? 'Edit Configuration' : 'Add PDF Configuration'}</h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="plat-modal-body plat-form">
              <div className="grid grid-cols-2 gap-4">
                <div className="plat-form-group">
                  <label className="plat-form-label">Template Name <span className="plat-form-required">*</span></label>
                  <input 
                    className="plat-form-input" 
                    value={form.templateName} 
                    onChange={e => setForm(f => ({...f, templateName: e.target.value}))}
                    required 
                    placeholder="e.g. Standard Prescription"
                  />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Margin (CSS value)</label>
                  <input 
                    className="plat-form-input" 
                    value={form.margin} 
                    onChange={e => setForm(f => ({...f, margin: e.target.value}))}
                    placeholder="e.g. 20mm, 1in"
                  />
                </div>
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Header HTML</label>
                  <textarea 
                    className="plat-form-input font-mono text-xs" 
                    style={{ minHeight: '120px' }}
                    value={form.headerHtml} 
                    onChange={e => setForm(f => ({...f, headerHtml: e.target.value}))}
                    placeholder="<div>Clinic Header...</div>"
                  />
                </div>
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Footer HTML</label>
                  <textarea 
                    className="plat-form-input font-mono text-xs" 
                    style={{ minHeight: '120px' }}
                    value={form.footerHtml} 
                    onChange={e => setForm(f => ({...f, footerHtml: e.target.value}))}
                    placeholder="<div>Reg No: 12345...</div>"
                  />
                </div>
                <div className="plat-form-group plat-form-full plat-form-row pt-2">
                  <input 
                    type="checkbox" 
                    className="plat-form-input"
                    id="isDefault"
                    checked={form.isDefault} 
                    onChange={e => setForm(f => ({...f, isDefault: e.target.checked}))}
                  />
                  <label htmlFor="isDefault" className="plat-form-label">Set as default configuration</label>
                </div>
              </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary">Save Configuration</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
