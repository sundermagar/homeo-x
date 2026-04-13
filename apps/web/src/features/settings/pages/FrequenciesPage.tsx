import React, { useState } from 'react';
import { Clock, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFrequencies, useCreateFrequency, useUpdateFrequency, useDeleteFrequency } from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

interface Frequency {
  id: number;
  title?: string;
  frequency?: string;
  duration?: string;
  days?: number;
}

const EMPTY_FORM = { title: '', frequency: '', duration: '', days: 1 };

export default function FrequenciesPage() {
  const { data: frequencies = [], isLoading } = useFrequencies();
  const createFreq = useCreateFrequency();
  const updateFreq = useUpdateFrequency();
  const deleteFreq = useDeleteFrequency();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const filtered = frequencies.filter((f: Frequency) =>
    f.title?.toLowerCase().includes(search.toLowerCase()) ||
    f.frequency?.toLowerCase().includes(search.toLowerCase()) ||
    f.duration?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (freq: Frequency) => {
    setEditingId(freq.id);
    setForm({ 
      title: freq.title || '', 
      frequency: freq.frequency || '', 
      duration: freq.duration || '', 
      days: freq.days ?? 1 
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, days: Number(form.days) };
    if (editingId) {
      await updateFreq.mutateAsync({ id: editingId, ...payload });
    } else {
      await createFreq.mutateAsync(payload);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number, title?: string) => {
    if (!confirm(`Delete frequency "${title || 'this entry'}"?`)) return;
    await deleteFreq.mutateAsync(id);
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
            <Clock size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Dosage Frequencies
          </h1>
          <p className="plat-header-sub">Manage how often medicines should be taken (e.g. TDS, OD, BD).</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} strokeWidth={1.6} />
            Add Frequency
          </button>
        </div>
      </div>

      <div className="plat-card">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <input
            className="plat-form-input"
            style={{ maxWidth: '280px' }}
            placeholder="Search frequencies..."
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
            <Clock size={28} className="plat-empty-icon" />
            <p className="plat-empty-text">No frequencies found. Add your first one.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Title</th>
                  <th>Freq. Description</th>
                  <th>Duration</th>
                  <th style={{ width: '80px' }}>Days</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((freq: Frequency, idx: number) => (
                  <tr key={freq.id}>
                    <td className="font-mono text-xs color-muted">{idx + 1}</td>
                    <td className="font-semibold">{freq.title || '—'}</td>
                    <td>{freq.frequency || '—'}</td>
                    <td>{freq.duration || '—'}</td>
                    <td>{freq.days !== undefined ? freq.days : '—'}</td>
                    <td>
                      <div className="flex gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(freq)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(freq.id, freq.title || freq.frequency)}>
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
              <h2 className="plat-modal-title">{editingId ? 'Edit Frequency' : 'Add Frequency'}</h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="plat-modal-body plat-form">
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Title * (e.g. TDS)</label>
                  <input
                    className="plat-form-input"
                    required
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. TDS"
                  />
                </div>
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Full Description (e.g. Three times a day)</label>
                  <input
                    className="plat-form-input"
                    value={form.frequency}
                    onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                    placeholder="e.g. Three times a day"
                  />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Duration</label>
                  <input
                    className="plat-form-input"
                    value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                    placeholder="e.g. 5 Days"
                  />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Days (Numeric)</label>
                  <input
                    className="plat-form-input"
                    type="number"
                    value={form.days}
                    onChange={e => setForm(f => ({ ...f, days: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createFreq.isPending || updateFreq.isPending}>
                  {editingId ? 'Save Changes' : 'Add Frequency'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
