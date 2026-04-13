import React, { useState } from 'react';
import { Monitor, HelpCircle, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2, ChevronDown, ChevronUp, FileText, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStaticPages, useCreateStaticPage, useUpdateStaticPage, useDeleteStaticPage, useFaqs, useCreateFaq, useUpdateFaq, useDeleteFaq } from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

export default function CmsManagePage() {
  const [activeTab, setActiveTab] = useState<'pages' | 'faqs'>('pages');
  
  // Static Pages Hooks
  const { data: pages = [], isLoading: loadingPages } = useStaticPages();
  const createPage = useCreateStaticPage();
  const updatePage = useUpdateStaticPage();
  const deletePage = useDeleteStaticPage();

  // FAQ Hooks
  const { data: faqs = [], isLoading: loadingFaqs } = useFaqs();
  const createFaq = useCreateFaq();
  const updateFaq = useUpdateFaq();
  const deleteFaq = useDeleteFaq();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Unified form state (simple approach)
  const [pageForm, setPageForm] = useState({ slug: '', title: '', content: '', isActive: true });
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', displayOrder: 0, isActive: true });

  const handleOpenPageCreate = () => {
    setEditingId(null);
    setPageForm({ slug: '', title: '', content: '', isActive: true });
    setIsModalOpen(true);
  };

  const handleOpenFaqCreate = () => {
    setEditingId(null);
    setFaqForm({ question: '', answer: '', displayOrder: 0, isActive: true });
    setIsModalOpen(true);
  };

  const handleEditPage = (page: any) => {
    setEditingId(page.id);
    setPageForm({ slug: page.slug, title: page.title, content: page.content || '', isActive: page.isActive });
    setIsModalOpen(true);
  };

  const handleEditFaq = (faq: any) => {
    setEditingId(faq.id);
    setFaqForm({ question: faq.question, answer: faq.answer, displayOrder: faq.displayOrder || 0, isActive: faq.isActive });
    setIsModalOpen(true);
  };

  const handlePageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) await updatePage.mutateAsync({ id: editingId, ...pageForm });
    else await createPage.mutateAsync(pageForm);
    setIsModalOpen(false);
  };

  const handleFaqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) await updateFaq.mutateAsync({ id: editingId, ...faqForm });
    else await createFaq.mutateAsync(faqForm);
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
            <Monitor size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Content Management (CMS)
          </h1>
          <p className="plat-header-sub">Manage public/internal website content and frequently asked questions.</p>
        </div>
        <div className="plat-header-actions">
           <div className="flex bg-faded p-1 rounded-lg border border-main mr-4">
              <button 
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'pages' ? 'bg-white shadow-sm text-primary' : 'text-muted hover:text-main'}`}
                onClick={() => setActiveTab('pages')}
              >
                Static Pages
              </button>
              <button 
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'faqs' ? 'bg-white shadow-sm text-primary' : 'text-muted hover:text-main'}`}
                onClick={() => setActiveTab('faqs')}
              >
                FAQs
              </button>
           </div>
          <button className="plat-btn plat-btn-primary" onClick={activeTab === 'pages' ? handleOpenPageCreate : handleOpenFaqCreate}>
            <Plus size={14} strokeWidth={1.6} />
            {activeTab === 'pages' ? 'Add Page' : 'Add FAQ'}
          </button>
        </div>
      </div>

      <div className="plat-card">
        {activeTab === 'pages' ? (
          /* ─── Static Pages Table ─── */
          loadingPages ? <div className="plat-empty"><RefreshCw size={22} className="animate-spin opacity-30" /></div> :
          pages.length === 0 ? <div className="plat-empty"><Globe size={28} className="plat-empty-icon" /><p className="plat-empty-text">No pages created yet.</p></div> :
          <div style={{ overflowX: 'auto' }}>
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>ID</th>
                  <th>Title</th>
                  <th>Slug/URL</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page: any) => (
                  <tr key={page.id}>
                    <td className="font-mono text-xs color-muted">{page.id}</td>
                    <td className="font-semibold">{page.title}</td>
                    <td className="font-mono text-xs text-primary">/{page.slug}</td>
                    <td>{page.isActive ? <span className="plat-badge plat-badge-staff">Live</span> : <span className="plat-badge plat-badge-default">Draft</span>}</td>
                    <td>
                      <div className="flex gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleEditPage(page)}><Edit2 size={13} /></button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => { if(confirm(`Delete page "${page.title}"?`)) deletePage.mutate(page.id) }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ─── FAQs Table/List ─── */
          loadingFaqs ? <div className="plat-empty"><RefreshCw size={22} className="animate-spin opacity-30" /></div> :
          faqs.length === 0 ? <div className="plat-empty"><HelpCircle size={28} className="plat-empty-icon" /><p className="plat-empty-text">No FAQs found.</p></div> :
          <div style={{ overflowX: 'auto' }}>
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Order</th>
                  <th>Question</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {faqs.map((faq: any) => (
                  <tr key={faq.id}>
                    <td className="font-mono text-xs color-muted">{faq.displayOrder}</td>
                    <td className="font-medium">{faq.question}</td>
                    <td>{faq.isActive ? <span className="plat-badge plat-badge-staff">Visible</span> : <span className="plat-badge plat-badge-default">Hidden</span>}</td>
                    <td>
                      <div className="flex gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleEditFaq(faq)}><Edit2 size={13} /></button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => { if(confirm(`Delete FAQ?`)) deleteFaq.mutate(faq.id) }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Shared Modal ─── */}
      {isModalOpen && (
        <div className="plat-modal-overlay fade-in" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="plat-modal" style={{ maxWidth: activeTab === 'pages' ? '800px' : '600px' }}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">
                {activeTab === 'pages' ? (editingId ? 'Edit Page' : 'Add Page') : (editingId ? 'Edit FAQ' : 'Add FAQ')}
              </h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}><X size={16} /></button>
            </div>
            
            {activeTab === 'pages' ? (
              <form onSubmit={handlePageSubmit}>
                <div className="plat-modal-body plat-form">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="plat-form-group">
                      <label className="plat-form-label">Page Title <span className="plat-form-required">*</span></label>
                      <input className="plat-form-input" value={pageForm.title} onChange={e => setPageForm(p => ({...p, title: e.target.value}))} required />
                    </div>
                    <div className="plat-form-group">
                      <label className="plat-form-label">URL Slug <span className="plat-form-required">*</span></label>
                      <input className="plat-form-input" value={pageForm.slug} onChange={e => setPageForm(p => ({...p, slug: e.target.value}))} required placeholder="e.g. about-us" />
                    </div>
                    <div className="plat-form-group plat-form-full">
                      <label className="plat-form-label">Content (Markdown/HTML supported)</label>
                      <textarea className="plat-form-input" style={{ minHeight: '300px' }} value={pageForm.content} onChange={e => setPageForm(p => ({...p, content: e.target.value}))} />
                    </div>
                    <div className="plat-form-group plat-form-full plat-form-row">
                      <input type="checkbox" className="plat-form-input" id="page_active" checked={pageForm.isActive} onChange={e => setPageForm(p => ({...p, isActive: e.target.checked}))} /> 
                      <label htmlFor="page_active" className="plat-form-label cursor-pointer mb-0">Page is live</label>
                    </div>
                  </div>
                </div>
                <div className="plat-modal-footer">
                   <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                   <button type="submit" className="plat-btn plat-btn-primary">Save Page</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleFaqSubmit}>
                <div className="plat-modal-body plat-form">
                  <div className="plat-form-group plat-form-full">
                    <label className="plat-form-label">Question <span className="plat-form-required">*</span></label>
                    <input className="plat-form-input" value={faqForm.question} onChange={e => setFaqForm(f => ({...f, question: e.target.value}))} required />
                  </div>
                  <div className="plat-form-group plat-form-full">
                    <label className="plat-form-label">Answer <span className="plat-form-required">*</span></label>
                    <textarea className="plat-form-input" style={{ minHeight: '120px' }} value={faqForm.answer} onChange={e => setFaqForm(f => ({...f, answer: e.target.value}))} required />
                  </div>
                  <div className="plat-form-group">
                    <label className="plat-form-label">Display Order</label>
                    <input type="number" className="plat-form-input" value={faqForm.displayOrder} onChange={e => setFaqForm(f => ({...f, displayOrder: parseInt(e.target.value)}))} />
                  </div>
                  <div className="plat-form-group plat-form-full plat-form-row">
                    <input type="checkbox" className="plat-form-input" id="faq_active" checked={faqForm.isActive} onChange={e => setFaqForm(f => ({...f, isActive: e.target.checked}))} /> 
                    <label htmlFor="faq_active" className="plat-form-label cursor-pointer mb-0">FAQ is visible</label>
                  </div>
                </div>
                <div className="plat-modal-footer">
                   <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                   <button type="submit" className="plat-btn plat-btn-primary">Save FAQ</button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
