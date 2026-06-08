import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  RefreshCw,
  Download,
  ArrowRight,
  PieChart,
} from 'lucide-react';
import { useBalanceSummary, useDailyCollection } from '../hooks/use-billing';
import '../styles/billing.css';

export default function ViewBalancePage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

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
    <div className="pp-page-container animate-fade-in" style={{ padding: '24px 32px' }}>
      {/* Premium Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--pp-text-primary)', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 8px 0' }}>
            <Wallet size={24} style={{ color: 'var(--pp-blue)' }} />
            View Balance
          </h1>
          <p className="billing-subtitle">
            Daily balance overview - Cash in hand and bank positions
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={exportToCSV} className="pp-btn pp-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <FileText size={16} /> Excel
          </button>
          <button onClick={handlePrint} className="pp-btn pp-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Filters Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--pp-text-muted)' }} />
          <input
            type="text"
            className="pp-input"
            style={{ width: '100%', paddingLeft: '36px', height: '36px', borderRadius: '8px' }}
            placeholder="Search by RegID, Patient or Doctor..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(''); setPage(1); }}
              style={{ position: 'absolute', right: '12px', top: '10px', background: 'none', border: 'none', color: 'var(--pp-text-muted)', cursor: 'pointer', padding: 0 }}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--pp-text-muted)', fontFamily: 'var(--pp-font-mono)' }}>
          {filteredBalances.length} record{filteredBalances.length !== 1 ? 's' : ''}
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
            onLimitChange={() => {}}
          />
        </div>
        <button className="date-nav-btn" onClick={handleNextDay}>
          Next →
        </button>
      </div>

      {/* Balance Summary Cards */}
      <div className="balance-cards-grid">
        {/* Cash in Hand */}
        <div className="balance-card cash">
          <div className="balance-card-header">
            <DollarSign size={28} />
            <span className="balance-card-badge">Cash</span>
          </div>
          <div className="balance-card-amount">₹{cashInHand.toLocaleString('en-IN')}</div>
          <div className="balance-card-label">Cash in Hand</div>
          <div className="balance-card-breakdown">
            <span>Received: ₹{totalReceived.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Bank Balance */}
        <div className="balance-card bank">
          <div className="balance-card-header">
            <Building2 size={28} />
            <span className="balance-card-badge">Bank</span>
          </div>
          <div className="balance-card-amount">₹{bankBalance.toLocaleString('en-IN')}</div>
          <div className="balance-card-label">Bank Deposits</div>
          <div className="balance-card-breakdown">
            <span>Total: ₹{totalReceived.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Total Collection */}
        <div className="balance-card total">
          <div className="balance-card-header">
            <TrendingUp size={28} />
            <span className="balance-card-badge">Collection</span>
          </div>
          <div className="balance-card-amount">₹{totalReceived.toLocaleString('en-IN')}</div>
          <div className="balance-card-label">Total Collection</div>
          <div className="balance-card-breakdown">
            <span>Charges: ₹{totalCharges.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Pending Balance */}
        <div className="balance-card pending">
          <div className="balance-card-header">
            <TrendingDown size={28} />
            <span className="balance-card-badge">Pending</span>
          </div>
          <div className="balance-card-amount">₹{totalBalance.toLocaleString('en-IN')}</div>
          <div className="balance-card-label">Balance Pending</div>
          <div className="balance-card-breakdown">
            <span>{collection?.recordCount || 0} transactions</span>
          </div>
        </div>
      </div>

      {/* Quick Summary */}
      <div className="balance-summary-section">
        <h3 className="section-title">
          <PieChart size={20} />
          Balance Summary for{' '}
          {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </h3>

        <div className="balance-summary-grid">
          {/* Opening Balance */}
          <div className="balance-summary-item">
            <span className="balance-summary-label">Opening Balance</span>
            <span className="balance-summary-value">₹0.00</span>
          </div>

          {/* Total Collection */}
          <div className="balance-summary-item highlight-success">
            <span className="balance-summary-label">+ Total Collection</span>
            <span className="balance-summary-value">₹{totalReceived.toLocaleString('en-IN')}</span>
          </div>

          {/* Cash Deposits */}
          <div className="balance-summary-item">
            <span className="balance-summary-label">- Cash Deposits</span>
            <span className="balance-summary-value">₹{todayDeposits.toLocaleString('en-IN')}</span>
          </div>

          {/* Expenses */}
          <div className="balance-summary-item highlight-danger">
            <span className="balance-summary-label">- Expenses</span>
            <span className="balance-summary-value">₹{todayExpenses.toLocaleString('en-IN')}</span>
          </div>

          {/* Closing Balance */}
          <div className="balance-summary-item closing">
            <span className="balance-summary-label">Closing Balance</span>
            <span className="balance-summary-value">
              ₹{(cashInHand - todayExpenses).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="balance-nav-links">
        <button className="balance-nav-card" onClick={() => navigate('/billing/collection')}>
          <DollarSign size={24} />
          <span>View Collection</span>
          <ArrowRight size={16} />
        </button>
        <button className="balance-nav-card" onClick={() => navigate('/billing/deposits')}>
          <Building2 size={24} />
          <span>Deposits</span>
          <ArrowRight size={16} />
        </button>
        <button className="balance-nav-card" onClick={() => navigate('/billing/expenses')}>
          <TrendingDown size={24} />
          <span>Expenses</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
