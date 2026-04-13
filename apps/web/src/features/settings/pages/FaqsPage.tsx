import React, { useState } from 'react';
import { HelpCircle, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFaqs, useCreateFaq, useUpdateFaq, useDeleteFaq } from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

interface Faq {
  id: number;
  ques: string;
  ans: string;
}

const EMPTY_FORM = { ques: '', ans: '' };

export default function FaqsPage() {
  const { data: faqs = [], isLoading } = useFaqs();
  const createFaq = useCreateFaq();
  const updateFaq = useUpdateFaq();
  const deleteFaq = useDeleteFaq();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const filtered = faqs.filter((f: Faq) =>
    f.ques?.toLowerCase().includes(search.toLowerCase()) ||
    f.ans?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (faq: Faq) => {
    setEditingId(faq.id);
    setForm({ ques: faq.ques, ans: faq.ans });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateFaq.mutateAsync({ id: editingId, ...form });
    } else {
      await createFaq.mutateAsync(form);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this FAQ?')) return;
    await deleteFaq.mutateAsync(id);
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
            <HelpCircle size={20} className="plat-header-title-icon" />
            Frequently Asked Questions
          </h1>
          <p className="plat-header-sub">Manage FAQs for your clinic team.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} strokeWidth={1.6} />
            Add FAQ
          </button>
        </div>
      </div>

      <div className="plat-card">
        <div className="plat-card-toolbar">
          <input
            className="plat-form-input"
            style={{ maxWidth: '280px' }}
            placeholder="Search FAQs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="plat-empty">
            <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="plat-empty">
            <HelpCircle size={28} className="plat-empty-icon" />
            <p className="plat-empty-text">No FAQs found. Add your first one.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Question</th>
                  <th>Answer</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((faq: Faq, idx: number) => (
                  <tr key={faq.id}>
                    <td className="font-mono text-xs color-muted">{idx + 1}</td>
                    <td className="font-semibold">{faq.ques}</td>
                    <td className="text-secondary">{faq.ans}</td>
                    <td>
                      <div className="flex gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(faq)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(faq.id)}>
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
          <div className="plat-modal">
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">{editingId ? 'Edit FAQ' : 'Add FAQ'}</h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="plat-modal-body plat-form">
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Question *</label>
                  <input
                    className="plat-form-input"
                    required
                    value={form.ques}
                    onChange={e => setForm(f => ({ ...f, ques: e.target.value }))}
                    placeholder="Enter question..."
                  />
                </div>
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Answer *</label>
                  <textarea
                    className="plat-form-input"
                    required
                    style={{ minHeight: '100px' }}
                    value={form.ans}
                    onChange={e => setForm(f => ({ ...f, ans: e.target.value }))}
                    placeholder="Enter answer..."
                  />
                </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createFaq.isPending || updateFaq.isPending}>
                  {editingId ? 'Save Changes' : 'Add FAQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
