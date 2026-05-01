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

const mobileStyles = `
  @media (max-width: 1024px) {
    .plat-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
    .plat-header-actions { width: 100% !important; margin-top: 8px; }
    .plat-header-actions .plat-btn { width: 100% !important; height: 46px !important; border-radius: 12px !important; justify-content: center !important; }

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
    .plat-filters > div:first-child { width: 100% !important; flex-direction: column !important; align-items: stretch !important; gap: 8px !important; }
    .plat-filters select { width: 100% !important; height: 44px !important; border-radius: 12px !important; font-size: 14px !important; }
    .plat-filters > div:last-child { margin: 0 !important; width: 100% !important; justify-content: center !important; }

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
    [data-label="ID"] { background: var(--bg-surface-2) !important; border-bottom: 1px solid var(--border-main) !important; padding: 12px 20px !important; }
  }
`;

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
      <style>{mobileStyles}</style>
    </div>
  );
}
