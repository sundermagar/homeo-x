import { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Edit3,
  Trash2,
  RotateCw,
  X,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { apiClient } from '@/infrastructure/api-client';
import '../../platform/styles/platform.css';

interface Role {
  id: number;
  name: string;
  displayName?: string;
  description?: string;
  permissions?: { id: number; name: string }[];
}

interface Permission {
  id: number;
  name: string;
  module: string;
  description?: string;
}

export function RolesPermissionsPage() {
  const [activeTab, setActiveTab] = useState<'Roles' | 'Permissions'>('Roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // Role form
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editRoleId, setEditRoleId] = useState<number | null>(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<number[]>([]);

  // Permission form
  const [showPermForm, setShowPermForm] = useState(false);
  const [editPermId, setEditPermId] = useState<number | null>(null);
  const [permForm, setPermForm] = useState({ name: '', module: '', description: '' });

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const fetchRoles = async () => {
    setRolesLoading(true);
    try {
      const { data } = await apiClient.get('/roles');
      if (data.success) setRoles(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error('[roles] fetch error:', err);
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchPermissions = async () => {
    setPermissionsLoading(true);
    try {
      const { data } = await apiClient.get('/permissions');
      if (data.success) setPermissions(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error('[permissions] fetch error:', err);
    } finally {
      setPermissionsLoading(false);
    }
  };

  // ─── Role Actions ────────────────────────────────────────────────────────────
  const handleSelectRole = async (role: Role) => {
    setSelectedRole(role);
    try {
      const { data } = await apiClient.get(`/roles/${role.id}`);
      if (data.success) {
        setRolePermissions((data.data.permissions || []).map((p: any) => p.id));
      }
    } catch (err) {
      console.error('[roles] fetch role error:', err);
      setRolePermissions([]);
    }
  };

  const handleTogglePermission = async (permId: number) => {
    if (!selectedRole) return;
    const has = rolePermissions.includes(permId);
    try {
      if (has) {
        await apiClient.delete(`/permissions/roles/${selectedRole.id}/permissions/${permId}`);
        setRolePermissions(rolePermissions.filter(id => id !== permId));
      } else {
        await apiClient.post(`/permissions/roles/${selectedRole.id}/permissions`, { permissionId: permId });
        setRolePermissions([...rolePermissions, permId]);
      }
    } catch (err) {
      console.error('[roles] toggle permission error:', err);
    }
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editRoleId) {
        await apiClient.put(`/roles/${editRoleId}`, roleForm);
      } else {
        await apiClient.post('/roles', roleForm);
      }
      closeRoleForm();
      fetchRoles();
    } catch (err) {
      console.error('[roles] save error:', err);
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!window.confirm('Delete this role permanently?')) return;
    try {
      await apiClient.delete(`/roles/${id}`);
      if (selectedRole?.id === id) setSelectedRole(null);
      fetchRoles();
    } catch (err) {
      console.error('[roles] delete error:', err);
    }
  };

  const openEditRole = (role: Role) => {
    setRoleForm({ name: role.name || '', description: role.description || '' });
    setEditRoleId(role.id);
    setShowRoleForm(true);
  };

  const closeRoleForm = () => {
    setShowRoleForm(false);
    setEditRoleId(null);
    setRoleForm({ name: '', description: '' });
  };

  // ─── Permission Actions ──────────────────────────────────────────────────────
  const handlePermSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editPermId) {
        await apiClient.put(`/permissions/${editPermId}`, permForm);
      } else {
        await apiClient.post('/permissions', permForm);
      }
      closePermForm();
      fetchPermissions();
    } catch (err) {
      console.error('[permissions] save error:', err);
    }
  };

  const handleDeletePerm = async (id: number) => {
    if (!window.confirm('Delete this permission permanently?')) return;
    try {
      await apiClient.delete(`/permissions/${id}`);
      fetchPermissions();
    } catch (err) {
      console.error('[permissions] delete error:', err);
    }
  };

  const openEditPerm = (perm: Permission) => {
    setPermForm({ name: perm.name || '', module: perm.module || '', description: perm.description || '' });
    setEditPermId(perm.id);
    setShowPermForm(true);
  };

  const closePermForm = () => {
    setShowPermForm(false);
    setEditPermId(null);
    setPermForm({ name: '', module: '', description: '' });
  };

  return (
    <div className="plat-page animate-fade-in">
      {/* ── Page Header ── */}
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Shield size={22} className="color-primary" />
            Capabilities & Access
          </h1>
          <p className="plat-header-sub">Configure user roles, module permissions, and security control matrices.</p>
        </div>
        <div className="plat-header-actions">
          <div className="flex bg-warm-2 p-1 rounded-lg gap-1 border border-main">
            <button
              className={`plat-btn plat-btn-sm ${activeTab === 'Roles' ? 'plat-btn-primary' : ''}`}
              onClick={() => setActiveTab('Roles')}
            >
              Role Groups
            </button>
            <button
              className={`plat-btn plat-btn-sm ${activeTab === 'Permissions' ? 'plat-btn-primary' : ''}`}
              onClick={() => setActiveTab('Permissions')}
            >
              Capability Map
            </button>
          </div>
          <button
            className="plat-btn plat-btn-primary"
            onClick={() => activeTab === 'Roles' ? setShowRoleForm(true) : setShowPermForm(true)}
          >
            <Plus size={15} />
            Add {activeTab === 'Roles' ? 'Role' : 'Node'}
          </button>
        </div>
      </div>

      {/* ── Roles Tab ── */}
      {activeTab === 'Roles' ? (
        <div className="plat-grid-sidebar">
          {/* Left: Role list */}
          <div className="plat-card">
            <div className="plat-card-header">
              <h3>System Identities</h3>
              <span className="plat-badge plat-badge-admin">{roles.length} roles</span>
            </div>
            <div className="divide-y divide-main max-h-[600px] overflow-y-auto">
              {rolesLoading ? (
                <div className="plat-empty"><RotateCw size={24} className="animate-spin opacity-30" /></div>
              ) : roles.length === 0 ? (
                <div className="plat-empty"><p className="plat-empty-text">No roles defined yet.</p></div>
              ) : roles.map(r => (
                <div
                  key={r.id}
                  className={`p-4 flex items-start justify-between gap-3 cursor-pointer transition-colors hover:bg-warm-1 ${selectedRole?.id === r.id ? 'bg-faded border-l-4 border-primary' : ''}`}
                  onClick={() => handleSelectRole(r)}
                >
                  <div className="flex-1 min-width-0">
                    <div className="font-bold text-sm color-ink">{r.name}</div>
                    <div className="text-xs color-muted mt-1 leading-relaxed truncate">{r.description || 'Global system role identity.'}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={(e) => { e.stopPropagation(); openEditRole(r); }} title="Edit">
                      <Edit3 size={13} />
                    </button>
                    <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteRole(r.id); }} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Permission matrix */}
          <div className="plat-card">
            <div className="plat-card-header">
              <div>
                <h3>{selectedRole ? `Capabilities: ${selectedRole.name}` : 'Security Matrix'}</h3>
                <p className="plat-header-sub mt-1">
                  {selectedRole ? 'Toggle module-level permissions for this role' : 'Select a role group to manage access nodes'}
                </p>
              </div>
              {selectedRole && <Lock size={16} className="color-muted" />}
            </div>

            {selectedRole ? (
              <div className="plat-table-container">
                <table className="plat-table">
                  <thead>
                    <tr>
                      <th>CAPABILITY IDENTIFIER</th>
                      <th style={{ width: 150 }}>MODULE</th>
                      <th style={{ width: 100, textAlign: 'center' }}>ACCESS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map(p => (
                      <tr key={p.id}>
                        <td data-label="Capability">
                          <div>
                            <div className="font-bold text-sm">{p.name}</div>
                            <div className="text-xs color-muted mt-0.5">{p.description || 'System-level access point.'}</div>
                          </div>
                        </td>
                        <td data-label="Module">
                          <span className="plat-badge plat-badge-default">{(p.module || 'CORE').toUpperCase()}</span>
                        </td>
                        <td data-label="Access">
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-primary cursor-pointer"
                            checked={rolePermissions.includes(p.id)}
                            onChange={() => handleTogglePermission(p.id)}
                          />
                        </td>
                      </tr>
                    ))}
                    {permissions.length === 0 && (
                      <tr>
                        <td colSpan={3} className="plat-empty">
                          <p className="plat-empty-text">No capabilities found.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="plat-empty py-24">
                <ShieldCheck size={48} className="plat-empty-icon" />
                <p className="plat-empty-text">Select a role identity from the left to modify its system capabilities.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Permissions Tab ── */
        <div className="plat-card">
          <div className="plat-card-header">
             <h3>Capability Map</h3>
             <p className="plat-header-sub">Universal system nodes used across all role definitions.</p>
          </div>
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: 280 }}>CAPABILITY NAME</th>
                  <th style={{ width: 160 }}>MODULE</th>
                  <th>DESCRIPTION</th>
                  <th style={{ width: 100, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {permissionsLoading ? (
                  <tr><td colSpan={4} className="plat-empty"><RotateCw size={24} className="animate-spin opacity-30" /></td></tr>
                ) : permissions.map(p => (
                  <tr key={p.id}>
                    <td data-label="Name"><div className="font-bold">{p.name}</div></td>
                    <td data-label="Module"><span className="plat-badge plat-badge-default">{(p.module || 'CORE').toUpperCase()}</span></td>
                    <td data-label="Description"><div className="text-xs color-muted">{p.description || '—'}</div></td>
                    <td>
                      <div className="plat-action-group">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => openEditPerm(p)} title="Edit">
                          <Edit3 size={14} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDeletePerm(p.id)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {permissions.length === 0 && !permissionsLoading && (
                  <tr><td colSpan={4} className="plat-empty">No capabilities defined.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Role Modal ── */}
      {showRoleForm && (
        <div className="plat-modal-overlay animate-fade-in" onClick={closeRoleForm}>
          <div className="plat-modal" onClick={e => e.stopPropagation()}>
            <div className="plat-modal-header">
              <h3 className="plat-modal-title">{editRoleId ? 'Refine Role Identity' : 'New System Role'}</h3>
              <button className="plat-btn plat-btn-icon" onClick={closeRoleForm}><X size={16} /></button>
            </div>
            <form onSubmit={handleRoleSubmit}>
              <div className="plat-modal-body plat-form">
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Role Name</label>
                  <input
                    className="plat-form-input"
                    required
                    value={roleForm.name}
                    onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                    placeholder="e.g. Clinical Administrator"
                  />
                </div>
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Scope Description</label>
                  <textarea
                    className="plat-form-input"
                    style={{ minHeight: '100px' }}
                    value={roleForm.description}
                    onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                    placeholder="Define the primary responsibilities and access scope..."
                  />
                </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={closeRoleForm}>Cancel Operation</button>
                <button type="submit" className="plat-btn plat-btn-primary px-8">
                  {editRoleId ? 'Commit Changes' : 'Register Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Permission Modal ── */}
      {showPermForm && (
        <div className="plat-modal-overlay animate-fade-in" onClick={closePermForm}>
          <div className="plat-modal" onClick={e => e.stopPropagation()}>
            <div className="plat-modal-header">
              <h3 className="plat-modal-title">{editPermId ? 'Refine Capability Map' : 'Register Global Capability'}</h3>
              <button className="plat-btn plat-btn-icon" onClick={closePermForm}><X size={16} /></button>
            </div>
            <form onSubmit={handlePermSubmit}>
              <div className="plat-modal-body plat-form">
                <div className="plat-form-group">
                  <label className="plat-form-label">Capability Key</label>
                  <input
                    className="plat-form-input"
                    required
                    value={permForm.name}
                    onChange={e => setPermForm({ ...permForm, name: e.target.value })}
                    placeholder="e.g. INVOICE_VOID"
                  />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Module Context</label>
                  <input
                    className="plat-form-input"
                    value={permForm.module}
                    onChange={e => setPermForm({ ...permForm, module: e.target.value })}
                    placeholder="e.g. Accounts"
                  />
                </div>
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Functional Description</label>
                  <textarea
                    className="plat-form-input"
                    style={{ minHeight: '80px' }}
                    value={permForm.description}
                    onChange={e => setPermForm({ ...permForm, description: e.target.value })}
                    placeholder="What does this capability allow a user to do?"
                  />
                </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={closePermForm}>Cancel Operation</button>
                <button type="submit" className="plat-btn plat-btn-primary px-8">
                  {editPermId ? 'Update Node' : 'Map Capability'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
