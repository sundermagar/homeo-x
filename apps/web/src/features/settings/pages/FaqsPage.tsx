import React, { useState } from 'react';
import { HelpCircle, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2, Search, MessageSquare, ListOrdered, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFaqs, useCreateFaq, useUpdateFaq, useDeleteFaq } from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

interface Faq {
  id: number;
  name: string;
  detail: string;
  displayOrder?: number;
  isActive?: boolean;
}

const EMPTY_FORM = { name: '', detail: '', isActive: true };

export default function FaqsPage() {
  const { data: faqs = [], isLoading } = useFaqs();
  const createFaq = useCreateFaq();
  const updateFaq = useUpdateFaq();
  const deleteFaq = useDeleteFaq();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filtered = faqs.filter((f: Faq) =>
    f.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.detail?.toLowerCase().includes(search.toLowerCase())
  ).sort((a: Faq, b: Faq) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (faq: Faq) => {
    setEditingId(faq.id);
    setForm({
      name: faq.name,
      detail: faq.detail,
      isActive: faq.isActive ?? true
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingId) {
        await updateFaq.mutateAsync({ id: editingId, ...form });
      } else {
        await createFaq.mutateAsync(form);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('FAQ Op Error:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Operation failed';
      setError(msg);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Archive this FAQ? It will no longer be visible to staff.')) return;
    await deleteFaq.mutateAsync(id);
  };

  return (
    <div className="plat-page fade-in">


      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <HelpCircle size={20} className="color-primary" />
            Knowledge Base & FAQs
          </h1>
          <p className="plat-header-sub">Manage common questions and internal library for your clinic staff.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} />
            Add New Entry
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <p className="plat-stat-label">Total Questions</p>
          <p className="plat-stat-value plat-stat-value-primary">{faqs.length}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Active Listing</p>
          <p className="plat-stat-value plat-stat-value-success">
            {filtered.length}
          </p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Last Updated</p>
          <p className="plat-stat-value text-xs color-muted font-normal">
            {new Date().toLocaleDateString('en-GB')}
          </p>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={14} className="plat-search-icon" />
          <input
            className="plat-form-input plat-search-input"
            placeholder="Search questions, keywords or answers..."
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
        ) : filtered.length === 0 ? (
          <div className="plat-empty">
            <MessageSquare size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No matching entries found in the knowledge base.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Order</th>
                  <th>Question & Answer</th>
                  <th style={{ width: '120px' }}>Status</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((faq: Faq, index) => (
                  <tr key={faq.id} className="plat-table-row">
                    <td data-label="Order" className="plat-table-cell font-mono text-xs color-muted">
                      <div className="flex items-center gap-1.5">
                        <ListOrdered size={12} className="opacity-50" />
                        {index + 1}
                      </div>
                    </td>
                    <td data-label="FAQ" className="plat-table-cell">
                      <div className="flex flex-col gap-2">
                        <div className="font-bold text-main leading-tight flex items-center gap-2">
                          <MessageSquare size={14} className="color-primary opacity-60" />
                          {faq.name}
                        </div>
                        <div className="plat-glass-box text-xs color-muted leading-relaxed italic border-l-2 border-primary">
                          {faq.detail}
                        </div>
                      </div>
                    </td>
                    <td data-label="Status" className="plat-table-cell">
                      {faq.isActive !== false ? (
                        <span className="plat-badge plat-badge-staff flex items-center w-fit gap-1">
                          <CheckCircle2 size={10} /> Published
                        </span>
                      ) : (
                        <span className="plat-badge plat-badge-default w-fit">Draft</span>
                      )}
                    </td>
                    <td className="plat-table-cell">
                      <div className="flex justify-end gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(faq)} title="Edit Content">
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(faq.id)} title="Archive">
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
        <div className="plat-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="plat-modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="plat-modal-header border-none pb-0">
              <div>
                <h2 className="plat-modal-title">{editingId ? 'Update Knowledge Base Entry' : 'Create New Knowledge Entry'}</h2>
                <p className="text-xs text-muted mt-1">Define clear answers for your staff members.</p>
              </div>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="plat-modal-body">
                <div className="plat-form-section">
                  <div className="plat-form-grid-multi" style={{ gridTemplateColumns: '1fr' }}>
                    {error && (
                      <div className="plat-alert plat-alert-danger" style={{ marginBottom: '1rem', fontSize: '13px' }}>
                        {error}
                      </div>
                    )}
                    <div className="plat-form-group">
                      <label className="plat-form-label font-bold">Question / Title</label>
                      <input
                        className="plat-form-input"
                        required
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. How to handle emergency appointments?"
                      />
                    </div>
                    <div className="plat-form-group">
                      <label className="plat-form-label font-bold">Detailed Answer</label>
                      <textarea
                        className="plat-form-input leading-relaxed"
                        required
                        style={{ minHeight: '150px', padding: '12px' }}
                        value={form.detail}
                        onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
                        placeholder="Explain the process in detail..."
                      />
                    </div>
                    <div className="flex items-center gap-2 py-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-primary"
                        id="isActiveFaq"
                        checked={form.isActive}
                        onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                      />
                      <label htmlFor="isActiveFaq" className="plat-form-label mb-0 cursor-pointer font-semibold">Active & Visible</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Discard Changes</button>
                <button type="submit" className="plat-btn plat-btn-primary px-10" disabled={createFaq.isPending || updateFaq.isPending}>
                  {editingId ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
