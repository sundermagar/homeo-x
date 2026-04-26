import React, { useState } from 'react';
import { FileText, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2, Layout, CheckCircle2, Search, Printer, Eye, Settings, ShieldCheck, MapPin, Globe, Mail, Clock, Image as ImageIcon, Phone } from 'lucide-react';

import { Link } from 'react-router-dom';
import { usePdfSettings, useCreatePdfSetting, useUpdatePdfSetting, useDeletePdfSetting } from '../hooks/use-settings';
import { useOrganizations, useUpdateOrganization } from '../../platform/hooks/use-organizations';
import { useAuthStore } from '@/shared/stores/auth-store';
import { NumericInput } from '@/shared/components/NumericInput';
import '../../platform/styles/platform.css';

import '../styles/settings.css';

const EMPTY_FORM = { templateName: '', headerHtml: '', footerHtml: '', margin: '20mm', isDefault: false };

export default function PdfSettingsPage() {
  const { data: configs = [], isLoading } = usePdfSettings();
  const createPdf = useCreatePdfSetting();
  const updatePdf = useUpdatePdfSetting();
  const deletePdf = useDeletePdfSetting();

  const [activeTab, setActiveTab] = useState<'templates' | 'letterhead'>('templates');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  // ─── Clinic Details Config (Letterhead) ───
  const { data: orgs = [] } = useOrganizations();
  const updateOrg = useUpdateOrganization();
  const user = useAuthStore(s => s.user);

  const myOrg = orgs.find(o => o.id === user?.contextId) || orgs[0];
  const [clinicForm, setClinicForm] = useState<any>(null);

  React.useEffect(() => {
    if (myOrg) {
      setClinicForm({
        id: myOrg.id,
        name: myOrg.name,
        tagLine: myOrg.tagLine || '',
        registration: myOrg.registration || '',
        logo: myOrg.logo || '',
        address: myOrg.address || '',
        address2: myOrg.address2 || '',
        timing: myOrg.timing || '',
        email: myOrg.email || '',
        website: myOrg.website || '',
        phone: myOrg.phone || ''
      });
    }
  }, [myOrg]);

  const getLogoUrl = (logoPath: string) => {
    if (!logoPath) return '';
    if (logoPath.startsWith('http') || logoPath.startsWith('data:')) return logoPath;
    // Handle relative /uploads paths by ensuring they work through the proxy/base
    return logoPath;
  };

  const handleClinicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clinicForm) {
      try {
        await updateOrg.mutateAsync(clinicForm);
        alert('Institutional Identity Synchronized Successfully.');
      } catch (err: any) {
        alert('Protocol Synchronization Error: ' + (err.response?.data?.error || err.message));
      }
    }
  };

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
    <div className="plat-page fade-in">
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Layout size={20} className="color-primary" />
            PDF & Report Designer
          </h1>
          <p className="plat-header-sub">Manage institutional branding and clinical document layouts.</p>
        </div>
        <div className="plat-header-actions" style={{ flexWrap: 'wrap' }}>
          <div className="plat-view-toggle-group">
            <button
              className={`plat-view-toggle-btn ${activeTab === 'templates' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('templates')}
            >
              <FileText size={14} /> Templates
            </button>
            <button
              className={`plat-view-toggle-btn ${activeTab === 'letterhead' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('letterhead')}
            >
              <Printer size={14} /> Letterhead
            </button>
          </div>
          {activeTab === 'templates' && (
            <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
              <Plus size={14} /> Add Template
            </button>
          )}
        </div>
      </div>

      {activeTab === 'templates' ? (
        <>
          <div className="plat-stats-bar" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            <div className="plat-stat-card">
              <p className="plat-stat-label">Total Templates</p>
              <p className="plat-stat-value plat-stat-value-primary">{configs.length}</p>
            </div>
            <div className="plat-stat-card">
              <p className="plat-stat-label">Active Listing</p>
              <p className="plat-stat-value plat-stat-value-primary">{filteredConfigs.length}</p>
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
                      <tr key={config.id} className="plat-table-row">
                        <td data-label="ID" className="plat-table-cell font-mono text-xs color-muted">{config.id}</td>
                        <td data-label="Name" className="plat-table-cell font-semibold">
                          <div className="flex items-center gap-2">
                            {config.templateName}
                            {config.isDefault && <CheckCircle2 size={14} className="text-success" />}
                          </div>
                        </td>
                        <td data-label="Margin" className="plat-table-cell font-mono text-xs">{config.margin}</td>
                        <td data-label="Type" className="plat-table-cell">{config.isDefault ? <span className="plat-badge plat-badge-staff">Default</span> : <span className="plat-badge plat-badge-default">Custom</span>}</td>
                        <td className="plat-table-cell">
                          <div className="flex justify-end gap-3">
                            <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handlePrintPreview(config)} title="Preview & Print">
                              <Eye size={13} />
                            </button>
                            <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(config)}>
                              <Edit2 size={13} />
                            </button>
                            <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => { if (confirm(`Delete config?`)) deletePdf.mutate(config.id) }}>
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
        </>
      ) : (
        <div className="plat-settings-grid">
          <style>{`
            .plat-settings-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
            @media (min-width: 1024px) { .plat-settings-grid { grid-template-columns: 1.2fr 0.8fr; } }
            .letterhead-designer-card { padding: 24px; }
            @media (min-width: 640px) { .letterhead-designer-card { padding: 32px; } }
          `}</style>

          {/* Letterhead Designer Form */}
          <div className="plat-card letterhead-designer-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--pp-blue-tint)', color: 'var(--pp-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--pp-ink)', margin: 0 }}>Letterhead Identity Designer</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--pp-text-3)', margin: 0 }}>Configure the branding nodes used across all automated clinical documents.</p>
              </div>
            </div>

            {clinicForm && (
              <form onSubmit={handleClinicSubmit}>
                <div className="plat-form-grid-multi">
                  <div className="plat-form-group">
                    <label className="plat-form-label font-bold">CLINIC NAME*</label>
                    <input
                      className="plat-form-input"
                      value={clinicForm.name}
                      onChange={e => setClinicForm((f: any) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="plat-form-group">
                    <label className="plat-form-label font-bold">REGISTRATION / LICENSE</label>
                    <input
                      className="plat-form-input"
                      value={clinicForm.registration}
                      onChange={e => setClinicForm((f: any) => ({ ...f, registration: e.target.value }))}
                      placeholder="e.g. Reg No: 1725-A"
                    />
                  </div>
                </div>

                <div className="plat-form-group mt-6">
                  <label className="plat-form-label font-bold">PRIMARY TAGLINE / SLOGAN</label>
                  <input
                    className="plat-form-input"
                    value={clinicForm.tagLine}
                    onChange={e => setClinicForm((f: any) => ({ ...f, tagLine: e.target.value }))}
                    placeholder="e.g. Specialist in Chronic Diseases"
                  />
                </div>

                <div className="plat-form-group mt-6">
                  <label className="plat-form-label font-bold">LOGO ENDPOINT (URL)</label>
                  <input
                    className="plat-form-input font-mono text-xs"
                    value={clinicForm.logo}
                    onChange={e => setClinicForm((f: any) => ({ ...f, logo: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div className="plat-form-grid-multi mt-6">
                  <div className="plat-form-group">
                    <label className="plat-form-label font-bold">ADDRESS LINE 1</label>
                    <input
                      className="plat-form-input"
                      value={clinicForm.address}
                      onChange={e => setClinicForm((f: any) => ({ ...f, address: e.target.value }))}
                    />
                  </div>
                  <div className="plat-form-group">
                    <label className="plat-form-label font-bold">ADDRESS LINE 2 / LANDMARK</label>
                    <input
                      className="plat-form-input"
                      value={clinicForm.address2}
                      onChange={e => setClinicForm((f: any) => ({ ...f, address2: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="plat-form-grid-multi mt-6">
                  <div className="plat-form-group">
                    <label className="plat-form-label font-bold">CONTACT PHONE</label>
                    <NumericInput
                      className="plat-form-input"
                      value={clinicForm.phone}
                      onChange={e => setClinicForm((f: any) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div className="plat-form-group">
                    <label className="plat-form-label font-bold">CLINIC TIMINGS</label>
                    <input
                      className="plat-form-input"
                      value={clinicForm.timing}
                      onChange={e => setClinicForm((f: any) => ({ ...f, timing: e.target.value }))}
                      placeholder="e.g. 10:00 AM - 8:00 PM"
                    />
                  </div>
                </div>

                <div className="plat-form-grid-multi mt-6">
                  <div className="plat-form-group">
                    <label className="plat-form-label font-bold">OFFICIAL EMAIL</label>
                    <input
                      className="plat-form-input"
                      type="email"
                      value={clinicForm.email}
                      onChange={e => setClinicForm((f: any) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="plat-form-group">
                    <label className="plat-form-label font-bold">WEBSITE</label>
                    <input
                      className="plat-form-input"
                      value={clinicForm.website}
                      onChange={e => setClinicForm((f: any) => ({ ...f, website: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 40 }}>
                  <button type="submit" className="plat-btn plat-btn-primary px-12 h-12 text-base" disabled={updateOrg.isPending}>
                    {updateOrg.isPending ? 'Synchronizing Identity...' : 'INITIALIZE BRAND PROTOCOL'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Letterhead Live Preview - ENHANCED CANVAS */}
          <div className="letterhead-preview-sticky">
            <style>{`
               .letterhead-preview-sticky { position: relative; }
               @media (min-width: 1024px) { .letterhead-preview-sticky { position: sticky; top: 24px; } }
               .letterhead-canvas-outer { padding: 40px 20px; }
               @media (min-width: 640px) { .letterhead-canvas-outer { padding: 60px 40px; } }
             `}</style>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--pp-text-3)' }}>
                <Eye size={16} />
                <span style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Letterhead Canvas</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--pp-success-fg)' }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--pp-success-fg)' }}>Live Sync Active</span>
              </div>
            </div>

            <div className="plat-card letterhead-canvas-outer" style={{
              minHeight: '600px',
              background: 'var(--pp-warm-2)',
              border: '1px solid var(--pp-warm-4)',
              borderRadius: 32,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundImage: 'radial-gradient(var(--pp-warm-4) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              overflowX: 'auto',
              padding: '60px 20px'
            }}>
              <div className="letterhead-a4-sheet" style={{
                width: '100%',
                maxWidth: '540px',
                background: '#fff',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                borderRadius: '4px',
                minHeight: '760px',
                padding: '50px 45px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: '1px solid rgba(0,0,0,0.03)',
                boxSizing: 'border-box'
              }}>
                {/* Watermark/Scale hint */}
                <div style={{ position: 'absolute', top: 12, right: 15, fontSize: '7px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', background: '#f8fafc', padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>A4 PREVIEW • 1:1 SCALE</div>

                <div className="letterhead-canvas-header" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  paddingBottom: 28,
                  marginBottom: 0,
                  gap: 30,
                  padding: '20px 22px',
                  background: 'linear-gradient(135deg, #f8fbff 0%, #ffffff 60%)',
                  borderRadius: 12,
                  boxShadow: '0 2px 12px rgba(22, 101, 228, 0.06), inset 0 -1px 0 rgba(22, 101, 228, 0.08)'
                }}>
                  <style>{`
                      @media (max-width: 639px) {
                        .letterhead-canvas-header { flex-direction: column; align-items: center; text-align: center; }
                        .letterhead-canvas-header > div { justify-content: center !important; text-align: center !important; }
                      }
                    `}</style>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
                    <div
                      key={clinicForm?.logo}
                      style={{
                        height: 70,
                        minWidth: 70,
                        maxWidth: 160,
                        borderRadius: 10,
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(22, 101, 228, 0.08), inset 0 1px 2px rgba(255,255,255,0.8)',
                        flexShrink: 0,
                        padding: '4px 8px'
                      }}
                    >
                      {clinicForm?.logo ? (
                        <img
                          src={getLogoUrl(clinicForm.logo)}
                          style={{ height: '100%', width: 'auto', maxWidth: '100%', objectFit: 'contain' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const errEl = document.createElement('div');
                            errEl.style.cssText = 'color: var(--pp-text-4); font-size: 8px; text-align: center; padding: 6px; font-weight: 800;';
                            errEl.innerText = '403';
                            target.parentElement?.appendChild(errEl);
                          }}
                        />
                      ) : <ImageIcon size={24} style={{ color: 'var(--pp-warm-4)' }} />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, width: '100%' }}>
                      <h2 style={{
                        fontSize: '1.4rem',
                        fontWeight: 975,
                        color: '#0f172a',
                        margin: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '-0.03em',
                        lineHeight: 1.15,
                        overflowWrap: 'break-word',
                        fontFamily: 'Georgia, "Times New Roman", serif'
                      }}>
                        {clinicForm?.name || 'Clinic Name'}
                      </h2>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, background: 'linear-gradient(135deg, #16a1e4 0%, #6366f1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '3px 0 0', letterSpacing: '0.02em' }}>
                        {clinicForm?.tagLine || 'Primary Specialty'}
                      </p>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: '8px 0 0', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 999, padding: '3px 8px 3px 5px', maxWidth: 'fit-content' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 2px rgba(34,197,94,0.3)' }} />
                        <ShieldCheck size={10} style={{ color: '#16a1e4' }} />
                        <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clinicForm?.registration || 'REGISTRATION'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 8, borderLeft: '1.5px solid #e2e8f0', paddingLeft: 16, minWidth: '140px', maxWidth: '165px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ fontSize: '0.68rem', color: '#334155', fontWeight: 700, display: 'flex', alignItems: 'flex-start', gap: 5, justifyContent: 'flex-end', lineHeight: 1.35 }}>
                        <MapPin size={11} style={{ color: '#6366f1', flexShrink: 0, marginTop: 1 }} />
                        <span style={{ overflowWrap: 'break-word' }}>{clinicForm?.address || 'Site Geography'}</span>
                      </div>
                      {clinicForm?.address2 && (
                        <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 500, paddingRight: 16 }}>{clinicForm?.address2}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ fontSize: '0.68rem', color: '#334155', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                        <Phone size={11} style={{ color: '#6366f1' }} />
                        <span>{clinicForm?.phone || 'Contact'}</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#334155', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                        <Clock size={11} style={{ color: '#6366f1' }} />
                        <span>{clinicForm?.timing || 'Schedule'}</span>
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', marginTop: 2, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 999, padding: '3px 8px 3px 6px' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse-green 2s infinite' }} />
                        <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Open for Appointments</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Refined Divider */}
                <div style={{ width: '100%', marginBottom: 30 }}>
                  <div style={{ height: 3, width: '100%', background: 'linear-gradient(90deg, #16a1e4 0%, #6366f1 50%, #8b5cf6 100%)', borderRadius: 3, boxShadow: '0 1px 4px rgba(22, 101, 228, 0.25)' }} />
                  <div style={{ height: 1, width: '100%', background: '#f1f5f9', marginTop: 3 }} />
                </div>

                <div style={{ padding: '20px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 35 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Patient Details</div>
                      <div style={{ height: 12, width: 140, background: '#f1f5f9', borderRadius: 3 }} />
                      <div style={{ height: 10, width: 90, background: '#f8fafc', borderRadius: 3 }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date & Reference</div>
                      <div style={{ height: 12, width: 100, background: '#f1f5f9', borderRadius: 3 }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 40 }}>
                    <div style={{
                      fontSize: '2.5rem',
                      fontWeight: 400,
                      color: '#cbd5e1',
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontStyle: 'italic',
                      marginBottom: 15,
                      lineHeight: 1
                    }}>Rx</div>
                    <div style={{ display: 'grid', gap: 14, paddingLeft: 20 }}>
                      <div style={{ height: 8, width: '100%', background: '#f8fafc', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '40%', background: 'linear-gradient(90deg, #e2e8f0, #f8fafc)', borderRadius: 4 }} />
                      </div>
                      <div style={{ height: 8, width: '85%', background: '#f8fafc', borderRadius: 4 }} />
                      <div style={{ height: 8, width: '92%', background: '#f8fafc', borderRadius: 4 }} />
                    </div>
                  </div>

                  <div style={{
                    marginTop: 'auto',
                    border: '1px dashed #cbd5e1',
                    borderRadius: 16,
                    padding: '35px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(248,250,252,0.6) 100%)',
                    minHeight: 160,
                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.01)'
                  }}>
                    <FileText size={32} style={{ color: '#94a3b8', marginBottom: 12, strokeWidth: 1.5 }} />
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Dynamic Content Area</p>
                    <p style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 6, margin: 0, fontWeight: 500 }}>System automatically injects Prescriptions, Invoices, or Clinical Reports here.</p>
                  </div>
                </div>

                <div className="letterhead-canvas-footer" style={{
                  marginTop: 30,
                  paddingTop: 20,
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  gap: 16
                }}>
                  <style>{`
                      @media (max-width: 639px) {
                        .letterhead-canvas-footer { flex-direction: column; text-align: center; align-items: center; }
                        .letterhead-footer-left { justify-content: center; }
                        .letterhead-footer-right { text-align: center !important; margin-top: 10px; }
                      }
                    `}</style>
                  <div className="letterhead-footer-left" style={{ display: 'flex', gap: 30, flexWrap: 'wrap', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Website</span>
                      <div style={{ fontSize: '0.7rem', color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Globe size={12} style={{ color: '#16a1e4' }} /> {clinicForm?.website || 'www.clinic-portal.com'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inquiries</span>
                      <div style={{ fontSize: '0.7rem', color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Mail size={12} style={{ color: '#16a1e4' }} /> {clinicForm?.email || 'contact@clinic.com'}
                      </div>
                    </div>
                  </div>
                  <div className="letterhead-footer-right" style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Secure PDF Engine</div>
                    <div style={{ fontSize: '0.55rem', color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>Digitally Verified • HomeoX v2.0</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="plat-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="plat-modal-content max-w-4xl" onClick={e => e.stopPropagation()}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">{editingId ? 'Edit Configuration' : 'Add PDF Configuration'}</h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="plat-modal-body">
                <div className="plat-form-section">
                  <div className="plat-form-grid-multi">
                    <div className="plat-form-group">
                      <label className="plat-form-label font-bold">Template Name *</label>
                      <input
                        className="plat-form-input"
                        value={form.templateName}
                        onChange={e => setForm(f => ({ ...f, templateName: e.target.value }))}
                        required
                        placeholder="e.g. Standard Prescription"
                      />
                    </div>
                    <div className="plat-form-group">
                      <label className="plat-form-label font-bold">Margin (CSS value)</label>
                      <input
                        className="plat-form-input"
                        value={form.margin}
                        onChange={e => setForm(f => ({ ...f, margin: e.target.value }))}
                        placeholder="e.g. 20mm, 1in"
                      />
                    </div>
                  </div>

                  <div className="plat-form-group mt-4">
                    <label className="plat-form-label font-bold">Header HTML</label>
                    <textarea
                      className="plat-form-input font-mono text-xs leading-relaxed"
                      style={{ minHeight: '140px' }}
                      value={form.headerHtml}
                      onChange={e => setForm(f => ({ ...f, headerHtml: e.target.value }))}
                      placeholder="<div>Clinic Header...</div>"
                    />
                  </div>

                  <div className="plat-form-group mt-4">
                    <label className="plat-form-label font-bold">Footer HTML</label>
                    <textarea
                      className="plat-form-input font-mono text-xs leading-relaxed"
                      style={{ minHeight: '140px' }}
                      value={form.footerHtml}
                      onChange={e => setForm(f => ({ ...f, footerHtml: e.target.value }))}
                      placeholder="<div>Reg No: 12345...</div>"
                    />
                  </div>

                  <div className="flex items-center gap-2 py-4 mt-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-primary"
                      id="isDefaultPdf"
                      checked={form.isDefault}
                      onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
                    />
                    <label htmlFor="isDefaultPdf" className="plat-form-label mb-0 cursor-pointer font-bold">Set as default configuration</label>
                  </div>
                </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary px-8">Save Configuration</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
