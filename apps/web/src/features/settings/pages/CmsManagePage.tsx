import React, { useState } from 'react';
import { Monitor, Plus, X, RefreshCw, Trash2, Edit2, Globe, Search, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStaticPages, useCreateStaticPage, useUpdateStaticPage, useDeleteStaticPage } from '../hooks/use-settings';
import { Drawer } from '@/shared/components/drawer';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';

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

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(filteredPages);

  return (
    <div className="plat-page fade-in">

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
          <p className="plat-stat-label">Total Pages</p>
          <p className="plat-stat-value plat-stat-value-primary">{pages.length}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Live Content</p>
          <p className="plat-stat-value plat-stat-value-success">
            {pages.filter((p: any) => p.isActive).length}
          </p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Drafts</p>
          <p className="plat-stat-value plat-stat-value-danger">
            {pages.filter((p: any) => !p.isActive).length}
          </p>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={14} className="plat-search-icon" />
          <input
            className="plat-form-input plat-search-input"
            placeholder="Search by title or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : filteredPages.length === 0 ? (
          <div className="plat-empty">
            <Globe size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No static pages found.</p>
          </div>
        ) : (
          <>
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
                {paginatedData.map((page: any) => (
                  <tr key={page.id} className="plat-table-row">
                    <td data-label="ID" className="plat-table-cell font-mono text-xs color-muted">{page.id}</td>
                    <td data-label="Title" className="plat-table-cell">
                      <div className="plat-cell-val">
                        <div className="font-semibold">{page.title}</div>
                        <div className="text-xs color-muted mt-0.5">Last updated: {new Date().toLocaleDateString()}</div>
                      </div>
                    </td>
                    <td data-label="Slug" className="plat-table-cell">
                      <div className="plat-cell-val">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-primary bg-faded px-2 py-0.5 rounded-md w-fit border border-main">
                          /{page.slug}
                          <ArrowUpRight size={10} className="opacity-50" />
                        </div>
                      </div>
                    </td>
                    <td data-label="Status" className="plat-table-cell">
                      <div className="plat-cell-val">
                        {page.isActive ?
                          <span className="plat-badge plat-badge-staff">Published</span> :
                          <span className="plat-badge plat-badge-default">Draft Mode</span>
                        }
                      </div>
                    </td>
                    <td data-label="Actions" className="plat-table-cell">
                      <div className="plat-cell-val">
                        <div className="flex justify-end gap-3" style={{ width: '100%' }}>
                          <button className="plat-btn plat-btn-sm plat-btn-icon" style={{ width: 36, height: 36, borderRadius: 10 }} onClick={() => handleEdit(page)} title="Edit Content">
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger"
                            style={{ width: 36, height: 36, borderRadius: 10 }}
                            onClick={() => { if (confirm(`Archive page "${page.title}"?`)) deletePage.mutate(page.id) }}
                            title="Delete Page"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onLimitChange={setItemsPerPage}
          />
          </>
        )}
      </div>

      {/* ─── Page Modal ─── */} <Drawer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Update Page Content' : 'Create New Static Page'}
        maxWidth="500px"
      >
        <form onSubmit={handleSubmit}>
          <div className="plat-modal-body" style={{ padding: 0 }}>
            <div className="plat-form-section" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
              <div className="plat-form-grid-multi" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="plat-form-group">
                  <label className="plat-form-label font-bold">Page Title *</label>
                  <input
                    className="plat-form-input"
                    placeholder="e.g. Terms of Service"
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label font-bold">URL Slug *</label>
                  <div className="plat-input-wrapper">
                    <Globe size={14} className="plat-input-icon opacity-50" />
                    <input
                      className="plat-form-input pl-8"
                      style={{ fontFamily: 'monospace' }}
                      value={form.slug}
                      onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/ /g, '-') }))}
                      required
                      placeholder="terms-and-conditions"
                    />
                  </div>
                </div>
              </div>

              <div className="plat-form-group mt-6">
                <label className="plat-form-label font-bold flex justify-between">
                  Page Body (Markdown Supported)
                  <span className="text-[10px] uppercase tracking-wider text-muted font-bold opacity-60">Rich Editor</span>
                </label>
                <textarea
                  className="plat-form-input font-mono text-xs leading-relaxed"
                  style={{ minHeight: '400px', padding: '16px' }}
                  placeholder="## Introduction\n\nWrite your content here..."
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                />
              </div>

              <div className="flex items-center gap-2 py-4 mt-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-primary"
                  id="page_active_cms"
                  checked={form.isActive}
                  onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
                />
                <div>
                  <label htmlFor="page_active_cms" className="plat-form-label cursor-pointer mb-0 font-bold">Publish this page</label>
                  <p className="text-[10px] text-muted -mt-0.5">Visible to public/staff when checked.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="plat-modal-footer" style={{ padding: '24px 0 0 0', marginTop: '24px' }}>
            <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="plat-btn plat-btn-primary px-8">
              {editingId ? 'Save Changes' : 'Publish Page'}
            </button>
          </div>
        </form>
      </Drawer>

    </div>
  );
}
