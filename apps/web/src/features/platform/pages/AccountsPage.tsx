import { useState } from 'react';
import { UserCog, Plus, Search, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { useAccounts, useDeleteAccount } from '../hooks/use-accounts';
import { useOrganizations } from '../hooks/use-organizations';
import { AccountModal } from '../components/AccountModal';
import type { Account } from '@mmc/types';
import '../styles/platform.css';

export default function AccountsPage() {
  const [clinicFilter, setClinicFilter] = useState<number | undefined>();
  const [modalOpen, setModalOpen]       = useState(false);
  const [editing, setEditing]           = useState<Account | undefined>();

  const { data: accounts = [], isLoading } = useAccounts(clinicFilter);
  const { data: orgs = [] }                = useOrganizations();
  const deleteAccount                      = useDeleteAccount();

  const openCreate = () => { setEditing(undefined); setModalOpen(true); };
  const openEdit   = (a: Account) => { setEditing(a); setModalOpen(true); };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete account for "${name}"? This will remove their login access.`)) return;
    await deleteAccount.mutateAsync(id);
  };

  const getClinicName = (id: number | null) =>
    id ? orgs.find(o => o.id === id)?.name ?? `Clinic #${id}` : '—';

  return (
    <div className="plat-page fade-in">

      {/* ─── Header ─── */}
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <UserCog size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Account Managers
          </h1>
          <p className="plat-header-sub">
            Clinic admin accounts. Each account is mirrored to the clinic's login system.
          </p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={openCreate}>
            <Plus size={14} strokeWidth={1.6} />
            New Account
          </button>
        </div>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="plat-filters">
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          Filter by Clinic
        </span>
        <select
          className="plat-filter-input"
          style={{ minWidth: '200px' }}
          value={clinicFilter ?? ''}
          onChange={e => setClinicFilter(e.target.value ? parseInt(e.target.value) : undefined)}
        >
          <option value="">All Clinics</option>
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          {accounts.length} records
        </span>
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
          <div style={{ overflowX: 'auto' }}>
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>ID</th>
                  <th>Account Holder</th>
                  <th style={{ width: '200px' }}>Linked Clinic</th>
                  <th style={{ width: '130px' }}>Mobile</th>
                  <th style={{ width: '120px' }}>Designation</th>
                  <th style={{ width: '80px' }}>Gender</th>
                  <th style={{ width: '90px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account, index) => (
                  <tr key={account.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {accounts.length - index}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{account.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                        {account.email || '—'}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {getClinicName(account.clinicId)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {account.mobile || '—'}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {account.designation || '—'}
                    </td>
                    <td>
                      <span className="plat-badge plat-badge-default">
                        {account.gender || '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="plat-btn plat-btn-sm plat-btn-icon" title="Edit" onClick={() => openEdit(account)}>
                          <Edit2 size={13} strokeWidth={1.6} />
                        </button>
                        <button
                          className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger"
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
