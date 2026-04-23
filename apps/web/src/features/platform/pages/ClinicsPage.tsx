import React, { useState } from 'react';
import { Building2, Plus, X, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrganizations, useCreateOrganization, useDeleteOrganization, useUpdateOrganization } from '../hooks/use-organizations';
import type { CreateOrganizationInput } from '@mmc/types';
import { NumericInput } from '@/shared/components/NumericInput';
import '../styles/platform.css';

const EMPTY_FORM: any = {
  name: '', email: '', phone: '', city: '', website: '', description: '', connectSince: '',
  adminEmail: '', adminPassword: '',
};

export default function ClinicsPage() {
  const qc = useQueryClient();
  const { data: orgs = [], isLoading, refetch } = useOrganizations();
  const createOrg = useCreateOrganization();
  const deleteOrg = useDeleteOrganization();
  const updateOrg = useUpdateOrganization();

  const sortedOrgs = [...orgs].sort((a, b) => a.id - b.id);

  const [isCreating, setIsCreating] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any>(null);
  const [form, setForm] = useState<CreateOrganizationInput>(EMPTY_FORM);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOrg) {
        console.log(`[Update] Updating clinic ${editingOrg.id}:`, form);
        await updateOrg.mutateAsync({ id: editingOrg.id, ...form });
        console.log(`[Update] Success`);
      } else {
        console.log(`[Create] Creating clinic:`, form);
        await createOrg.mutateAsync(form);
        console.log(`[Create] Success`);
      }
      qc.invalidateQueries({ queryKey: ['organizations'] });
      setIsCreating(false);
      setEditingOrg(null);
      setForm(EMPTY_FORM);
      await refetch();
    } catch (err: any) {
      console.error("[Create/Update] Error:", err?.response || err);
      alert(`Failed: ${err?.response?.data?.error || err.message || 'Unknown error'}`);
    }
  };

  const handleEdit = (org: any) => {
    setEditingOrg(org);
    setForm({
      name: org.name || '',
      email: org.email || '',
      phone: org.phone || '',
      city: org.city || '',
      website: org.website || '',
      description: org.description || '',
      connectSince: org.connectSince || '',
      adminEmail: org.adminEmail || '',
      adminPassword: '',
    });
    setIsCreating(true);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    console.log(`[Delete] Attempting to delete clinic: ${id} - ${name}`);
    try {
      const result = await deleteOrg.mutateAsync(id);
      console.log(`[Delete] Success, result:`, result);
      // Force immediate refetch after mutation success
      qc.invalidateQueries({ queryKey: ['organizations'] });
      await refetch();
    } catch (err: any) {
      console.error("[Delete] Error:", err?.response || err);
      alert(`Failed to delete clinic: ${err?.response?.data?.error || err.message || 'Unknown error'}`);
    }
  };

  const set = (key: string, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const activeCities = new Set(orgs.map(o => o.city).filter(Boolean)).size;

  return (
    <div className="plat-page fade-in">

      {/* ─── Header ─── */}
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Building2 size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Clinics
          </h1>
          <p className="plat-header-sub">Manage all registered clinic organisations on the platform.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-ghost" onClick={() => refetch()} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button className="plat-btn plat-btn-primary" onClick={() => { setEditingOrg(null); setIsCreating(true); setForm(EMPTY_FORM); }}>
            <Plus size={14} strokeWidth={1.6} />
            Create Clinic
          </button>
        </div>
      </div>

      {/* ─── KPI Stats ─── */}
      <div className="plat-stats-bar">
        {[
          { label: 'Total Clinics', value: orgs.length, cls: 'plat-stat-value-primary' },
          { label: 'Active', value: orgs.filter(o => !o.deletedAt).length, cls: 'plat-stat-value-success' },
          { label: 'Cities', value: activeCities, cls: '' },
        ].map(stat => (
          <div key={stat.label} className="plat-stat-card">
            <p className="plat-stat-label">{stat.label}</p>
            <p className={`plat-stat-value ${stat.cls}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ─── Table ─── */}
      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty">
            <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
          </div>
        ) : orgs.length === 0 ? (
          <div className="plat-empty">
            <Building2 size={28} className="plat-empty-icon" />
            <p className="plat-empty-text">No clinics registered. Add your first clinic.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>ID</th>
                  <th>CLINIC</th>
                  <th style={{ width: '120px' }}>CITY</th>
                  <th style={{ width: '140px' }}>PHONE</th>
                  <th style={{ width: '180px' }}>WEBSITE</th>
                  <th style={{ width: '110px' }}>CREATED</th>
                  <th style={{ width: '80px' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrgs.map((org, index) => (
                  <tr key={index}>
                    <td data-label="ID" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {index + 1}
                    </td>
                    <td data-label="Clinic Name">
                      <div style={{ fontWeight: 600 }}>{org.name}</div>
                      {org.description && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                          {org.description}
                        </div>
                      )}
                    </td>
                    <td data-label="City" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{org.city || '—'}</td>
                    <td data-label="Phone" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {org.phone || '—'}
                    </td>
                    <td data-label="Website" style={{ fontSize: '0.75rem' }}>
                      {org.website ? (
                        <a href={org.website} target="_blank" rel="noreferrer"
                          style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                          {org.website.replace(/^https?:\/\//, '')}
                        </a>
                      ) : '—'}
                    </td>
                    <td data-label="Connected" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {org.connectSince || '—'}
                    </td>
                    <td data-label="Action">
                      <div className="flex justify-center gap-2">
                        <button className="plat-btn plat-btn-icon plat-btn-ghost" onClick={() => handleEdit(org)} title="Edit">
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="plat-btn plat-btn-icon plat-btn-danger"
                          onClick={() => handleDelete(org.id, org.name)}
                          title="Delete"
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

      {/* ─── Create/Edit Modal ─── */}
      {isCreating && (
        <div className="plat-modal-backdrop" onClick={() => { setIsCreating(false); setEditingOrg(null); setForm(EMPTY_FORM); }}>
          <div className="plat-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="plat-modal-header">
              <h3 className="plat-modal-title">{editingOrg ? 'Edit Clinic' : 'Register New Clinic'}</h3>
              <button className="plat-btn plat-btn-icon plat-btn-ghost" onClick={() => { setIsCreating(false); setEditingOrg(null); setForm(EMPTY_FORM); }}>
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="plat-modal-body">
              <div className="plat-form-section">
                <h4 className="plat-form-section-title">Clinic Identity</h4>
                <div className="plat-form-grid-multi">
                  <div className="plat-form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="plat-form-label">Clinic Name *</label>
                    <input
                      className="plat-form-input"
                      type="text"
                      required
                      value={form.name || ''}
                      onChange={e => set('name', e.target.value)}
                      placeholder="e.g. Hope Homeopathy Center"
                    />
                  </div>

                  <div className="plat-form-group">
                    <label className="plat-form-label">City Station</label>
                    <input
                      className="plat-form-input"
                      type="text"
                      value={form.city || ''}
                      onChange={e => set('city', e.target.value)}
                      placeholder="City"
                    />
                  </div>

                  <div className="plat-form-group">
                    <label className="plat-form-label">Connected Since</label>
                    <input
                      className="plat-form-input"
                      type="text"
                      value={form.connectSince || ''}
                      onChange={e => set('connectSince', e.target.value)}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                </div>
              </div>

              <div className="plat-form-section">
                <h4 className="plat-form-section-title">Contact & Presence</h4>
                <div className="plat-form-grid-multi">
                  <div className="plat-form-group">
                    <label className="plat-form-label">Phone Number</label>
                    <NumericInput
                      className="plat-form-input"
                      value={form.phone || ''}
                      onChange={e => set('phone', e.target.value)}
                      placeholder="9876543210"
                    />
                  </div>

                  <div className="plat-form-group">
                    <label className="plat-form-label">Email Address</label>
                    <input
                      className="plat-form-input"
                      type="email"
                      value={form.email || ''}
                      onChange={e => set('email', e.target.value)}
                      placeholder="office@clinic.com"
                    />
                  </div>

                  <div className="plat-form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="plat-form-label">Website URL</label>
                    <input
                      className="plat-form-input"
                      type="url"
                      value={form.website || ''}
                      onChange={e => set('website', e.target.value)}
                      placeholder="https://www.clinic.com"
                    />
                  </div>

                  <div className="plat-form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="plat-form-label">About Clinic / Description</label>
                    <textarea
                      className="plat-form-input"
                      value={form.description || ''}
                      onChange={e => set('description', e.target.value)}
                      rows={2}
                      placeholder="Brief overview of the clinic..."
                    />
                  </div>
                </div>
              </div>

              <div className="plat-form-section">
                <h4 className="plat-form-section-title">Initial Administrator</h4>
                <div className="plat-form-grid-multi">
                  <div className="plat-form-group">
                    <label className="plat-form-label">Admin Email *</label>
                    <input
                      className="plat-form-input"
                      type="email"
                      required
                      value={form.adminEmail || ''}
                      onChange={e => set('adminEmail', e.target.value)}
                      placeholder="admin@newclinic.com"
                    />
                  </div>
                  <div className="plat-form-group">
                    <label className="plat-form-label">Admin Password *</label>
                    <input
                      className="plat-form-input"
                      type="password"
                      required
                      value={form.adminPassword || ''}
                      onChange={e => set('adminPassword', e.target.value)}
                      placeholder="Min 6 characters"
                    />
                  </div>
                </div>
              </div>

              <div className="plat-modal-footer">
                <button type="button" className="plat-btn plat-btn-ghost" onClick={() => { setIsCreating(false); setEditingOrg(null); setForm(EMPTY_FORM); }}>Discard</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createOrg.isPending || updateOrg.isPending}>
                  {createOrg.isPending || updateOrg.isPending ? 'Syncing...' : editingOrg ? 'Update Clinic' : 'Create Clinic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
