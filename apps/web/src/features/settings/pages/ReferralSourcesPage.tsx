import React, { useState } from 'react';
import { Users, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2, CheckCircle2, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useReferrals, useCreateReferral, useUpdateReferral, useDeleteReferral } from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

const EMPTY_FORM = { name: '', type: '', isActive: true };

export default function ReferralSourcesPage() {
  const { data: referrals = [], isLoading } = useReferrals();
  const createRef = useCreateReferral();
  const updateRef = useUpdateReferral();
  const deleteRef = useDeleteReferral();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ref: any) => {
    setEditingId(ref.id);
    setForm({ 
      name: ref.name, 
      type: ref.type || '', 
      isActive: ref.isActive 
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateRef.mutateAsync({ id: editingId, ...form });
    } else {
      await createRef.mutateAsync(form);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete referral source "${name}"?`)) return;
    await deleteRef.mutateAsync(id);
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
            <Users size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Referral Sources
          </h1>
          <p className="plat-header-sub">Manage where your patients are coming from (Doctors, Marketing, etc.).</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} strokeWidth={1.6} />
            Add Source
          </button>
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty">
            <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
          </div>
        ) : referrals.length === 0 ? (
          <div className="plat-empty">
            <Users size={28} className="plat-empty-icon" />
            <p className="plat-empty-text">No referral sources defined.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>ID</th>
                  <th>Source Name</th>
                  <th>Type</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((ref: any) => (
                  <tr key={ref.id}>
                    <td className="font-mono text-xs color-muted">{ref.id}</td>
                    <td className="font-semibold">{ref.name}</td>
                    <td>
                      <span className="flex items-center gap-1.5 text-secondary">
                        <Tag size={12} />
                        {ref.type || 'General'}
                      </span>
                    </td>
                    <td>
                      {ref.isActive ? (
                        <span className="plat-badge plat-badge-staff">Active</span>
                      ) : (
                        <span className="plat-badge plat-badge-default">Inactive</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(ref)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(ref.id, ref.name)}>
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
          <div className="plat-modal" style={{ maxWidth: '450px' }}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">{editingId ? 'Edit Source' : 'Add Referral Source'}</h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="plat-modal-body plat-form">
              <div className="plat-form-group plat-form-full">
                <label className="plat-form-label">Source Name <span className="plat-form-required">*</span></label>
                <input 
                  className="plat-form-input" 
                  value={form.name} 
                  onChange={e => setForm(f => ({...f, name: e.target.value}))}
                  required 
                  placeholder="e.g. Dr. Sharma, Facebook Ads, Newspaper"
                />
              </div>
              <div className="plat-form-group plat-form-full">
                <label className="plat-form-label">Source Type</label>
                <input 
                  className="plat-form-input" 
                  value={form.type} 
                  onChange={e => setForm(f => ({...f, type: e.target.value}))}
                  placeholder="e.g. Doctor, Advertisement, Walking"
                />
              </div>
              <div className="plat-form-group plat-form-full plat-form-row">
                <input 
                  type="checkbox" 
                  className="plat-form-input"
                  id="isActiveRef"
                  checked={form.isActive} 
                  onChange={e => setForm(f => ({...f, isActive: e.target.checked}))}
                />
                <label htmlFor="isActiveRef" className="plat-form-label">Source is active</label>
              </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createRef.isPending || updateRef.isPending}>
                  {editingId ? 'Save Changes' : 'Create Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
