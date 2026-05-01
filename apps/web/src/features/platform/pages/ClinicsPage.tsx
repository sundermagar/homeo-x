import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Plus, X, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useOrganizations, useCreateOrganization, useDeleteOrganization, useUpdateOrganization } from '../hooks/use-organizations';
import type { CreateOrganizationInput } from '@mmc/types';
import { NumericInput } from '@/shared/components/NumericInput';
import '../styles/platform.css';

import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { Drawer } from '@/shared/components/drawer';

const mobileStyles = `
  @media (max-width: 1024px) {
    .plat-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
    .plat-header-actions { width: 100% !important; margin-top: 8px; }
    .plat-header-actions .plat-btn { width: 100% !important; height: 46px !important; border-radius: 12px !important; justify-content: center !important; }

    .plat-stats-bar { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; padding: 0 !important; }
    .plat-stat-card { padding: 16px 12px !important; }
    .plat-stat-value { font-size: 20px !important; }

    .plat-filters { 
      flex-direction: column !important; 
      align-items: stretch !important; 
      gap: 12px !important; 
      background: var(--bg-surface-2) !important;
      padding: 16px !important;
      border-radius: 16px !important;
      margin-bottom: 16px !important;
      border: 1px solid var(--border-main) !important;
    }
    .plat-filters > .flex { flex-direction: column !important; width: 100% !important; gap: 12px !important; }
    .plat-search-wrap { width: 100% !important; margin: 0 !important; }
    .plat-search-input { width: 100% !important; height: 44px !important; border-radius: 12px !important; font-size: 14px !important; }
    .plat-filters select { width: 100% !important; height: 44px !important; border-radius: 12px !important; font-size: 14px !important; }
    .plat-filters .plat-btn-ghost { width: 100% !important; height: 40px !important; justify-content: center !important; }

    .plat-card { border: none !important; box-shadow: none !important; background: transparent !important; padding: 0 !important; }
    .plat-table-container { 
      border: none !important; 
      background: transparent !important; 
      overflow: visible !important; 
      width: 100% !important;
      padding: 0 !important;
    }
    .plat-table { display: block !important; width: 100% !important; min-width: 0 !important; border: none !important; }
    .plat-table thead { display: none !important; }
    .plat-table tbody { display: block !important; width: 100% !important; }
    .plat-table tr { 
      display: block !important; 
      margin-bottom: 24px !important; 
      background: var(--bg-card) !important; 
      border: 1px solid var(--border-main) !important; 
      border-radius: 20px !important; 
      padding: 0 !important;
      box-shadow: var(--pp-shadow-md) !important;
      overflow: hidden !important;
    }
    .plat-table td {
      display: grid !important;
      grid-template-columns: 100px 1fr !important;
      gap: 12px !important;
      align-items: center !important;
      padding: 12px 20px !important;
      border-bottom: 1px dashed var(--border-main) !important;
      min-height: 52px;
      text-align: right !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    .plat-table td:last-child { border-bottom: none !important; background: var(--bg-surface-2) !important; padding-top: 16px !important; padding-bottom: 16px !important; }
    
    .plat-table td::before {
      content: attr(data-label);
      font-size: 10px !important;
      font-weight: 800 !important;
      color: var(--text-muted) !important;
      text-transform: uppercase !important;
      letter-spacing: 0.1em !important;
      text-align: left !important;
    }
    .plat-cell-val { width: 100% !important; text-align: right !important; display: flex !important; flex-direction: column !important; align-items: flex-end !important; }
    [data-label="#"], [data-label="ID"] { background: var(--bg-surface-2) !important; border-bottom: 1px solid var(--border-main) !important; padding: 12px 20px !important; }
  }
`;

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

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(orgs);

  const [isCreating, setIsCreating] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any>(null);
  const [form, setForm] = useState<CreateOrganizationInput>(EMPTY_FORM);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('add') === 'true') {
      setIsCreating(true);
      setEditingOrg(null);
      setForm(EMPTY_FORM);
      // Clean up the URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('add');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
            Clinics &amp; Organizations
          </h1>
          <p className="plat-header-sub">Manage all {orgs.length} registered clinic organisations.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={() => { setEditingOrg(null); setIsCreating(true); setForm(EMPTY_FORM); }}>
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
          <TableSkeleton rows={8} columns={7} />
        ) : orgs.length === 0 ? (
          <div className="plat-empty">
            <Building2 size={28} className="plat-empty-icon" />
            <p className="plat-empty-text">No clinics registered. Add your first clinic.</p>
          </div>
        ) : (
          <>
            <div className="plat-table-container">
              <table className="plat-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>#</th>
                    <th>Clinic Name</th>
                    <th style={{ width: '120px' }}>City</th>
                    <th style={{ width: '140px' }}>Phone</th>
                    <th style={{ width: '180px' }}>Website</th>
                    <th style={{ width: '110px' }}>Connected</th>
                    <th style={{ width: '80px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((org: any, index: number) => (
                    <tr key={org.id}>
                      <td data-label="#" className="plat-mono-data text-xs" style={{ width: 40 }}>
                        <div>{(currentPage - 1) * itemsPerPage + index + 1}</div>
                      </td>
                      <td data-label="Clinic Name">
                        <div className="plat-cell-val">
                          <div style={{ fontWeight: 600 }}>{org.name}</div>
                          {org.description && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                              {org.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td data-label="City">
                        <div className="plat-cell-val">
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{org.city || '—'}</div>
                        </div>
                      </td>
                      <td data-label="Phone">
                        <div className="plat-cell-val">
                          <div className="plat-mono-data" style={{ fontSize: '0.78rem' }}>
                            {org.phone || '—'}
                          </div>
                        </div>
                      </td>
                      <td data-label="Website">
                        <div className="plat-cell-val">
                          <div style={{ fontSize: '0.75rem' }}>
                            {org.website ? (
                              <a href={org.website} target="_blank" rel="noreferrer"
                                style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                {org.website.replace(/^https?:\/\//, '')}
                              </a>
                            ) : '—'}
                          </div>
                        </div>
                      </td>
                      <td data-label="Connected">
                        <div className="plat-cell-val">
                          <div className="plat-mono-data text-xs" style={{ color: 'var(--text-muted)' }}>
                            {org.connectSince || '—'}
                          </div>
                        </div>
                      </td>
                      <td data-label="Action">
                        <div className="plat-cell-val">
                          <div className="flex justify-end gap-2" style={{ width: '100%' }}>
                            <button className="plat-btn plat-btn-icon plat-btn-ghost" style={{ width: 36, height: 36, borderRadius: 10 }} onClick={() => handleEdit(org)} title="Edit">
                              <Edit2 size={13} />
                            </button>
                            <button
                              className="plat-btn plat-btn-icon plat-btn-danger"
                              style={{ width: 36, height: 36, borderRadius: 10 }}
                              onClick={() => handleDelete(org.id, org.name)}
                              title="Delete"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onLimitChange={setItemsPerPage}
            />
          </>
        )}
      </div>

      {isCreating && (
    <Drawer
      isOpen={true}
      onClose={() => { setIsCreating(false); setEditingOrg(null); setForm(EMPTY_FORM); }}
      title={editingOrg ? 'Edit Clinic' : 'Register New Clinic'}
      maxWidth="600px"
    >
      <div className="plat-modal-content" style={{ border: 'none', boxShadow: 'none', margin: 0, padding: 0 }}>
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
        </Drawer>
      )}

      <style>{mobileStyles}</style>
    </div>
  );
}
