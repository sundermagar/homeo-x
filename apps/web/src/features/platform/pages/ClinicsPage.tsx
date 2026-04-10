import React, { useState } from 'react';
import { Building2, Plus, X, RefreshCw } from 'lucide-react';
import { useOrganizations, useCreateOrganization, useDeleteOrganization } from '../hooks/use-organizations';
import type { CreateOrganizationInput } from '@mmc/types';
import '../styles/platform.css';

const EMPTY_FORM: CreateOrganizationInput = {
  name: '', email: '', phone: '', city: '', website: '', description: '', connectSince: '',
};

export default function ClinicsPage() {
  const { data: orgs = [], isLoading } = useOrganizations();
  const createOrg = useCreateOrganization();
  const deleteOrg = useDeleteOrganization();

  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<CreateOrganizationInput>(EMPTY_FORM);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createOrg.mutateAsync(form);
    setIsCreating(false);
    setForm(EMPTY_FORM);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await deleteOrg.mutateAsync(id);
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
            Clinics &amp; Organizations
          </h1>
          <p className="plat-header-sub">Manage all {orgs.length} registered clinic organisations.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={() => setIsCreating(true)}>
            <Plus size={14} strokeWidth={1.6} />
            Add Clinic
          </button>
        </div>
      </div>

      {/* ─── KPI Stats ─── */}
      <div className="plat-stats-bar">
        {[
          { label: 'Total Clinics', value: orgs.length,                                   cls: 'plat-stat-value-primary' },
          { label: 'Active',        value: orgs.filter(o => !o.deletedAt).length,          cls: 'plat-stat-value-success' },
          { label: 'Cities',        value: activeCities,                                   cls: '' },
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
          <div style={{ overflowX: 'auto' }}>
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>ID</th>
                  <th>Clinic Name</th>
                  <th style={{ width: '120px' }}>City</th>
                  <th style={{ width: '140px' }}>Phone</th>
                  <th style={{ width: '180px' }}>Website</th>
                  <th style={{ width: '110px' }}>Connected</th>
                  <th style={{ width: '80px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org, index) => (
                  <tr key={org.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {orgs.length - index}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{org.name}</div>
                      {org.description && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                          {org.description}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{org.city || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {org.phone || '—'}
                    </td>
                    <td style={{ fontSize: '0.75rem' }}>
                      {org.website ? (
                        <a href={org.website} target="_blank" rel="noreferrer"
                          style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                          {org.website.replace(/^https?:\/\//, '')}
                        </a>
                      ) : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {org.connectSince || '—'}
                    </td>
                    <td>
                      <button
                        className="plat-btn plat-btn-sm plat-btn-danger"
                        onClick={() => handleDelete(org.id, org.name)}
                        disabled={deleteOrg.isPending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Create Modal ─── */}
      {isCreating && (
        <div className="plat-modal-overlay fade-in" onClick={(e) => { if (e.target === e.currentTarget) setIsCreating(false); }}>
          <div className="plat-modal">

            <div className="plat-modal-header">
              <h2 className="plat-modal-title">Register New Clinic</h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsCreating(false)} style={{ border: 'none' }}>
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="plat-form" style={{ padding: '20px' }}>
              {[
                { key: 'name',         label: 'Clinic Name',     required: true,  full: true,  type: 'text'  },
                { key: 'city',         label: 'City',            required: false, full: false, type: 'text'  },
                { key: 'phone',        label: 'Phone',           required: false, full: false, type: 'tel'   },
                { key: 'email',        label: 'Email',           required: false, full: false, type: 'email' },
                { key: 'website',      label: 'Website',         required: false, full: false, type: 'url'   },
                { key: 'connectSince', label: 'Connected Since', required: false, full: false, type: 'text'  },
                { key: 'description',  label: 'Description',     required: false, full: true,  type: 'text'  },
              ].map(f => (
                <div key={f.key} className={f.full ? 'plat-form-full plat-form-group' : 'plat-form-group'}>
                  <label className="plat-form-label">
                    {f.label}
                    {f.required && <span className="plat-form-required">*</span>}
                  </label>
                  <input
                    className="plat-form-input"
                    type={f.type}
                    required={f.required}
                    value={(form as any)[f.key] ?? ''}
                    onChange={e => set(f.key, e.target.value)}
                    placeholder={f.label}
                  />
                </div>
              ))}

              <div className="plat-form-full" style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border-main)', paddingTop: '16px', marginTop: '4px' }}>
                <button type="button" className="plat-btn" style={{ flex: 1 }} onClick={() => setIsCreating(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" style={{ flex: 1 }} disabled={createOrg.isPending}>
                  {createOrg.isPending ? 'Creating…' : 'Create Clinic'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
