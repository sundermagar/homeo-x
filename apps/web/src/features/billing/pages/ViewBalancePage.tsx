import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Search, X, Wallet, FileText, CheckCircle2 } from 'lucide-react';
import { usePatientBalances, useUpdateBalanceNote } from '../hooks/use-billing';
import { Pagination } from '@/shared/components/Pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import '../styles/billing.css';

export default function ViewBalancePage() {
  const navigate = useNavigate();
  const { data: balances, isLoading } = usePatientBalances();
  const updateNoteMutation = useUpdateBalanceNote();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  
  // State for editing notes
  const [editingRegId, setEditingRegId] = useState<number | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  const filteredBalances = useMemo(() => {
    return balances?.filter(b => 
      b.regid.toString().includes(searchQuery) ||
      b.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.doctorName && b.doctorName.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || [];
  }, [balances, searchQuery]);

  const paginatedBalances = useMemo(() => {
    return filteredBalances.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredBalances, page]);

  const handleEditNote = (regid: number, currentNote: string | null) => {
    setEditingRegId(regid);
    setEditNoteText(currentNote || '');
  };

  const handleSaveNote = async (regid: number) => {
    try {
      await updateNoteMutation.mutateAsync({ regid, note: editNoteText });
      setEditingRegId(null);
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditingRegId(null);
    setEditNoteText('');
  };

  return (
    <div className="pp-page-container bill-page animate-fade-in">
      {/* Header */}
      <div className="bill-header">
        <div>
          <h1 className="bill-header-title">
            <Wallet size={20} strokeWidth={1.6} style={{ color: 'var(--pp-blue)' }} />
            View Balance
          </h1>
          <p className="bill-header-sub">Track patients with outstanding balances and manage follow-up notes.</p>
        </div>
        <div className="bill-header-actions">
          <button className="bill-btn bill-btn-secondary">
            <FileText size={14} strokeWidth={2} /> Excel
          </button>
          <button className="bill-btn bill-btn-secondary">
            <Download size={14} strokeWidth={2} /> PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bill-filters" style={{ marginBottom: 'var(--pp-space-4)' }}>
        <div className="bill-search-wrap">
          <Search size={13} className="bill-search-icon" strokeWidth={2} />
          <input
            type="text"
            className="bill-filter-input bill-search-input"
            style={{ width: '250px' }}
            placeholder="Search by RegID, Patient or Doctor..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
        </div>
        {searchQuery && (
          <button
            className="bill-btn bill-btn-sm"
            onClick={() => { setSearchQuery(''); setPage(1); }}
            title="Clear filters"
          >
            <X size={12} strokeWidth={2.5} /> Clear
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--pp-text-3)', fontFamily: 'var(--pp-font-mono)' }}>
          {filteredBalances.length} record{filteredBalances.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton rows={10} columns={5} />
      ) : filteredBalances.length === 0 ? (
        <EmptyState 
          icon={Wallet}
          title={searchQuery ? "No matches found" : "No outstanding balances"}
          description={searchQuery ? "No patients matching your search criteria were found." : "All patient balances are cleared."}
          actionLabel={searchQuery ? "Clear Search" : undefined}
          onAction={searchQuery ? () => { setSearchQuery(''); setPage(1); } : undefined}
          variant="card"
          className="my-8"
        />
      ) : (
        <div className="bill-card fade-in" style={{ boxShadow: 'var(--pp-premium-shadow)' }}>
          <div className="bill-table-container">
            <table className="bill-table">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>RegID</th>
                  <th>Patient Name</th>
                  <th>Doctor Name</th>
                  <th style={{ width: 120 }}>Balance</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBalances.map((b) => (
                  <tr key={b.regid}>
                    <td data-label="RegID">
                      <div className="plat-cell-val">
                        <div style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--pp-ink)' }}>
                          REG #{b.regid}
                        </div>
                      </div>
                    </td>
                    <td data-label="Patient Name">
                      <div className="plat-cell-val">
                        <span 
                          onClick={() => navigate(`/medical-cases/${b.regid}`)}
                          style={{ 
                            fontWeight: 600, 
                            fontSize: '0.875rem', 
                            color: 'var(--pp-blue)', 
                            textTransform: 'capitalize',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            textDecorationColor: 'transparent',
                            transition: 'text-decoration-color 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.textDecorationColor = 'var(--pp-blue)'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecorationColor = 'transparent'}
                        >
                          {b.patientName}
                        </span>
                      </div>
                    </td>
                    <td data-label="Doctor Name">
                      <div className="plat-cell-val">
                        <div style={{ fontSize: '0.875rem', color: 'var(--pp-text-3)', textTransform: 'capitalize' }}>
                          {b.doctorName || '—'}
                        </div>
                      </div>
                    </td>
                    <td data-label="Balance">
                      <div className="plat-cell-val">
                        <div style={{
                          fontFamily: 'var(--pp-font-mono)',
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: 'var(--pp-danger-fg)',
                          letterSpacing: '-0.01em',
                        }}>
                          ₹{b.balance.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </td>
                    <td data-label="Notes">
                      <div className="plat-cell-val">
                        {editingRegId === b.regid ? (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%', maxWidth: '300px' }}>
                            <input
                              type="text"
                              value={editNoteText}
                              onChange={(e) => setEditNoteText(e.target.value)}
                              className="bill-form-input"
                              style={{ padding: '4px 8px', fontSize: '0.8rem', height: '28px', flex: 1 }}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveNote(b.regid);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                            />
                            <button 
                              onClick={() => handleSaveNote(b.regid)}
                              className="bill-btn bill-btn-sm bill-btn-primary" 
                              style={{ padding: '0 8px', height: '28px' }}
                              disabled={updateNoteMutation.isPending}
                            >
                              <CheckCircle2 size={13} />
                            </button>
                            <button 
                              onClick={handleCancelEdit}
                              className="bill-btn bill-btn-sm" 
                              style={{ padding: '0 8px', height: '28px', background: 'var(--pp-warm-3)', color: 'var(--pp-ink)' }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <div style={{ fontSize: '0.85rem', color: b.notes ? 'var(--pp-ink)' : 'var(--pp-text-4)', flex: 1 }}>
                              {b.notes || <span style={{ fontStyle: 'italic' }}>No notes</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
                              <button 
                                onClick={() => handleEditNote(b.regid, b.notes)}
                                className="bill-btn bill-btn-sm bill-btn-secondary" 
                                style={{ padding: '2px 10px', fontSize: '0.75rem', height: '24px' }}
                              >
                                {b.notes ? 'Edit' : 'Add Note'}
                              </button>
                              {b.notes && (
                                <button 
                                  onClick={() => {
                                    if (confirm('Are you sure you want to remove this note?')) {
                                      updateNoteMutation.mutate({ regid: b.regid, note: '' });
                                    }
                                  }}
                                  className="bill-btn bill-btn-sm" 
                                  style={{ padding: '2px 10px', fontSize: '0.75rem', height: '24px', background: 'var(--pp-danger-bg)', color: 'var(--pp-danger-fg)', border: 'none' }}
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        totalItems={filteredBalances.length}
        itemsPerPage={itemsPerPage}
        currentPage={page}
        onPageChange={(p) => setPage(p)}
        onLimitChange={() => {}}
      />
    </div>
  );
}