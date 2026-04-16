import React, { useState, useMemo } from 'react';
import React, {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Search,
  CheckCircle2,
  Info,
  Layers,
  LayoutGrid,
  X,
  ShieldCheck,
  RotateCw
} from 'lucide-react';
import React, { 
  useRoles, 
  useRole, 
  usePermissions, 
  useAssignPermissions, 
  useCreateRole, 
  useUpdateRole, 
  useDeleteRole,
  Role,
  Permission
} from '../hooks/use-roles-permissions';
import React, { apiClient } from '@/infrastructure/api-client';
import '../../platform/styles/platform.css';
import './roles-permissions.css';

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

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);

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
    if (window.confirm('Are you sure you want to delete this identity group? This action is permanent.')) {
      await deleteRole.mutateAsync(id);
      if (selectedRoleId === id) setSelectedRoleId(null);
    }
  };

  return (
    <div className="plat-page animate-fade-in">
      {/* ── Page Header ── */}
      <div className="plat-header">
        <div className="plat-header-main flex items-center gap-4">
          <div className="plat-header-icon color-primary">
            <Shield size={24} />
          </div>
          <div className="plat-header-content">
            <h1 className="plat-header-title">Identity & Access Control</h1>
            <p className="plat-header-sub">Configure organizational roles and capability matrices</p>
          </div>
        </div>

        <div className="plat-header-actions flex items-center gap-3 mt-4 md:mt-0">
          <div className="plat-tab-group flex bg-warm-2 p-1 rounded-lg gap-1 border border-main">
            <button 
              className={`plat-btn plat-btn-sm ${activeTab === 'matrix' ? 'plat-btn-primary' : ''}`}
              onClick={() => setActiveTab('matrix')}
            >
              <LayoutGrid size={13} />
              Identity Matrix
            </button>
            <button 
              className={`plat-btn plat-btn-sm ${activeTab === 'lab' ? 'plat-btn-primary' : ''}`}
              onClick={() => setActiveTab('lab')}
            >
              <Layers size={13} />
              Capability Lab
            </button>
          </div>
          <button className="plat-btn plat-btn-primary" onClick={() => { setEditRole(null); setModalOpen(true); }}>
            <Plus size={14} />
            Create Role
          </button>
        </div>
      </div>

      {activeTab === 'matrix' ? (
        <div className="plat-grid-sidebar">
          {/* ── Left: Identity List ── */}
          <div className="flex flex-col gap-4">
            <div className="plat-card p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  className="plat-filter-input w-full pl-9 py-2 bg-slate-50 border-none" 
                  placeholder="Search identities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="plat-role-list max-h-[600px] overflow-y-auto flex flex-col gap-2">
              {loadingRoles ? (
                <div className="plat-empty py-12"><RotateCw size={24} className="animate-spin opacity-30" /></div>
              ) : filteredRoles.length === 0 ? (
                <div className="plat-empty py-8 border-dashed border-2 rounded-xl">
                  <p className="plat-empty-text">No roles found matching "{searchTerm}"</p>
                </div>
              ) : filteredRoles.map(role => (
                <div 
                  key={role.id}
                  className={`plat-card flex items-center justify-between p-4 cursor-pointer transition-all hover:bg-warm-1 ${selectedRoleId === role.id ? 'border-primary bg-faded' : ''}`}
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedRoleId === role.id ? 'bg-primary color-white' : 'bg-warm-2 color-primary'}`}>
                      <Shield size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-sm color-ink">{role.name}</div>
                      <div className="text-xs color-muted truncate max-w-[180px]">{role.description || 'System identity group.'}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="plat-btn-icon" onClick={(e) => { e.stopPropagation(); setEditRole(role); setModalOpen(true); }}>
                      <Edit2 size={12} />
                    </button>
                    <button className="plat-btn-icon plat-btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id); }}>
                    <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Matrix ── */}
          <div className="plat-card overflow-hidden">
            <div className="plat-card-header bg-warm-1 flex justify-between items-center p-4">
              <div className="flex items-center gap-2">
                <Lock size={16} className="color-primary" />
                <h3 className="font-bold text-sm">{selectedRole ? `Capabilities: ${selectedRole.name}` : 'Security Matrix Overview'}</h3>
              </div>
              {selectedRole && (
                <div className="flex items-center gap-2 text-[10px] font-bold color-muted uppercase tracking-widest">
                  <CheckCircle2 size={12} className="text-success" />
                  Live Sync Active
                </div>
              )}
            </div>

            <div className="plat-table-container">
              {loadingSelectedRole ? (
                <div className="plat-empty py-20"><RotateCw size={24} className="animate-spin opacity-30" /></div>
              ) : !selectedRole ? (
                <div className="plat-empty py-32">
                  <ShieldCheck size={48} className="plat-empty-icon mb-2" />
                  <p className="plat-empty-text font-bold">Select an identity group to manage access nodes</p>
                  <p className="text-[11px] color-muted max-w-[240px] mt-1 text-center">Assignments are synchronized in real-time across all active sessions.</p>
                </div>
              ) : (
                <table className="plat-table">
                  <thead>
                    <tr>
                      <th>Capability Node</th>
                      <th style={{ width: 120 }}>Scope</th>
                      <th style={{ width: 80, textAlign: 'center' }}>Permit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedPermissions).map(([module, perms]) => (
                      <div key={module} className="contents">
                        <tr className="bg-warm-1">
                          <td colSpan={3} className="py-2 px-6">
                            <div className="flex items-center gap-2 text-[10px] font-black color-muted uppercase tracking-tighter">
                              <Info size={10} />
                              {module} Module Nodes
                            </div>
                          </td>
                        </tr>
                        {perms.map(perm => (
                          <tr key={perm.id}>
                            <td>
                              <div className="font-bold text-sm color-ink">{perm.slug || perm.name}</div>
                              <div className="text-xs color-muted mt-0.5">{perm.description || `Grants access to ${perm.name.toLowerCase()} functionality.`}</div>
                            </td>
                            <td><span className="plat-badge plat-badge-default">{module.toUpperCase()}</span></td>
                            <td>
                              <div className="flex justify-center">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 accent-primary cursor-pointer"
                                  checked={selectedRole.permissions.some(p => p.id === perm.id)}
                                  onChange={() => handleTogglePermission(perm.id)}
                                  disabled={assignPerms.isPending}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </div>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── Capability Lab (Tab 2) ── */
        <div className="plat-card overflow-hidden">
          <div className="plat-card-header bg-warm-1 p-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-tight">Global Capability Dictionary</h3>
              <p className="text-[11px] color-muted mt-1">Manage the available permission nodes accessible to the RBAC engine.</p>
            </div>
          </div>
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th>Node Identity</th>
                  <th>Identifier (Slug)</th>
                  <th>Cluster</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingPerms ? (
                  <tr><td colSpan={4} className="plat-empty py-12"><RotateCw size={24} className="animate-spin opacity-30" /></td></tr>
                ) : allPermissions.map(perm => (
                  <tr key={perm.id}>
                    <td>
                       <div className="font-bold color-ink">{perm.name}</div>
                       <div className="text-[11px] color-muted mt-0.5">{perm.description || 'No system descriptor.'}</div>
                    </td>
                    <td><code className="bg-warm-2 px-2 py-0.5 rounded text-xs font-mono">{perm.slug || perm.name}</code></td>
                    <td><span className="plat-badge plat-badge-default">{(perm.module || 'System').toUpperCase()}</span></td>
                    <td className="text-right">
                       <button className="plat-btn-icon"><Edit2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Role Modal ── */}
      {modalOpen && (
        <div className="plat-modal-overlay animate-fade-in" onClick={() => setModalOpen(false)}>
          <div className="plat-modal max-w-md" onClick={e => e.stopPropagation()}>
            <div className="plat-modal-header p-4 border-b">
              <h3 className="plat-modal-title">{editRole ? 'Modify Identity' : 'Register New Role'}</h3>
              <button className="plat-btn-icon" onClick={() => setModalOpen(false)}><X size={18} /></button>
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
              setModalOpen(false);
            }}>
              <div className="plat-modal-body p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="plat-form-label uppercase text-[10px] font-bold color-muted">Role Identifier</label>
                  <input name="name" defaultValue={editRole?.name} required className="plat-form-input" placeholder="e.g. Clinical Director" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="plat-form-label uppercase text-[10px] font-bold color-muted">Description</label>
                  <textarea name="description" defaultValue={editRole?.description} className="plat-form-input min-h-[100px]" placeholder="Briefly describe the scope of this role..." />
                </div>
              </div>
              <div className="plat-modal-footer p-4 bg-warm-1 flex justify-end gap-2 border-t">
                <button type="button" className="plat-btn" onClick={() => setModalOpen(false)}>Cancel Operation</button>
                <button type="submit" className="plat-btn plat-btn-primary px-6" disabled={createRole.isPending || updateRole.isPending}>
                  {editRole ? 'Commit Changes' : 'Create Identity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
