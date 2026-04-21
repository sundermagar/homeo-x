import React, { useState } from 'react';
import { Building2, Plus, X, RefreshCw } from 'lucide-react';
import { useOrganizations, useCreateOrganization, useDeleteOrganization } from '../hooks/use-organizations';
import type { CreateOrganizationInput } from '@mmc/types';
import '../styles/platform.css';

const EMPTY_FORM: any = {
  name: '', email: '', phone: '', city: '', website: '', description: '', connectSince: '',
  adminEmail: '', adminPassword: '',
};

export default function ClinicsPage() {
  const { data: orgs = [], isLoading } = useOrganizations();
  const createOrg = useCreateOrganization();
  const deleteOrg = useDeleteOrganization();

  const sortedOrgs = [...orgs].sort((a, b) => a.id - b.id);

  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<CreateOrganizationInput>(EMPTY_FORM);

  const handleCreate = async (e: React.FormEvent) => {
    console.log("!!! TRIGGERED !!!"); // This MUST show up
    e.preventDefault();
    try {
      const result = await createOrg.mutateAsync(form);
      console.log("Success:", result);
      setIsCreating(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error("Mutation Error:", err);
    }
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
                  <th>Clinic Name</th>
                  <th style={{ width: '120px' }}>City</th>
                  <th style={{ width: '140px' }}>Phone</th>
                  <th style={{ width: '180px' }}>Website</th>
                  <th style={{ width: '110px' }}>Connected</th>
                  <th style={{ width: '80px' }}>Action</th>
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
        <div className="plat-modal-backdrop" onClick={() => setIsCreating(false)}>
          <div className="plat-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="plat-modal-header">
              <h3 className="plat-modal-title">Register New Clinic</h3>
              <button className="plat-btn plat-btn-icon plat-btn-ghost" onClick={() => setIsCreating(false)}>
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
                    <input
                      className="plat-form-input"
                      type="tel"
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
                <button type="button" className="plat-btn plat-btn-ghost" onClick={() => setIsCreating(false)}>Discard</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createOrg.isPending}>
                  {createOrg.isPending ? 'Syncing...' : 'Create Clinic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
