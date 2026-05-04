import { useState } from 'react';
import { UserCog, Plus, Search, Edit2, Trash2, RefreshCw } from 'lucide-react';
import { useAccounts, useDeleteAccount } from '../hooks/use-accounts';
import { useOrganizations } from '../hooks/use-organizations';
import { AccountModal } from '../components/AccountModal';
import type { Account } from '@mmc/types';
import '../styles/platform.css';

import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';

export default function AccountsPage() {
  const [clinicFilter, setClinicFilter] = useState<number | undefined>();
  const [modalOpen, setModalOpen]       = useState(false);
  const [editing, setEditing]           = useState<Account | undefined>();

  const { data: accounts = [], isLoading } = useAccounts(clinicFilter);
  const { data: orgs = [] }                = useOrganizations();
  const deleteAccount                      = useDeleteAccount();

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(accounts);

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
          <TableSkeleton rows={8} columns={7} />
        ) : accounts.length === 0 ? (
          <div className="plat-empty">
            <UserCog size={28} className="plat-empty-icon" />
            <p className="plat-empty-text">No accounts found. Create the first account manager.</p>
          </div>
        ) : (
          <>
            <div className="plat-table-container">
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
                  {paginatedData.map((account: any) => (
                    <tr key={account.id}>
                      <td data-label="ID" className="plat-mono-data text-xs" style={{ width: 40 }}>
                        <div>{account.id}</div>
                      </td>
                      <td data-label="Account Holder">
                        <div className="plat-cell-val">
                          <div style={{ fontWeight: 600 }}>{account.name}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                            {account.email || '—'}
                          </div>
                        </div>
                      </td>
                      <td data-label="Linked Clinic">
                        <div className="plat-cell-val">
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {getClinicName(account.clinicId)}
                          </div>
                        </div>
                      </td>
                      <td data-label="Mobile">
                        <div className="plat-cell-val">
                          <div className="plat-mono-data" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {account.mobile || '—'}
                          </div>
                        </div>
                      </td>
                      <td data-label="Designation">
                        <div className="plat-cell-val">
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {account.designation || '—'}
                          </div>
                        </div>
                      </td>
                      <td data-label="Gender">
                        <div className="plat-cell-val">
                          <span className="plat-badge plat-badge-default">
                            {account.gender || '—'}
                          </span>
                        </div>
                      </td>
                      <td data-label="Actions">
                        <div className="plat-cell-val">
                          <div className="flex justify-end gap-2" style={{ width: '100%' }}>
                            <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-ghost" style={{ width: 36, height: 36, borderRadius: 10 }} title="Edit" onClick={() => openEdit(account)}>
                              <Edit2 size={13} strokeWidth={1.6} />
                            </button>
                            <button
                              className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger"
                              style={{ width: 36, height: 36, borderRadius: 10 }}
                              title="Delete"
                              onClick={() => handleDelete(account.id, account.name)}
                              disabled={deleteAccount.isPending}
                            >
                              <Trash2 size={13} strokeWidth={1.6} />
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
