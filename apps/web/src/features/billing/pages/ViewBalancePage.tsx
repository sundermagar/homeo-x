import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Search, X, Wallet, FileText, CheckCircle2, User } from 'lucide-react';
import { usePatientBalances, useUpdateBalanceNote } from '../hooks/use-billing';
import { Pagination } from '@/shared/components/Pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import '../../appointments/styles/appointments.css'; // For exact appointment table styling

export default function ViewBalancePage() {
  const navigate = useNavigate();
  const { data: balances, isLoading } = usePatientBalances();
  const updateNoteMutation = useUpdateBalanceNote();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
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
  }, [filteredBalances, page, itemsPerPage]);

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

  const exportToCSV = () => {
    if (!balances?.length) return;
    
    const headers = ['RegID', 'Patient Name', 'Doctor Name', 'Balance', 'Notes'];
    const rows = filteredBalances.map(b => [
      `REG #${b.regid}`,
      b.patientName,
      b.doctorName || '-',
      b.balance.toString(),
      b.notes || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Patient_Balances_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handlePrint = () => {
    if (!balances?.length) return;
    
    const html = `
      <html>
        <head>
          <title>Outstanding Patient Balances</title>
          <style>
            body { font-family: -apple-system, sans-serif; padding: 20px; color: #333; }
            h2 { color: #000; margin-bottom: 5px; }
            p { color: #666; margin-top: 0; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: 600; }
            .amount { color: #d32f2f; font-weight: bold; }
            @media print {
              body { padding: 0; }
              @page { size: A4 portrait; margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h2>Outstanding Patient Balances</h2>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>RegID</th>
                <th>Patient Name</th>
                <th>Doctor Name</th>
                <th>Balance</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${filteredBalances.map(b => `
                <tr>
                  <td>REG #${b.regid}</td>
                  <td>${b.patientName}</td>
                  <td>${b.doctorName || '-'}</td>
                  <td class="amount">₹${b.balance.toLocaleString('en-IN')}</td>
                  <td>${b.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  return (
    <div className="pp-page-container bill-page animate-fade-in">
      {/* Premium Header */}
      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            <Wallet size={22} strokeWidth={1.8} />
            View Balance
          </h1>
          <p className="pp-page-hero-sub">
            Track patients with outstanding balances and manage follow-up notes.
          </p>
        </div>
        <div className="pp-page-hero-actions">
          <button onClick={exportToCSV} className="btn-secondary">
            <FileText size={14} /> Excel
          </button>
          <button onClick={handlePrint} className="btn-secondary">
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Filters Area */}
      <div className="pp-filter-card" style={{ marginBottom: 24 }}>
        <div className="pp-filter-search-wrap">
          <Search size={14} />
          <input
            type="text"
            className="pp-filter-search-input"
            placeholder="Search by RegID, Patient or Doctor..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(''); setPage(1); }}
              style={{ position: 'absolute', right: '12px', top: '10px', background: 'none', border: 'none', color: 'var(--pp-text-muted)', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="pp-filter-controls">
          <span style={{ fontSize: '12px', color: 'var(--pp-text-muted)', fontFamily: 'var(--pp-font-mono)' }}>
            {filteredBalances.length} record{filteredBalances.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Main Table Content */}
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
        <div className="appt-card">
          <div className="pp-table-scroll">
            <table className="pp-table">
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>REGID</th>
                  <th>PATIENT NAME</th>
                  <th>DOCTOR NAME</th>
                  <th style={{ width: '140px' }}>BALANCE</th>
                  <th>NOTES</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBalances.map((b) => (
                  <tr key={b.regid}>
                    <td data-label="REGID">
                      <span className="appt-cell-id">#{b.regid}</span>
                    </td>
                    <td data-label="PATIENT NAME">
                      <div 
                        className="appt-cell-name"
                        onClick={() => navigate(`/medical-cases/${b.regid}`)}
                        style={{ cursor: 'pointer', color: 'var(--pp-primary)', textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color 0.2s ease' }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecorationColor = 'var(--pp-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecorationColor = 'transparent'}
                      >
                        {b.patientName}
                      </div>
                    </td>
                    <td data-label="DOCTOR NAME">
                      {(b.doctorName || '').trim() 
                        ? <span className="appt-doctor-badge"><User size={11} strokeWidth={1.6} />{b.doctorName}</span>
                        : <span className="appt-cell-slash">—</span>}
                    </td>
                    <td data-label="BALANCE">
                      <div style={{
                        fontFamily: 'var(--pp-font-mono)',
                        fontWeight: 700,
                        fontSize: '14px',
                        color: '#dc2626',
                      }}>
                        ₹{b.balance.toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td data-label="NOTES">
                      {editingRegId === b.regid ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={editNoteText}
                            onChange={(e) => setEditNoteText(e.target.value)}
                            className="pp-input"
                            style={{ padding: '4px 10px', fontSize: '13px', height: '28px', flex: 1, minWidth: '150px' }}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveNote(b.regid);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <button 
                            onClick={() => handleSaveNote(b.regid)}
                            className="pp-btn pp-btn-primary" 
                            style={{ padding: '0 8px', height: '28px' }}
                            disabled={updateNoteMutation.isPending}
                          >
                            <CheckCircle2 size={14} />
                          </button>
                          <button 
                            onClick={handleCancelEdit}
                            className="pp-btn pp-btn-secondary" 
                            style={{ padding: '0 8px', height: '28px' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '28px' }}>
                          <div className={b.notes ? "appt-cell-name" : "appt-cell-muted"} style={{ flex: 1, paddingRight: '12px', fontSize: '13px' }}>
                            {b.notes || <span style={{ fontStyle: 'italic', opacity: 0.7 }}>No notes</span>}
                          </div>
                          <button 
                            onClick={() => handleEditNote(b.regid, b.notes)}
                            className="pp-btn pp-btn-secondary" 
                            style={{ padding: '2px 10px', fontSize: '12px', height: '24px', background: '#fff' }}
                          >
                            {b.notes ? 'Edit Note' : 'Add Note'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && filteredBalances.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <Pagination
            totalItems={filteredBalances.length}
            itemsPerPage={itemsPerPage}
            currentPage={page}
            onPageChange={(p) => setPage(p)}
            onLimitChange={(l) => { setItemsPerPage(l); setPage(1); }}
          />
        </div>
      )}
    </div>
  );
}