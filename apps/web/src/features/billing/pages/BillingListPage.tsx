import { useState } from 'react';
import { format } from 'date-fns';
import { Receipt, Search, ChevronLeft, ChevronRight, FilePlus, Grid, List, Printer } from 'lucide-react';

import { useBills, useDailyCollection } from '../hooks/use-billing';
import { BillingTable } from '../components/BillingTable';
import { Pagination } from '@/components/shared/pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { Drawer } from '@/shared/components/drawer';
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
  const accentMap: Record<string, string> = {
    success: 'var(--pp-success-fg)', danger: 'var(--pp-danger-fg)',
    warning: 'var(--pp-warning-fg)', default: 'var(--pp-blue)'
  };
  const valueClass = type === 'success' ? 'is-success' : type === 'danger' ? 'is-danger' : type === 'warning' ? 'is-warning' : 'is-primary';
  return (
    <div className="pp-stat-card-enhanced" style={{ '--stat-accent': accentMap[type] } as React.CSSProperties}>
      <div className="pp-stat-icon" style={{ '--stat-icon-color': accentMap[type], '--stat-icon-bg': `${accentMap[type]}15` } as React.CSSProperties}>
        {icon}
      </div>
      <div className="pp-stat-label">{label}</div>
      <div className={`pp-stat-value ${valueClass}`}>₹{amount.toLocaleString()}</div>
      {count !== undefined && <div className="pp-stat-trend">{count} items</div>}
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
  const billsQuery      = useBills({ 
    page, 
    limit: pageSize, 
    regid: (!isNaN(parsedRegid) && regidFilter) ? parsedRegid : undefined, 
    date: date || undefined 
  });
  const collectionQuery = useDailyCollection(date);

  const total     = billsQuery.data?.total     ?? 0;
  const bills     = billsQuery.data?.data       ?? [];
  const hasMore   = bills.length === 30;

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
          <button className="btn-secondary" onClick={() => window.print()}>
            <Printer size={14} />
            Print Report
          </button>
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
      <div className="pp-stat-grid">
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

        <div className="pp-filter-controls">
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
      ) : bills.length === 0 ? (
        <div className="bill-card">
          <div className="bill-empty">
            <Receipt size={32} className="bill-empty-icon" />
            <p className="bill-empty-text">No billing records found for this date.</p>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        <BillingTable bills={bills} isLoading={false} />
      ) : (
        <div className="bill-card-grid">
          {bills.map((bill) => (
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
        totalPages={Math.ceil(total / pageSize)}
        pageSize={pageSize}
        totalItems={total}
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
