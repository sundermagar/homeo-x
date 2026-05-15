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
import { EmptyState } from '@/components/shared/empty-state';
import { Drawer } from '@/shared/components/drawer';



const EMPTY_FORM: any = {
  name: '', email: '', phone: '', city: '', website: '', description: '', connectSince: '',
  adminEmail: '', adminPassword: '', sendWelcomeEmail: false,
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
      sendWelcomeEmail: false,
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

  const set = (key: string, val: any) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const activeCities = new Set(orgs.map(o => o.city).filter(Boolean)).size;

  return (
    <div className="plat-page fade-in">

      {/* ─── Header ─── */}
      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            <Building2 size={22} strokeWidth={1.6} />
            Clinics & Organizations
          </h1>
          <p className="pp-page-hero-sub">Manage all {orgs.length} registered clinic organisations.</p>
        </div>
        <div className="pp-page-hero-actions">
          <button className="btn-primary" onClick={() => { setEditingOrg(null); setIsCreating(true); setForm(EMPTY_FORM); }}>
            <Plus size={14} strokeWidth={1.6} />
            Add Clinic
          </button>
        </div>
      </div>

      {/* ─── KPI Stats ─── */}
      <div className="pp-stat-grid">
        {[
          { label: 'Total Clinics', value: orgs.length, cls: 'is-primary' },
          { label: 'Active', value: orgs.filter(o => !o.deletedAt).length, cls: 'is-success' },
          { label: 'Cities', value: activeCities, cls: '' },
        ].map(stat => (
          <div key={stat.label} className="pp-stat-card-enhanced">
            <div className="pp-stat-label">{stat.label}</div>
            <div className={`pp-stat-value ${stat.cls}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ─── Table ─── */}
      <div>
        {isLoading ? (
          <TableSkeleton rows={8} columns={7} />
        ) : orgs.length === 0 ? (
          <EmptyState 
            icon={Building2}
            title="No clinics registered"
            description="Add your first clinic to get started with the multi-tenant clinical ecosystem."
            actionLabel="Add Clinic"
            onAction={() => { setEditingOrg(null); setIsCreating(true); setForm(EMPTY_FORM); }}
            variant="card"
            className="my-8"
          />
        ) : (
          <>
            <div className="pp-table-container-enhanced">
              <table className="plat-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Clinic Name</th>
                    <th>City</th>
                    <th>Phone</th>
                    <th>Website</th>
                    <th>Connected</th>
                    <th>Action</th>
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
                      type="date"
                      value={form.connectSince || ''}
                      onChange={e => set('connectSince', e.target.value)}
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
                {!editingOrg && (
                  <div className="plat-form-group" style={{ marginTop: '16px' }}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.sendWelcomeEmail || false}
                        onChange={e => set('sendWelcomeEmail', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Send welcome email with credentials
                      </span>
                    </label>
                  </div>
                )}
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

    </div>
  );
}
