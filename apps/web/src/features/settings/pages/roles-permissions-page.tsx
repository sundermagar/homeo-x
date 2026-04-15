import { useState, useMemo } from 'react';
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
  LayoutGrid
} from 'lucide-react';
import { 
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
      r.description.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="plat-rbac-container">
      {/* ── Header ── */}
      <div className="plat-header">
        <div className="plat-header-main">
          <div className="plat-header-icon">
            <Shield size={24} />
          </div>
          <div className="plat-header-content">
            <h1 className="plat-page-title">Identity & Access Control</h1>
            <p className="plat-page-subtitle">Configure organizational roles and capability matrices</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="plat-tab-group">
            <button 
              className={`plat-tab ${activeTab === 'matrix' ? 'active' : ''}`}
              onClick={() => setActiveTab('matrix')}
            >
              <LayoutGrid size={13} />
              Identity Matrix
            </button>
            <button 
              className={`plat-tab ${activeTab === 'lab' ? 'active' : ''}`}
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
        <div className="plat-rbac-grid">
          {/* ── Left: Identity List ── */}
          <div className="flex flex-col gap-4">
            <div className="plat-card p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  className="plat-input w-full pl-9 py-2 bg-slate-50 border-none" 
                  placeholder="Search identities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="plat-role-list">
              {loadingRoles ? (
                <div className="p-8 text-center"><div className="plat-spinner mx-auto" /></div>
              ) : filteredRoles.length === 0 ? (
                <div className="plat-matrix-empty p-6 border-dashed border-2 rounded-xl">
                  <p className="plat-matrix-empty-text">No roles found matching "{searchTerm}"</p>
                </div>
              ) : filteredRoles.map(role => (
                <div 
                  key={role.id}
                  className={`plat-role-item ${selectedRoleId === role.id ? 'active' : ''}`}
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  <div className="plat-role-icon">
                    <Shield size={18} />
                  </div>
                  <div className="plat-role-info">
                    <div className="plat-role-name">{role.name}</div>
                    <div className="plat-role-desc">{role.description}</div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="plat-btn-icon" onClick={(e) => { e.stopPropagation(); setEditRole(role); setModalOpen(true); }}>
                      <Edit2 size={12} />
                    </button>
                    <button className="plat-btn-icon plat-btn-icon-danger" onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id); }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Matrix ── */}
          <div className="plat-matrix-card">
            <div className="plat-matrix-header">
              <div className="plat-matrix-title">
                <Lock size={16} className="text-primary" />
                {selectedRole ? `Capabilities: ${selectedRole.name}` : 'Security Matrix Overview'}
              </div>
              {selectedRole && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <CheckCircle2 size={12} className="text-success" />
                  Live Sync Active
                </div>
              )}
            </div>

            <div className="plat-matrix-table-wrap">
              {loadingSelectedRole ? (
                <div className="p-20 text-center"><div className="plat-spinner mx-auto" /></div>
              ) : !selectedRole ? (
                <div className="plat-matrix-empty">
                  <Shield size={48} className="text-slate-200 mb-2" />
                  <div className="plat-matrix-empty-text">Select an identity group to manage access nodes</div>
                  <p className="text-[11px] text-slate-400 max-w-[240px] mt-1">Assignments are synchronized in real-time across all active sessions.</p>
                </div>
              ) : (
                <table className="plat-matrix-table">
                  <thead>
                    <tr>
                      <th>Capability Node</th>
                      <th>Scope</th>
                      <th className="text-center">Permit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedPermissions).map(([module, perms]) => (
                      <div key={module} className="contents">
                        <tr className="bg-slate-50/50">
                          <td colSpan={3} className="py-2 px-6">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                              <Info size={10} />
                              {module} Module Nodes
                            </div>
                          </td>
                        </tr>
                        {perms.map(perm => (
                          <tr key={perm.id}>
                            <td>
                              <div className="plat-cap-key">{perm.slug || perm.name}</div>
                              <div className="plat-cap-desc">{perm.description || `Grants access to ${perm.name.toLowerCase()} functionality.`}</div>
                            </td>
                            <td><span className="plat-module-badge">{module}</span></td>
                            <td>
                              <div className="flex justify-center">
                                <label className="plat-switch">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedRole.permissions.some(p => p.id === perm.id)}
                                    onChange={() => handleTogglePermission(perm.id)}
                                    disabled={assignPerms.isPending}
                                  />
                                  <span className="plat-slider"></span>
                                </label>
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
          <div className="p-6 border-bottom bg-slate-50/50">
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">Global Capability Dictionary</h3>
            <p className="text-[11px] text-slate-400 mt-1">Manage the available permission nodes accessible to the RBAC engine.</p>
          </div>
          <div className="plat-matrix-table-wrap">
            <table className="plat-matrix-table">
              <thead>
                <tr>
                  <th>Node Identity</th>
                  <th>Identifier (Slug)</th>
                  <th>Cluster</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allPermissions.map(perm => (
                  <tr key={perm.id}>
                    <td>
                       <div className="font-bold text-slate-800">{perm.name}</div>
                       <div className="text-[11px] text-slate-400 mt-0.5">{perm.description || 'No system descriptor.'}</div>
                    </td>
                    <td><code className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">{perm.slug || perm.name}</code></td>
                    <td><span className="plat-module-badge">{perm.module || 'System'}</span></td>
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
        <div className="plat-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="plat-modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">{editRole ? 'Modify Identity' : 'Register New Role'}</h2>
              <button className="plat-modal-close" onClick={() => setModalOpen(false)}><Trash2 size={18} /></button>
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
              <div className="plat-modal-body flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Role Identifier</label>
                  <input name="name" defaultValue={editRole?.name} required className="plat-input" placeholder="e.g. Clinical Director" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Description</label>
                  <textarea name="description" defaultValue={editRole?.description} className="plat-input min-h-[80px]" placeholder="Briefly describe the scope of this role..." />
                </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createRole.isPending || updateRole.isPending}>
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
