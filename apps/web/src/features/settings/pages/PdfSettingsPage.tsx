import React, { useState } from 'react';
import { FileText, Plus, X, RefreshCw, Trash2, Edit2, Layout, CheckCircle2, Search, Printer, Eye  } from 'lucide-react';

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
  const [search, setSearch] = useState('');

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

  const filteredConfigs = configs.filter((c: any) => 
    c.templateName.toLowerCase().includes(search.toLowerCase())
  );

  const handlePrintList = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>PDF Configuration Catalog</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            h1 { color: #16A1E4; margin-bottom: 5px; }
            p { color: #666; font-size: 13px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; background: #f8f9fa; padding: 12px; border-bottom: 2px solid #eee; font-size: 13px; }
            td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
            .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; background: #eee; }
            .badge-default { background: #16A1E4; color: #fff; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #16A1E4; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Confirm Print</button>
          </div>
          <h1>PDF & Report Settings Catalog</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Template Name</th>
                <th>Margin</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredConfigs.map(c => `
                <tr>
                  <td>${c.id}</td>
                  <td><strong>${c.templateName}</strong></td>
                  <td>${c.margin}</td>
                  <td><span class="badge ${c.isDefault ? 'badge-default' : ''}">${c.isDefault ? 'Default' : 'Custom'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintPreview = (config: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Preview: ${config.templateName}</title>
          <style>
            body { margin: 0; padding: 0; }
            .page-container { 
              width: 210mm; 
              min-height: 297mm; 
              padding: ${config.margin || '20mm'}; 
              margin: 0 auto;
              background: #fff;
              display: flex;
              flex-direction: column;
              border: 1px solid #eee;
            }
            header { margin-bottom: 20px; }
            footer { margin-top: auto; padding-top: 20px; border-top: 1px solid #eee; }
            .content-area { flex-grow: 1; padding: 40px 0; border: 1px dashed #ddd; text-align: center; color: #999; }
            @media print { 
              .no-print { display: none; } 
              .page-container { border: none; margin: 0; width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="padding: 15px; background: #f8f9fa; border-bottom: 1px solid #ddd; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 25px; background: #16A1E4; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Print Preview Report</button>
          </div>
          <div class="page-container">
            <header>${config.headerHtml || '<!-- No Header Defined -->'}</header>
            <div class="content-area">
              <h2 style="color: #ccc; margin-top: 100px;">REPORT CONTENT PREVIEW AREA</h2>
              <p>This space represents where clinical data, prescriptions, or bills will be rendered.</p>
            </div>
            <footer>${config.footerHtml || '<!-- No Footer Defined -->'}</footer>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="plat-page animate-fade-in">
      

      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <FileText size={20} className="color-primary" />
            PDF & Report Settings
          </h1>
          <p className="plat-header-sub">Configure layouts for clinical reports.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn" onClick={handlePrintList} title="Print Catalog">
            <Printer size={14} />
            Print Report
          </button>
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} />
            Add Configuration
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <span className="plat-stat-label">Total Templates</span>
          <span className="plat-stat-value">{configs.length}</span>
        </div>
        <div className="plat-stat-card">
          <span className="plat-stat-label">Active Listing</span>
          <span className="plat-stat-value plat-stat-value-success">
            {filteredConfigs.length}
          </span>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={16} className="plat-search-icon" />
          <input 
            className="plat-filter-input plat-search-input"
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
        ) : filteredConfigs.length === 0 ? (
          <div className="plat-empty">
            <Layout size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No configurations found.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>ID</th>
                  <th>Template Name</th>
                  <th>Margin</th>
                  <th style={{ width: '120px' }}>Type</th>
                  <th style={{ width: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredConfigs.map((config: any) => (
                  <tr key={config.id}>
                    <td data-label="ID">{config.id}</td>
                    <td data-label="Name">
                      <div className="flex items-center gap-2">
                        {config.templateName}
                        {config.isDefault && <CheckCircle2 size={14} className="text-success" />}
                      </div>
                    </td>
                    <td data-label="Margin">{config.margin}</td>
                    <td data-label="Type">{config.isDefault ? <span className="plat-badge plat-badge-staff">Default</span> : <span className="plat-badge plat-badge-default">Custom</span>}</td>
                    <td>
                      <div className="flex justify-end gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handlePrintPreview(config)} title="Preview & Print">
                          <Eye size={13} />
                        </button>
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
        <div className="plat-modal-overlay animate-fade-in" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
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
