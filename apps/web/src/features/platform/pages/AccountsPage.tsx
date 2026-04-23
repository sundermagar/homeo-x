import { useState } from 'react';
import { UserCog, Plus, Search, Edit2, Trash2, RefreshCw, UserCheck, Mail, ShieldCheck, Building, MoreVertical, Check, User as UserIcon } from 'lucide-react';
import { useAccounts, useDeleteAccount } from '../hooks/use-accounts';
import { useOrganizations } from '../hooks/use-organizations';
import { AccountModal } from '../components/AccountModal';
import type { StaffSummary } from '@mmc/types';
import '../styles/platform.css';

export default function AccountsPage() {
  const [clinicFilter, setClinicFilter] = useState<number | undefined>();
  const [modalOpen, setModalOpen]       = useState(false);
  const [editing, setEditing]           = useState<StaffSummary | undefined>();

  const { data: accounts = [], isLoading } = useAccounts(clinicFilter);
  const { data: orgs = [] }                = useOrganizations();
  const deleteAccount                      = useDeleteAccount();

  const sortedAccounts = [...accounts].sort((a, b) => a.id - b.id);

  const openCreate = () => { setEditing(undefined); setModalOpen(true); };
  const openEdit   = (a: StaffSummary) => { setEditing(a); setModalOpen(true); };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete account for "${name}"? This will remove their login access.`)) return;
    await deleteAccount.mutateAsync(id);
  };

  const getClinicName = (id: number | null) =>
    id ? orgs.find(o => o.id === id)?.name ?? `Clinic #${id}` : '—';

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const renderRoleBadge = (designation?: string) => {
    const d = (designation || '').toLowerCase();
    if (d.includes('admin')) return <span className="role-badge role-badge-admin"><UserCheck size={10} /> AGENCY ADMIN</span>;
    if (d.includes('client')) return <span className="role-badge role-badge-client"><UserIcon size={10} /> CLIENT</span>;
    return <span className="role-badge role-badge-member"><UserIcon size={10} /> AGENCY MEMBER</span>;
  };

  return (
    <div className="plat-page fade-in">

      {/* ─── Header ─── */}
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <UserIcon size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            All Users
          </h1>
          <p className="plat-header-sub">
            Manage users across all tenants
          </p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={openCreate} style={{ background: '#0f172a', borderColor: '#0f172a' }}>
            <Plus size={14} strokeWidth={2.4} />
            Create Admin User
          </button>
        </div>
      </div>

      {/* ─── Filter & Search ─── */}
      <div className="plat-filters">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Station Filter
          </span>
          <select
            className="plat-form-input"
            style={{ width: '220px', height: '36px' }}
            value={clinicFilter ?? ''}
            onChange={e => setClinicFilter(e.target.value ? parseInt(e.target.value) : undefined)}
          >
            <option value="">All Registered Clinics</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="plat-badge plat-badge-default" style={{ padding: '4px 10px', fontSize: '0.72rem' }}>
            {accounts.length} Total Accounts
          </div>
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty">
            <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
          </div>
        ) : accounts.length === 0 ? (
          <div className="plat-empty">
            <UserCog size={28} className="plat-empty-icon" />
            <p className="plat-empty-text">No accounts found. Create the first account manager.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th>USER</th>
                  <th>ROLE</th>
                  <th>AGENCY</th>
                  <th>SECURITY</th>
                  <th>STATUS</th>
                  <th>CREATED</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {sortedAccounts.map((account) => (
                  <tr key={account.id} className="plat-table-row">
                    <td data-label="USER">
                      <div className="user-cell">
                        <div className="user-avatar-circle">{getInitials(account.name)}</div>
                        <div className="user-info-stack">
                          <span className="user-name-text">{account.name}</span>
                          <span className="user-email-text">{account.email}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="ROLE">
                      {renderRoleBadge(account.designation)}
                    </td>
                    <td data-label="AGENCY">
                      <div className="agency-cell">
                        <Building size={14} style={{ opacity: 0.5 }} />
                        <span>{getClinicName(account.clinicId)}</span>
                      </div>
                    </td>
                    <td data-label="SECURITY">
                      <div className="security-stack">
                        <div className="security-item">
                           <Check size={12} className="security-icon-check" />
                           <span>Email</span>
                        </div>
                        <div className="security-item">
                           <Check size={12} className="security-icon-check" />
                           <span>2FA</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="STATUS">
                      <span className="status-badge-active">
                        <Check size={10} /> Active
                      </span>
                    </td>
                    <td data-label="CREATED">
                      <span style={{ fontSize: '12px', color: 'var(--pp-text-3)' }}>
                        {new Date(account.createdAt).toLocaleDateString('en-GB')}
                      </span>
                    </td>
                    <td data-label="ACTIONS" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button className="plat-btn plat-btn-icon plat-btn-ghost" title="Edit" onClick={() => openEdit(account)}>
                          <Edit2 size={13} strokeWidth={1.6} />
                        </button>
                        <button
                          className="plat-btn plat-btn-icon plat-btn-ghost-danger"
                          title="Delete"
                          onClick={() => handleDelete(account.id, account.name)}
                          disabled={deleteAccount.isPending}
                        >
                          <Trash2 size={13} strokeWidth={1.6} />
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

      {/* ─── Modal ─── */}
      {modalOpen && (
        <AccountModal
          mode={editing ? 'edit' : 'create'}
          account={editing}
          organizations={orgs}
          onClose={() => { setModalOpen(false); setEditing(undefined); }}
        />
      )}
    </div>
  );
}
