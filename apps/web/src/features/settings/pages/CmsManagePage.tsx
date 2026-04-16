import React, { useState } from 'react';
import { Monitor, Plus, X, RefreshCw, Trash2, Edit2, Globe, Search, ArrowUpRight  } from 'lucide-react';

import { useStaticPages, useCreateStaticPage, useUpdateStaticPage, useDeleteStaticPage } from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

export default function CmsManagePage() {
  // Static Pages Hooks
  const { data: pages = [], isLoading } = useStaticPages();
  const createPage = useCreateStaticPage();
  const updatePage = useUpdateStaticPage();
  const deletePage = useDeleteStaticPage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  
  // Page form state
  const [form, setForm] = useState({ slug: '', title: '', content: '', isActive: true });

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({ slug: '', title: '', content: '', isActive: true });
    setIsModalOpen(true);
  };

  const handleEdit = (page: any) => {
    setEditingId(page.id);
    setForm({ slug: page.slug, title: page.title, content: page.content || '', isActive: page.isActive });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) await updatePage.mutateAsync({ id: editingId, ...form });
    else await createPage.mutateAsync(form);
    setIsModalOpen(false);
  };

  const filteredPages = pages.filter((p: any) => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="plat-page animate-fade-in">
      

      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Monitor size={20} className="color-primary" />
            Static Pages
          </h1>
          <p className="plat-header-sub">Manage clinical website content, privacy policies, and public documents.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} />
            Add New Page
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <span className="plat-stat-label">Total Pages</span>
          <span className="plat-stat-value">{pages.length}</span>
        </div>
        <div className="plat-stat-card">
          <span className="plat-stat-label">Live Content</span>
          <span className="plat-stat-value plat-stat-value-success">
            {pages.filter((p: any) => p.isActive).length}
          </span>
        </div>
        <div className="plat-stat-card">
          <span className="plat-stat-label">Drafts</span>
          <span className="plat-stat-value text-muted">
            {pages.filter((p: any) => !p.isActive).length}
          </span>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={16} className="plat-search-icon" />
          <input 
            className="plat-filter-input plat-search-input"
            placeholder="Search by title or slug..."
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
        ) : filteredPages.length === 0 ? (
          <div className="plat-empty">
            <Globe size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No static pages found.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>ID</th>
                  <th>Page Title</th>
                  <th>Public Slug</th>
                  <th style={{ width: '120px' }}>Status</th>
                  <th style={{ width: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPages.map((page: any) => (
                  <tr key={page.id}>
                    <td data-label="ID">{page.id}</td>
                    <td data-label="Title">
                      <div className="font-semibold">{page.title}</div>
                      <div className="text-xs color-muted mt-0.5">Last updated: {new Date().toLocaleDateString()}</div>
                    </td>
                    <td data-label="Slug">
                      <div className="flex items-center gap-1.5 font-mono text-xs text-primary bg-faded px-2 py-0.5 rounded-md w-fit border border-main">
                        /{page.slug}
                        <ArrowUpRight size={10} className="opacity-50" />
                      </div>
                    </td>
                    <td data-label="Status">
                      {page.isActive ? 
                        <span className="plat-badge plat-badge-staff">Published</span> : 
                        <span className="plat-badge plat-badge-default">Draft Mode</span>
                      }
                    </td>
                    <td>
                      <div className="flex justify-end gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleEdit(page)} title="Edit Content">
                          <Edit2 size={13} />
                        </button>
                        <button 
                          className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" 
                          onClick={() => { if(confirm(`Archive page "${page.title}"?`)) deletePage.mutate(page.id) }} 
                          title="Delete Page"
                        >
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

      {/* ─── Page Modal ─── */}
      {isModalOpen && (
        <div className="plat-modal-overlay animate-fade-in" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="plat-modal" style={{ maxWidth: '850px' }}>
            <div className="plat-modal-header border-none pb-0">
              <div>
                <h2 className="plat-modal-title">{editingId ? 'Update Page Content' : 'Create New Static Page'}</h2>
                <p className="text-xs text-muted mt-1">Define titles, slugs and rich content for your platform pages.</p>
              </div>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}><X size={16} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="plat-modal-body plat-form">
                <div className="grid grid-cols-2 gap-6">
                  <div className="plat-form-group">
                    <label className="plat-form-label">Page Title <span className="plat-form-required">*</span></label>
                    <input 
                      className="plat-form-input" 
                      placeholder="e.g. Terms of Service"
                      value={form.title} 
                      onChange={e => setForm(p => ({...p, title: e.target.value}))} 
                      required 
                    />
                  </div>
                  <div className="plat-form-group">
                    <label className="plat-form-label">URL Slug <span className="plat-form-required">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted font-mono">/</span>
                      <input 
                        className="plat-form-input pl-6" 
                        style={{ fontFamily: 'monospace' }}
                        value={form.slug} 
                        onChange={e => setForm(p => ({...p, slug: e.target.value.toLowerCase().replace(/ /g, '-')}))} 
                        required 
                        placeholder="terms-and-conditions" 
                      />
                    </div>
                  </div>
                  <div className="plat-form-group plat-form-full">
                    <label className="plat-form-label flex justify-between">
                      Page Body (Markdown Supported)
                      <span className="text-[10px] uppercase tracking-wider text-muted font-bold">Rich Text Editor</span>
                    </label>
                    <textarea 
                      className="plat-form-input font-mono text-xs leading-relaxed" 
                      style={{ minHeight: '380px', padding: '16px' }} 
                      placeholder="## Introduction\n\nWrite your content here..."
                      value={form.content} 
                      onChange={e => setForm(p => ({...p, content: e.target.value}))} 
                    />
                  </div>
                  <div className="plat-form-group plat-form-full plat-form-row bg-faded p-3 rounded-lg border border-main">
                    <input 
                      type="checkbox" 
                      className="plat-form-input w-4 h-4" 
                      id="page_active" 
                      checked={form.isActive} 
                      onChange={e => setForm(p => ({...p, isActive: e.target.checked}))} 
                    /> 
                    <div className="ml-1">
                      <label htmlFor="page_active" className="plat-form-label cursor-pointer mb-0 font-semibold">Publish this page</label>
                      <p className="text-[11px] text-muted">When unchecked, the page will remain as a draft and hidden from public view.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="plat-modal-footer bg-faded">
                 <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                 <button type="submit" className="plat-btn plat-btn-primary px-8">
                   {editingId ? 'Save Changes' : 'Publish Page'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
