import React, { useState, useMemo } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Search,
  CheckCircle2,
  ChevronRight,
  Info,
  Layers,
  LayoutGrid,
  X
} from 'lucide-react';
import {
  useRoles,
  useRole,
  usePermissions,
  useAssignPermissions,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  useCreatePermission,
  useUpdatePermission,
  useDeletePermission,
  Role,
  Permission
} from '../hooks/use-roles-permissions';
import './roles-permissions.css';
import '@/features/platform/styles/platform.css';

export function RolesPermissionsPage() {
  const [activeTab, setActiveTab] = useState<'matrix' | 'lab'>('matrix');
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Queries
  const { data: roles = [], isLoading: loadingRoles } = useRoles();
  const { data: selectedRole, isLoading: loadingSelectedRole } = useRole(selectedRoleId);
  const { data: allPermissions = [], isLoading: loadingPerms } = usePermissions();

  // Mutations
  const assignPerms = useAssignPermissions();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const createPerm = useCreatePermission();
  const updatePerm = useUpdatePermission();
  const deletePerm = useDeletePermission();

  // Modal State
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);

  const [permModalOpen, setPermModalOpen] = useState(false);
  const [editPerm, setEditPerm] = useState<Permission | null>(null);

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return roles.filter(r =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [roles, searchTerm]);

  // Grouped Permissions
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    allPermissions.forEach(p => {
      const mod = p.module || 'System';
      if (!groups[mod]) groups[mod] = [];
      groups[mod].push(p);
    });
    return groups;
  }, [allPermissions]);

  const handleTogglePermission = async (permId: number) => {
    if (!selectedRoleId || !selectedRole) return;

    const currentIds = selectedRole.permissions.map(p => p.id);
    const newIds = currentIds.includes(permId)
      ? currentIds.filter(id => id !== permId)
      : [...currentIds, permId];

    await assignPerms.mutateAsync({ roleId: selectedRoleId, permissionIds: newIds });
  };

  const handleDeleteRole = async (id: number) => {
    if (window.confirm('Delete this organizational role? This will revoke access for all members currently assigned to it.')) {
      await deleteRole.mutateAsync(id);
      if (selectedRoleId === id) setSelectedRoleId(null);
    }
  };

  const handleDeletePerm = async (id: number) => {
    if (window.confirm('Delete this system capability? This will remove it from ALL roles and potentially break application logic.')) {
      await deletePerm.mutateAsync(id);
    }
  };

  return (
    <div className="plat-page fade-in">
      <div className="plat-header">
        <div className="plat-header-left">
          <h1 className="plat-header-title">
            <Shield size={20} strokeWidth={2} style={{ color: 'var(--pp-blue)' }} />
            Security & Identity Matrix
          </h1>
          <p className="plat-header-sub">Define organizational hierarchies and cross-module capability nodes.</p>
        </div>

        <div className="plat-header-actions">
          <div className="plat-tab-group">
            <button
              className={`plat-tab ${activeTab === 'matrix' ? 'active' : ''}`}
              onClick={() => setActiveTab('matrix')}
            >
              Access Matrix
            </button>
            <button
              className={`plat-tab ${activeTab === 'lab' ? 'active' : ''}`}
              onClick={() => setActiveTab('lab')}
            >
              Capability Lab
            </button>
          </div>
          {activeTab === 'matrix' && (
            <button className="plat-btn plat-btn-primary" onClick={() => { setEditRole(null); setRoleModalOpen(true); }}>
              <Plus size={14} />
              <span>Create Role</span>
            </button>
          )}
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <p className="plat-stat-label">Identity Roles</p>
          <div className="flex items-center justify-between">
            <p className="plat-stat-value plat-stat-value-primary">{roles.length}</p>
            <Shield className="color-muted opacity-20" size={24} />
          </div>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Capability Nodes</p>
          <div className="flex items-center justify-between">
            <p className="plat-stat-value plat-stat-value-secondary" style={{ color: '#d97706' }}>{allPermissions.length}</p>
            <Lock className="color-muted opacity-20" size={24} />
          </div>
        </div>
      </div>

      {activeTab === 'matrix' ? (
        <div className="plat-rbac-grid">
          {/* ── Left: Roles Search & List ── */}
          <div className="flex flex-col gap-3">
            <div className="plat-search-wrap">
              <Search className="plat-search-icon" size={14} />
              <input
                type="text"
                className="plat-form-input plat-search-input w-full"
                placeholder="Find identity groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="plat-role-list">
              {loadingRoles ? (
                <div className="plat-empty py-12"><div className="plat-spinner" /></div>
              ) : filteredRoles.length === 0 ? (
                <div className="plat-card p-8 text-center bg-white">
                  <p className="plat-empty-text">No roles found matching "{searchTerm}"</p>
                </div>
              ) : filteredRoles.map(role => (
                <div
                  key={role.id}
                  className={`plat-role-item ${selectedRoleId === role.id ? 'active' : ''} group`}
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  <div className="plat-role-icon">
                    <Shield size={16} />
                  </div>
                  <div className="plat-role-info">
                    <div className="plat-role-name">{role.name}</div>
                    <div className="plat-role-desc">{role.description || 'No description provided'}</div>
                  </div>
                  <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="plat-btn plat-btn-icon plat-btn-ghost plat-btn-sm" onClick={(e) => { e.stopPropagation(); setEditRole(role); setRoleModalOpen(true); }}>
                      <Edit2 size={12} />
                    </button>
                    <button className="plat-btn plat-btn-icon plat-btn-ghost-danger plat-btn-sm" onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id); }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Matrix Table ── */}
          <div className="plat-matrix-card">
            <div className="plat-matrix-header">
              <div className="plat-matrix-title">
                <Lock size={16} className="color-primary" style={{ color: 'var(--pp-blue)' }} />
                {selectedRole ? selectedRole.name : 'Capability Matrix'}
              </div>
              {selectedRole && (
                <div className="plat-badge plat-badge-success">
                  <CheckCircle2 size={10} />
                  <span>Real-time Sync</span>
                </div>
              )}
            </div>

            <div className="plat-matrix-table-wrap">
              {loadingSelectedRole ? (
                <div className="plat-empty py-24"><div className="plat-spinner" /></div>
              ) : !selectedRole ? (
                <div className="plat-matrix-empty">
                  <Shield size={48} className="plat-empty-icon" />
                  <div>
                    <div className="plat-card-title mb-1">Select an Identity</div>
                    <p className="text-sm color-muted px-8">Pick a role from the list to manage its module-level permissions.</p>
                  </div>
                </div>
              ) : (
                <table className="plat-matrix-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60%' }}>System Capability Node</th>
                      <th style={{ width: '20%' }}>Module</th>
                      <th style={{ width: '20%', textAlign: 'center' }}>Permission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedPermissions).map(([module, perms]) => (
                      <React.Fragment key={module}>
                        <tr style={{ background: 'var(--pp-warm-2)' }}>
                          <td colSpan={3}>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              {module} Domain Capabilities
                            </div>
                          </td>
                        </tr>
                        {perms.map(perm => {
                          const isAssigned = selectedRole.permissions.some(p => p.id === perm.id);
                          return (
                            <tr key={perm.id}>
                              <td>
                                <div className="plat-cap-key">{perm.name}</div>
                                <div className="plat-cap-desc">{perm.description || `Grants access to ${perm.name} functionality.`}</div>
                              </td>
                              <td style={{ verticalAlign: 'middle' }}>
                                <span className="plat-badge plat-badge-info">{module}</span>
                              </td>
                              <td>
                                <div className="flex justify-center">
                                  <label className="plat-switch">
                                    <input
                                      type="checkbox"
                                      checked={isAssigned}
                                      onChange={() => handleTogglePermission(perm.id)}
                                      disabled={assignPerms.isPending}
                                    />
                                    <span className="plat-slider"></span>
                                  </label>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
        ) : (
          /* ── Capability Lab (Global Dictionary) ── */
          <div className="plat-card shadow-premium">
            <div className="plat-card-header">
              <div className="plat-header-left">
                <h3 className="plat-card-title">Global Capability Dictionary</h3>
                <p className="plat-header-sub">System-wide definition of permission nodes available to the RBAC engine.</p>
              </div>
              <button className="plat-btn plat-btn-primary" onClick={() => { setEditPerm(null); setPermModalOpen(true); }}>
                <Plus size={14} />
                <span>New Capability</span>
              </button>
            </div>

            <div className="plat-table-container">
              <table className="plat-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '200px' }}>Capability Node</th>
                    <th className="hidden md:table-cell">System Identifier</th>
                    <th>Cluster</th>
                    <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPerms ? (
                    <tr><td colSpan={4}><div className="plat-spinner mx-auto" /></td></tr>
                  ) : allPermissions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12">
                        <div className="color-muted">No system capabilities defined.</div>
                      </td>
                    </tr>
                  ) : allPermissions.map(perm => (
                    <tr key={perm.id} className="plat-table-row">
                      <td>
                        <div className="font-semibold text-sm">{perm.name}</div>
                        <div className="plat-cap-desc line-clamp-1">{perm.description || 'Global system node.'}</div>
                        {/* Mobile only identifier */}
                        <div className="md:hidden mt-1">
                          <code className="text-[9px] bg-slate-100 px-1 rounded text-slate-500 uppercase">{perm.slug || 'AUTO_GEN'}</code>
                        </div>
                      </td>
                      <td className="hidden md:table-cell">
                        <code className="plat-badge plat-badge-default font-mono text-[11px]">{perm.slug || 'AUTO_GEN'}</code>
                      </td>
                      <td>
                        <span className="plat-badge plat-badge-info">{perm.module || 'CORE'}</span>
                      </td>
                      <td className="text-right">
                        <div className="flex gap-1 justify-end">
                          <button className="plat-btn-icon plat-btn-ghost plat-btn-sm" onClick={() => { setEditPerm(perm); setPermModalOpen(true); }}>
                            <Edit2 size={13} />
                          </button>
                          <button className="plat-btn-icon plat-btn-ghost-danger plat-btn-sm" onClick={() => handleDeletePerm(perm.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Role Management Modal ── */}
        {roleModalOpen && (
          <div className="plat-modal-backdrop" onClick={() => setRoleModalOpen(false)}>
            <div className="plat-modal-content max-w-md" onClick={e => e.stopPropagation()}>
              <div className="plat-modal-header">
                <h3 className="plat-modal-title">{editRole ? 'Update Role Definition' : 'Register New Organizational Role'}</h3>
                <button className="plat-btn plat-btn-icon plat-btn-ghost" onClick={() => setRoleModalOpen(false)}>
                  <X size={14} />
                </button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  name: formData.get('name') as string,
                  description: formData.get('description') as string,
                  displayName: formData.get('name') as string,
                };
                if (editRole) {
                  await updateRole.mutateAsync({ id: editRole.id, ...data });
                } else {
                  await createRole.mutateAsync(data);
                }
                setRoleModalOpen(false);
              }}>
                <div className="plat-modal-body">
                  <div className="plat-form-section">
                    <div className="plat-form-grid-multi" style={{ gridTemplateColumns: '1fr' }}>
                      <div className="plat-form-group">
                        <label className="plat-form-label">Role Name / Identifier *</label>
                        <input name="name" defaultValue={editRole?.name} required className="plat-form-input" placeholder="e.g. Clinical Staff" />
                      </div>
                      <div className="plat-form-group">
                        <label className="plat-form-label">Purpose / Description</label>
                        <textarea name="description" defaultValue={editRole?.description} className="plat-form-input" style={{ minHeight: '100px' }} placeholder="What capabilities does this role typically perform?" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="plat-modal-footer">
                  <button type="button" className="plat-btn plat-btn-ghost" onClick={() => setRoleModalOpen(false)}>Cancel</button>
                  <button type="submit" className="plat-btn plat-btn-primary" disabled={createRole.isPending || updateRole.isPending}>
                    {editRole ? 'Sync Changes' : 'Create Role'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Capability Lab Modal (Permissions) ── */}
        {permModalOpen && (
          <div className="plat-modal-backdrop" onClick={() => setPermModalOpen(false)}>
            <div className="plat-modal-content max-w-md" onClick={e => e.stopPropagation()}>
              <div className="plat-modal-header">
                <h3 className="plat-modal-title">{editPerm ? 'Refine Capability Node' : 'Define New System Capability'}</h3>
                <button className="plat-btn plat-btn-icon plat-btn-ghost" onClick={() => setPermModalOpen(false)}>
                  <X size={14} />
                </button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  name: formData.get('name') as string,
                  module: formData.get('module') as string,
                  description: formData.get('description') as string,
                };
                if (editPerm) {
                  await updatePerm.mutateAsync({ id: editPerm.id, slug: editPerm.slug, ...data });
                } else {
                  await createPerm.mutateAsync(data);
                }
                setPermModalOpen(false);
              }}>
                <div className="plat-modal-body">
                  <div className="plat-form-section">
                    <div className="plat-form-grid-multi" style={{ gridTemplateColumns: '1fr' }}>
                      <div className="plat-form-group">
                        <label className="plat-form-label">Node Friendly Name *</label>
                        <input name="name" defaultValue={editPerm?.name} required className="plat-form-input" placeholder="e.g. Patients View Only" />
                      </div>
                      <div className="plat-form-group">
                        <label className="plat-form-label">System Module / Cluster</label>
                        <select name="module" defaultValue={editPerm?.module || 'CORE'} className="plat-form-input">
                          <option value="CORE">Global Core</option>
                          <option value="PLATFORM">Platform Management</option>
                          <option value="CLINICAL">Clinical Workflows</option>
                          <option value="BILLING">Billing & Finance</option>
                          <option value="INVENTORY">Inventory / Stores</option>
                          <option value="CRM">Patient Relationship</option>
                        </select>
                      </div>
                      <div className="plat-form-group">
                        <label className="plat-form-label">Operational Scope</label>
                        <textarea name="description" defaultValue={editPerm?.description} className="plat-form-input" style={{ minHeight: '80px' }} placeholder="What specific access does this node grant?" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="plat-modal-footer">
                  <button type="button" className="plat-btn plat-btn-ghost" onClick={() => setPermModalOpen(false)}>Discard</button>
                  <button type="submit" className="plat-btn plat-btn-primary" disabled={createPerm.isPending || updatePerm.isPending}>
                    {editPerm ? 'Update Node' : 'Register Node'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}
