import { useState } from 'react';
import { format } from 'date-fns';
import { Receipt, Search, ChevronLeft, ChevronRight, FilePlus, Grid, List, Download, Printer } from 'lucide-react';

import { useBills, useDailyCollection } from '../hooks/use-billing';
import { BillingTable } from '../components/BillingTable';
import { Pagination } from '@/components/shared/pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { Drawer } from '@/shared/components/drawer';
import { EmptyState } from '@/components/shared/empty-state';
import { BillingForm } from './BillingFormPage';
import { CustomBillForm } from './CustomBillPage';
import '../styles/billing.css';

function DailyCollectionCard({ label, amount, count, icon, type = 'default' }: { 
  label: string; 
  amount: number; 
  count?: number; 
  icon: React.ReactNode;
  type?: 'success' | 'danger' | 'warning' | 'default';
}) {
  return (
    <div className="bill-stat-card" data-type={type}>
      <div className="bill-stat-icon" style={{ 
        background: type === 'success' ? 'var(--pp-success-bg)' : 
                    type === 'danger' ? 'var(--pp-danger-bg)' : 
                    type === 'warning' ? 'var(--pp-warning-bg)' : 
                    'var(--pp-blue-tint)',
        color: type === 'success' ? 'var(--pp-success-fg)' : 
               type === 'danger' ? 'var(--pp-danger-fg)' : 
               type === 'warning' ? 'var(--pp-warning-fg)' : 
               'var(--pp-blue)'
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="bill-stat-label">{label}</p>
        <div className="bill-stat-value">₹{amount.toLocaleString('en-IN')}</div>
        {count !== undefined && <div className="text-[10px] font-bold text-secondary uppercase tracking-wider mt-1">{count} items</div>}
      </div>
    </div>
  );
}

export default function BillingListPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [page, setPage] = useState(1);
  const [regidFilter, setRegidFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [pageSize, setPageSize] = useState(10);
  const [isNewBillOpen, setIsNewBillOpen] = useState(false);
  const [isCustomBillOpen, setIsCustomBillOpen] = useState(false);

  const parsedRegid = parseInt(regidFilter, 10);
  // Fetch a large batch to allow client-side grouping and pagination
  const billsQuery = useBills({ 
    page: 1, 
    limit: 1000, 
    regid: (!isNaN(parsedRegid) && regidFilter) ? parsedRegid : undefined, 
    date: date || undefined 
  });
  const collectionQuery = useDailyCollection(date);

  const allBills = billsQuery.data?.data ?? [];

  // Group by regid to determine actual pagination items for List view
  const uniqueRegIds = Array.from(new Set(allBills.map(b => b.regid)));
  const totalItems = viewMode === 'list' ? uniqueRegIds.length : allBills.length;
  
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  let displayedBills: typeof allBills = [];
  if (viewMode === 'list') {
    const pageRegIds = new Set(uniqueRegIds.slice(startIndex, endIndex));
    displayedBills = allBills.filter(b => pageRegIds.has(b.regid));
  } else {
    displayedBills = allBills.slice(startIndex, endIndex);
  }

  const getBillTypeLabel = (bill: any) => {
    const description = ((bill.customTitle || bill.treatment || bill.billType) as string || '').toLowerCase();
    const isMedicine = description.includes('medicine');
    if (bill.billType === 'Additional') return 'Additional';
    if (bill.treatment?.startsWith('Package:')) return 'Package';
    if (isMedicine) return 'Medicine';
    if (bill.billType === 'Registration') return 'Registration';
    if (bill.billType === 'Consultation') return 'Consultation';
    return bill.billType || 'Consultation';
  };

  const exportToCSV = () => {
    if (!allBills || allBills.length === 0) return;
    const headers = ['Bill No', 'Date', 'Patient Name', 'Reg ID', 'Type', 'Mode', 'Charges', 'Received', 'Balance'];
    const csvContent = [
      headers.join(','),
      ...allBills.map(b => [
        b.billNo,
        b.billDate ? format(new Date(b.billDate), 'yyyy-MM-dd') : '—',
        `"${b.patientName || ''}"`,
        b.regid,
        getBillTypeLabel(b),
        b.paymentMode || '—',
        b.charges,
        b.received,
        b.balance
      ].join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bill_List_Export_${date || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printPDF = () => {
    if (!allBills || allBills.length === 0) return;
    
    const html = `
      <html>
        <head>
          <title>Bill List Report</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1e293b; }
            h2 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            th { background: #f8fafc; font-weight: bold; }
            .right { text-align: right; }
            @media print {
              body { padding: 0; }
              @page { size: A4 portrait; margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h2>Bill List Report (As of ${date || 'All Dates'})</h2>
          <table>
            <thead>
              <tr>
                <th>Bill #</th>
                <th>Date</th>
                <th>Patient</th>
                <th>Reg ID</th>
                <th>Type</th>
                <th>Mode</th>
                <th class="right">Charges</th>
                <th class="right">Received</th>
                <th class="right">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${allBills.map(b => `
                <tr>
                  <td>${b.billNo}</td>
                  <td>${b.billDate ? format(new Date(b.billDate), 'yyyy-MM-dd') : '—'}</td>
                  <td>${b.patientName || '—'}</td>
                  <td>${b.regid}</td>
                  <td>${getBillTypeLabel(b)}</td>
                  <td>${b.paymentMode || '—'}</td>
                  <td class="right">${b.charges.toLocaleString('en-IN')}</td>
                  <td class="right">${b.received.toLocaleString('en-IN')}</td>
                  <td class="right">${b.balance > 0 ? b.balance.toLocaleString('en-IN') : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.print();
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

      {/* ─── Header ─── */}
      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            <Receipt size={22} strokeWidth={1.6} />
            Billing & Finance
          </h1>
          <p className="pp-page-hero-sub">Manage clinic invoices, daily collections, and patient accounts.</p>
        </div>
        <div className="pp-page-hero-actions">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="pp-input"
            style={{ width: 'auto' }}
          />
          <button className="btn-primary" onClick={() => setIsNewBillOpen(true)}>
            <FilePlus size={14} strokeWidth={1.6} />
            New Bill
          </button>
          <button className="btn-secondary" onClick={() => setIsCustomBillOpen(true)}>
            <FilePlus size={14} strokeWidth={1.6} />
            Custom Bill
          </button>
        </div>
      </div>

      {/* ─── KPI Stats ─── */}
      <div className="bill-stats-bar">
        <DailyCollectionCard
          label="Total Charges"
          amount={collectionQuery.data?.totalCharges ?? 0}
          count={collectionQuery.data?.recordCount}
          type="default"
          icon={<Receipt size={16} strokeWidth={1.8} />}
        />
        <DailyCollectionCard
          label="Total Received"
          amount={collectionQuery.data?.totalReceived ?? 0}
          type="success"
          icon={<svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z" /><path d="M12 4v1m0 14v1m8-8h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" /></svg>}
        />
        <DailyCollectionCard
          label="Outstanding Balance"
          amount={collectionQuery.data?.totalBalance ?? 0}
          type="danger"
          icon={<svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
        <DailyCollectionCard
          label="Avg Ticket"
          amount={
            collectionQuery.data?.recordCount
              ? Math.round(collectionQuery.data.totalCharges / collectionQuery.data.recordCount)
              : 0
          }
          type="warning"
          icon={<svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
      </div>

      {/* ─── Table Section ─── */}
      <div className="pp-section-header">
        <div>
          <h2 className="pp-section-title">Billing Records</h2>
          <p className="pp-section-sub">Daily invoices and transaction history</p>
        </div>

        <div className="pp-filter-controls" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', borderRight: '1px solid var(--border-main)', paddingRight: '12px', marginRight: '4px' }}>
            <button className="btn-secondary" onClick={exportToCSV} disabled={billsQuery.isLoading || allBills.length === 0}>
              <Download size={14} /> Export CSV
            </button>
            <button className="btn-secondary" onClick={printPDF} disabled={billsQuery.isLoading || allBills.length === 0}>
              <Printer size={14} /> Print / PDF
            </button>
          </div>
          {/* Search */}
          <div className="pp-filter-search-wrap" style={{ maxWidth: 220 }}>
            <Search size={14} />
            <input
              type="text"
              className="pp-filter-search-input"
              placeholder="Search by Reg ID…"
              value={regidFilter}
              onChange={(e) => { setRegidFilter(e.target.value); setPage(1); }}
            />
          </div>
          {/* List / Grid toggle */}
          <div className="appt-segmented-toggle">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`appt-segmented-btn ${viewMode === 'list' ? 'active' : ''}`}
              title="List view"
            >
              <List size={14} /> List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`appt-segmented-btn ${viewMode === 'grid' ? 'active' : ''}`}
              title="Card view"
            >
              <Grid size={14} /> Card
            </button>
          </div>
        </div>
      </div>

      {billsQuery.isLoading ? (
        <TableSkeleton rows={8} columns={8} />
      ) : allBills.length === 0 ? (
        <EmptyState 
          icon={Receipt}
          title={regidFilter ? "No billing records found" : "No transactions today"}
          description={regidFilter ? `No bills matching Reg ID "${regidFilter}" were found.` : "Clinical billing is clean. Generate an invoice to start tracking today's collection."}
          actionLabel={regidFilter ? "Clear Search" : "New Bill"}
          onAction={regidFilter ? () => setRegidFilter('') : () => setIsNewBillOpen(true)}
          variant="card"
          className="my-8"
        />
      ) : viewMode === 'list' ? (
        <BillingTable bills={displayedBills} isLoading={false} />
      ) : (
        <div className="bill-card-grid">
          {displayedBills.map((bill) => (
            <div key={bill.id} className="bill-card bill-grid-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--pp-ink)' }}>Bill #{bill.billNo}</div>
                  <div className="text-small" style={{ color: 'var(--pp-text-3)' }}>{bill.billDate ? format(new Date(bill.billDate), 'dd-MM-yyyy') : 'No date'}</div>
                </div>
                <div className="bill-grid-card-icon">
                  <Receipt size={18} />
                </div>
              </div>
              <div style={{ display: 'grid', gap: 10, fontSize: '13px' }}>
                <div><strong>Patient:</strong> {bill.patientName}</div>
                <div><strong>Type:</strong> <span style={{ color: 'var(--pp-text-3)', fontWeight: 600 }}>{getBillTypeLabel(bill)}</span></div>
                <div><strong>Mode:</strong> <span className={`bill-badge ${bill.paymentMode === 'Online' ? 'bill-badge-primary' : 'bill-badge-default'}`}>{bill.paymentMode ?? '—'}</span></div>
                <div><strong>Charges:</strong> ₹{bill.charges.toLocaleString()}</div>
                <div><strong>Received:</strong> ₹{bill.received.toLocaleString()}</div>
                <div><strong>Balance:</strong> {bill.balance > 0 ? `₹${bill.balance.toLocaleString()}` : '—'}</div>
              </div>
              <div className="bill-grid-card-footer">
                <button 
                  className="bill-btn bill-btn-primary" 
                  style={{ width: '100%' }}
                  onClick={() => window.location.href = `/patients/${bill.regid}`}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={Math.ceil(totalItems / pageSize)}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />

      <Drawer isOpen={isNewBillOpen} onClose={() => setIsNewBillOpen(false)} title="Generate New Invoice" maxWidth="500px">
        <BillingForm 
          onSuccess={() => { setIsNewBillOpen(false); billsQuery.refetch(); collectionQuery.refetch(); }} 
          onCancel={() => setIsNewBillOpen(false)} 
        />
      </Drawer>

      <Drawer isOpen={isCustomBillOpen} onClose={() => setIsCustomBillOpen(false)} title="Custom Bill" maxWidth="500px">
        <CustomBillForm 
          onSuccess={() => { setIsCustomBillOpen(false); billsQuery.refetch(); collectionQuery.refetch(); }} 
          onCancel={() => setIsCustomBillOpen(false)} 
        />
      </Drawer>

      <style>{`
        .bill-main { padding: 0; }
        @media (max-width: 640px) {
          .bill-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
          .bill-header-actions { grid-template-columns: 1fr 1fr !important; gap: 8px !important; display: grid !important; }
          .bill-header-actions .bill-btn { height: 44px; justify-content: center; border-radius: 12px; }
          .bill-filter-input { width: 100% !important; height: 44px; border-radius: 12px; }

          .bill-stat-card { padding: 12px !important; }

          .bill-section-header { flex-wrap: wrap; gap: 12px; }
          .bill-section-controls { width: 100%; }
          .bill-search-wrap { flex: 1; min-width: 0; max-width: 100%; }
          .bill-search-input { width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
