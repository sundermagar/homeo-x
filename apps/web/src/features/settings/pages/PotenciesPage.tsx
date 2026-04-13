import React, { useState } from 'react';
import { Sparkles, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePotencies, useCreatePotency, useUpdatePotency, useDeletePotency } from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

interface Potency {
  id: number;
  name: string;
  detail?: string;
}

const EMPTY_FORM = { name: '', detail: '' };

export default function PotenciesPage() {
  const { data: potencies = [], isLoading } = usePotencies();
  const createPot = useCreatePotency();
  const updatePot = useUpdatePotency();
  const deletePot = useDeletePotency();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const filtered = potencies.filter((p: Potency) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.detail?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pot: Potency) => {
    setEditingId(pot.id);
    setForm({ name: pot.name, detail: pot.detail || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updatePot.mutateAsync({ id: editingId, ...form });
    } else {
      await createPot.mutateAsync(form);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete potency "${name}"?`)) return;
    await deletePot.mutateAsync(id);
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
            <Sparkles size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Potencies
          </h1>
          <p className="plat-header-sub">Manage medicine potencies (e.g. 30C, 200C, 1M).</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} strokeWidth={1.6} />
            Add Potency
          </button>
        </div>
      </div>

      <div className="plat-card">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <input
            className="plat-form-input"
            style={{ maxWidth: '280px' }}
            placeholder="Search potencies..."
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
            <Sparkles size={28} className="plat-empty-icon" />
            <p className="plat-empty-text">No potencies found. Add your first one.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Potency Name</th>
                  <th>Description / Detail</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pot: Potency, idx: number) => (
                  <tr key={pot.id}>
                    <td className="font-mono text-xs color-muted">{idx + 1}</td>
                    <td className="font-semibold">{pot.name}</td>
                    <td className="text-secondary">{pot.detail || '—'}</td>
                    <td>
                      <div className="flex gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(pot)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(pot.id, pot.name)}>
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
              <h2 className="plat-modal-title">{editingId ? 'Edit Potency' : 'Add Potency'}</h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="plat-modal-body plat-form">
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Potency Name *</label>
                  <input
                    className="plat-form-input"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. 30C"
                  />
                </div>
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Description / Detail</label>
                  <textarea
                    className="plat-form-input"
                    rows={3}
                    style={{ resize: 'none' }}
                    value={form.detail}
                    onChange={e => setForm(f => ({ ...f, detail: e.target.value }))}
                    placeholder="Optional description..."
                  />
                </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createPot.isPending || updatePot.isPending}>
                  {editingId ? 'Save Changes' : 'Add Potency'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
