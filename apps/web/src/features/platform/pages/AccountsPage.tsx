import { useState, useRef, useEffect } from 'react';
import { UserCog, Search } from 'lucide-react';
import { useAccounts } from '../hooks/use-accounts';
import { useOrganizations } from '../hooks/use-organizations';
import '../styles/platform.css';

import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';

export default function AccountsPage() {
  const [clinicFilter, setClinicFilter] = useState<number | undefined>();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: accounts = [], isLoading } = useAccounts(clinicFilter);
  const { data: orgs = [] }                = useOrganizations();

  const filteredOrgs = orgs.filter(o =>
    o.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(accounts);

  const getClinicName = (id: number | null) =>
    id ? orgs.find(o => o.id === id)?.name ?? `Clinic #${id}` : '—';

  return (
    <div className="plat-page fade-in">

      {/* ─── Header ─── */}
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <UserCog size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Clinic Accounts
          </h1>
          <p className="plat-header-sub">
            Consolidated clinical directory. View all user accounts (Doctors, Clinic Admins, Receptionists, Employees, and Finance Managers) mapped to each clinic's system.
          </p>
        </div>
      </div>

      {/* ─── Filter & Search ─── */}
      <div className="plat-filters" style={{ overflow: 'visible' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 100 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Station Filter
          </span>
          <div ref={dropdownRef} style={{ position: 'relative', width: '220px' }}>
            <button
              type="button"
              className="plat-form-input"
              style={{
                width: '100%',
                height: '36px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                background: 'var(--bg-card)',
                padding: '0 12px',
                borderRadius: 'var(--pp-radius-btn)',
                border: '1px solid var(--pp-warm-4)',
                fontSize: '13px',
                color: 'var(--pp-ink)'
              }}
              onClick={() => setIsOpen(!isOpen)}
            >
              <span>{clinicFilter ? orgs.find(o => o.id === clinicFilter)?.name ?? 'Select Clinic' : 'All Registered Clinics'}</span>
              <span style={{
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: '5px solid var(--pp-text-3)',
                marginLeft: '8px',
                transition: 'transform 0.2s',
                transform: isOpen ? 'rotate(180deg)' : 'none'
              }} />
            </button>

            {isOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  width: '100%',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--pp-warm-4)',
                  borderRadius: '8px',
                  boxShadow: 'var(--pp-shadow-premium)',
                  zIndex: 9999,
                  padding: '4px',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Search Input Sticky Container */}
                <div style={{
                  padding: '4px',
                  position: 'sticky',
                  top: 0,
                  backgroundColor: 'var(--bg-card)',
                  zIndex: 10,
                  borderBottom: '1px solid var(--pp-warm-3)',
                  marginBottom: '4px'
                }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={12} style={{ position: 'absolute', left: '8px', top: '10px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="plat-form-input"
                      placeholder="Search clinic..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onClick={(e) => e.stopPropagation()} // Prevent closing dropdown
                      style={{
                        width: '100%',
                        height: '28px',
                        paddingLeft: '26px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid var(--pp-warm-4)',
                        background: 'var(--bg-card)',
                        outline: 'none',
                        color: 'var(--pp-ink)'
                      }}
                      autoFocus
                    />
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {searchTerm === '' && (
                    <div
                      style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        color: clinicFilter === undefined ? 'var(--pp-blue)' : 'var(--pp-ink)',
                        backgroundColor: clinicFilter === undefined ? 'var(--pp-blue-tint)' : 'transparent',
                        fontWeight: clinicFilter === undefined ? 600 : 400,
                        cursor: 'pointer',
                        borderRadius: '6px',
                        transition: 'background-color 0.2s'
                      }}
                      onClick={() => {
                        setClinicFilter(undefined);
                        setIsOpen(false);
                      }}
                      onMouseEnter={(e) => {
                        if (clinicFilter !== undefined) e.currentTarget.style.backgroundColor = 'var(--pp-warm-2)';
                      }}
                      onMouseLeave={(e) => {
                        if (clinicFilter !== undefined) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      All Registered Clinics
                    </div>
                  )}

                  {filteredOrgs.length === 0 ? (
                    <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                      No clinics found
                    </div>
                  ) : (
                    filteredOrgs.map(o => {
                      const isSelected = clinicFilter === o.id;
                      return (
                        <div
                          key={o.id}
                          style={{
                            padding: '8px 12px',
                            fontSize: '13px',
                            color: isSelected ? 'var(--pp-blue)' : 'var(--pp-ink)',
                            backgroundColor: isSelected ? 'var(--pp-blue-tint)' : 'transparent',
                            fontWeight: isSelected ? 600 : 400,
                            cursor: 'pointer',
                            borderRadius: '6px',
                            transition: 'background-color 0.2s'
                          }}
                          onClick={() => {
                            setClinicFilter(o.id);
                            setIsOpen(false);
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--pp-warm-2)';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {o.name}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
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
          <TableSkeleton rows={8} columns={6} />
        ) : accounts.length === 0 ? (
          <EmptyState 
            icon={UserCog}
            title="No accounts found"
            description="Consolidated directory of all login accounts. Select a clinic using the station filter to view accounts."
            variant="card"
            className="my-8"
          />
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
                    <th style={{ width: '150px' }}>Designation / Role</th>
                    <th style={{ width: '80px' }}>Gender</th>
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
                      <td data-label="Designation / Role">
                        <div className="plat-cell-val">
                          <span className="plat-badge plat-badge-primary" style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '6px' }}>
                            {account.designation || '—'}
                          </span>
                        </div>
                      </td>
                      <td data-label="Gender">
                        <div className="plat-cell-val">
                          <span className="plat-badge plat-badge-default">
                            {account.gender || '—'}
                          </span>
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
    </div>
  );
}
