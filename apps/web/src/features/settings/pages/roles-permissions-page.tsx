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
import './roles-permissions.css';

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
    <div className="rbac-page">
      {/* ── Page Header ── */}
      <div className="rbac-header">
        <div>
          <h1 className="rbac-title">
            <Shield size={22} />
            Capabilities & RBAC
          </h1>
          <p className="rbac-subtitle">Configure roles, module permissions, and access control matrices</p>
        </div>
        <div className="rbac-header-actions">
          <div className="rbac-tabs">
            <button
              className={`rbac-tab ${activeTab === 'Roles' ? 'active' : ''}`}
              onClick={() => setActiveTab('Roles')}
            >
              Roles
            </button>
            <button
              className={`rbac-tab ${activeTab === 'Permissions' ? 'active' : ''}`}
              onClick={() => setActiveTab('Permissions')}
            >
              Capabilities
            </button>
          </div>
          <button
            className="btn-primary rbac-new-btn"
            onClick={() => activeTab === 'Roles' ? setShowRoleForm(true) : setShowPermForm(true)}
          >
            <Plus size={15} />
            New {activeTab === 'Roles' ? 'Role' : 'Capability'}
          </button>
        </div>
      </div>

      {/* ── Roles Tab ── */}
      {activeTab === 'Roles' ? (
        <div className="rbac-grid">
          {/* Left: Role list */}
          <div className="rbac-card">
            <div className="rbac-card-header">
              <h3>Active Role Groups</h3>
              <span className="rbac-count">{roles.length} identities</span>
            </div>
            <div className="rbac-list">
              {rolesLoading ? (
                <div className="rbac-loading"><RotateCw size={20} className="spin" /></div>
              ) : roles.length === 0 ? (
                <div className="rbac-empty">No roles defined yet.</div>
              ) : roles.map(r => (
                <div
                  key={r.id}
                  className={`rbac-list-item ${selectedRole?.id === r.id ? 'selected' : ''}`}
                  onClick={() => handleSelectRole(r)}
                >
                  <div className="rbac-list-item-body">
                    <div className="rbac-role-name">{r.name}</div>
                    <div className="rbac-role-desc">{r.description || 'No description provided.'}</div>
                  </div>
                  <div className="rbac-list-actions">
                    <button className="rbac-icon-btn" onClick={(e) => { e.stopPropagation(); openEditRole(r); }} title="Edit">
                      <Edit3 size={13} />
                    </button>
                    <button className="rbac-icon-btn danger" onClick={(e) => { e.stopPropagation(); handleDeleteRole(r.id); }} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Permission matrix */}
          <div className="rbac-card">
            <div className="rbac-card-header">
              <div>
                <h3>{selectedRole ? `Capabilities: ${selectedRole.name}` : 'Security Matrix'}</h3>
                <p className="rbac-card-subtitle">
                  {selectedRole ? 'Toggle permissions for this role' : 'Select a role to manage capabilities'}
                </p>
              </div>
              {selectedRole && <Lock size={16} style={{ color: 'var(--text-muted)' }} />}
            </div>

            {selectedRole ? (
              <div className="rbac-table-wrap">
                <table className="rbac-table">
                  <thead>
                    <tr>
                      <th>CAPABILITY IDENTIFIER</th>
                      <th>MODULE</th>
                      <th>ACCESS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div className="rbac-perm-name">{p.name}</div>
                          <div className="rbac-perm-desc">{p.description || 'Global capability node.'}</div>
                        </td>
                        <td>
                          <span className="rbac-badge">{(p.module || 'CORE').toUpperCase()}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <label className="rbac-toggle">
                            <input
                              type="checkbox"
                              checked={rolePermissions.includes(p.id)}
                              onChange={() => handleTogglePermission(p.id)}
                            />
                            <span className="rbac-toggle-slider" />
                          </label>
                        </td>
                      </tr>
                    ))}
                    {permissions.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                          No capabilities defined. Add one in the Capabilities tab.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rbac-placeholder">
                <ShieldCheck size={48} style={{ opacity: 0.1 }} />
                <p>Select a role identity to modify its capabilities.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Permissions Tab ── */
        <div className="rbac-card">
          <div className="rbac-table-wrap">
            <table className="rbac-table">
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
                  <tr><td colSpan={4} className="rbac-loading-cell"><RotateCw size={20} className="spin" /></td></tr>
                ) : permissions.map(p => (
                  <tr key={p.id}>
                    <td><div className="rbac-perm-name">{p.name}</div></td>
                    <td><span className="rbac-badge">{(p.module || 'CORE').toUpperCase()}</span></td>
                    <td className="rbac-perm-desc">{p.description || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="rbac-icon-btn" onClick={() => openEditPerm(p)} title="Edit">
                          <Edit3 size={14} />
                        </button>
                        <button className="rbac-icon-btn danger" onClick={() => handleDeletePerm(p.id)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {permissions.length === 0 && !permissionsLoading && (
                  <tr><td colSpan={4} className="rbac-empty-cell">No capabilities defined.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Role Modal ── */}
      {showRoleForm && (
        <div className="modal-overlay" onClick={closeRoleForm}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editRoleId ? 'Modify Role' : 'Define Access Identity'}</h3>
              <button className="modal-close" onClick={closeRoleForm}><X size={16} /></button>
            </div>
            <form onSubmit={handleRoleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Role Name</label>
                  <input
                    className="form-input"
                    name="name"
                    required
                    value={roleForm.name}
                    onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                    placeholder="e.g. Senior Practitioner"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    name="description"
                    rows={3}
                    value={roleForm.description}
                    onChange={e => setRoleForm({ ...roleForm, description: e.target.value })}
                    placeholder="Describe the scope of this role..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeRoleForm}>Cancel</button>
                <button type="submit" className="btn-primary">
                  {editRoleId ? 'Commit Changes' : 'Register Identity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Permission Modal ── */}
      {showPermForm && (
        <div className="modal-overlay" onClick={closePermForm}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editPermId ? 'Refine Capability' : 'Map Global Capability'}</h3>
              <button className="modal-close" onClick={closePermForm}><X size={16} /></button>
            </div>
            <form onSubmit={handlePermSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Capability Key</label>
                  <input
                    className="form-input"
                    name="name"
                    required
                    value={permForm.name}
                    onChange={e => setPermForm({ ...permForm, name: e.target.value })}
                    placeholder="e.g. BILLING_VIEW"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Module</label>
                  <input
                    className="form-input"
                    name="module"
                    value={permForm.module}
                    onChange={e => setPermForm({ ...permForm, module: e.target.value })}
                    placeholder="e.g. Accounts"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    name="description"
                    rows={2}
                    value={permForm.description}
                    onChange={e => setPermForm({ ...permForm, description: e.target.value })}
                    placeholder="What does this capability permit?"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closePermForm}>Cancel</button>
                <button type="submit" className="btn-primary">
                  {editPermId ? 'Update Node' : 'Register Capability'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
