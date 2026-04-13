import React, { useState } from 'react';
import { Pill, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMedicines, useCreateMedicine, useUpdateMedicine, useDeleteMedicine } from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

interface Medicine {
  id: number;
  name: string;
  disease?: string;
}

const EMPTY_FORM = { name: '', disease: '' };

export default function MedicinesPage() {
  const { data: medicines = [], isLoading } = useMedicines();
  const createMed = useCreateMedicine();
  const updateMed = useUpdateMedicine();
  const deleteMed = useDeleteMedicine();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const filtered = medicines.filter((m: Medicine) =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.disease?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (med: Medicine) => {
    setEditingId(med.id);
    setForm({ name: med.name, disease: med.disease || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateMed.mutateAsync({ id: editingId, ...form });
    } else {
      await createMed.mutateAsync(form);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete medicine "${name}"?`)) return;
    await deleteMed.mutateAsync(id);
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
            <Pill size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Medicine Catalog
          </h1>
          <p className="plat-header-sub">Manage medicines and remedies available in your clinic.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} strokeWidth={1.6} />
            Add Medicine
          </button>
        </div>
      </div>

      <div className="plat-card">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <input
            className="plat-form-input"
            style={{ maxWidth: '280px' }}
            placeholder="Search medicines..."
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
            <Pill size={28} className="plat-empty-icon" />
            <p className="plat-empty-text">No medicines found. Add your first one.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Medicine Name</th>
                  <th>Disease</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((med: Medicine, idx: number) => (
                  <tr key={med.id}>
                    <td className="font-mono text-xs color-muted">{idx + 1}</td>
                    <td className="font-semibold">{med.name}</td>
                    <td className="text-secondary">{med.disease || '—'}</td>
                    <td>
                      <div className="flex gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(med)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(med.id, med.name)}>
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
            <h2 className="plat-modal-title">{editingId ? 'Edit Medicine' : 'Add Medicine'}</h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="plat-modal-body plat-form">
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Medicine Name *</label>
                  <input
                    className="plat-form-input"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Arnica Montana"
                  />
                </div>
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Disease</label>
                  <input
                    className="plat-form-input"
                    value={form.disease}
                    onChange={e => setForm(f => ({ ...f, disease: e.target.value }))}
                    placeholder="e.g. Headache, Fever..."
                  />
                </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createMed.isPending || updateMed.isPending}>
                  {editingId ? 'Save Changes' : 'Add Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
