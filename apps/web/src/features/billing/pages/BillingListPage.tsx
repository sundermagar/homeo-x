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
  return (
    <div className="bill-stat-card" data-type={type}>
      <div className="bill-stat-icon">
        {icon}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <p className="bill-stat-label">{label}</p>
          {count !== undefined && <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.5 }}>{count} items</span>}
        </div>
        <div className="bill-stat-value">₹{amount.toLocaleString()}</div>
      </div>
    </div>
  );
}

export default function BillingListPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [page, setPage] = useState(1);
  const [regidFilter, setRegidFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isNewBillOpen, setIsNewBillOpen] = useState(false);
  const [isCustomBillOpen, setIsCustomBillOpen] = useState(false);

  const parsedRegid = parseInt(regidFilter, 10);
  const billsQuery      = useBills({ 
    page, 
    limit: 10, 
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
      <div className="bill-header">
        <div>
          <h1 className="bill-header-title">
            <Receipt size={20} strokeWidth={1.6} style={{ color: 'var(--pp-blue)' }} />
            Billing &amp; Finance
          </h1>
          <p className="bill-header-sub">Manage clinic invoices, daily collections, and patient accounts.</p>
        </div>
        <div className="bill-header-actions">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bill-filter-input"
          />
          <button className="bill-btn bill-btn-default" onClick={() => window.print()}>
            <Printer size={14} />
            Print Report
          </button>
          <button className="bill-btn bill-btn-primary" onClick={() => setIsNewBillOpen(true)}>
            <FilePlus size={14} strokeWidth={1.6} />
            New Bill
          </button>
          <button className="bill-btn bill-btn-default" onClick={() => setIsCustomBillOpen(true)}>
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
      <div className="bill-section-header">
        <div />

        <div className="bill-section-filters">
          <div className="bill-view-toggle-group">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`bill-view-toggle-btn${viewMode === 'list' ? ' is-active' : ''}`}
            >
              <List size={14} /> List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`bill-view-toggle-btn${viewMode === 'grid' ? ' is-active' : ''}`}
            >
              <Grid size={14} /> Grid
            </button>
          </div>
          <div className="bill-search-wrap">
            <Search size={13} className="bill-search-icon" strokeWidth={2} />
            <input
              type="text"
              className="bill-filter-input bill-search-input"
              style={{ width: '180px', fontFamily: 'var(--pp-font-mono)' }}
              placeholder="Search Reg ID…"
              value={regidFilter}
              onChange={(e) => { setRegidFilter(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      {billsQuery.isLoading ? (
        <TableSkeleton rows={8} columns={8} />
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
        totalPages={Math.ceil(total / 10)}
        pageSize={10}
        totalItems={total}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={() => {}}
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
        @media (max-width: 1024px) {
          .bill-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
          .bill-header-actions { grid-template-columns: 1fr !important; gap: 8px !important; display: grid !important; }
          .bill-header-actions .bill-btn { height: 44px; justify-content: center; border-radius: 12px; }
          .bill-filter-input { width: 100% !important; height: 44px; border-radius: 12px; }

          .bill-stats-bar { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .bill-stat-card { padding: 12px !important; }
          .bill-stat-value { font-size: 18px !important; }

          .bill-section-header { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; display: flex !important; }
          .bill-section-filters { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; width: 100%; display: flex !important; }
          .bill-view-toggle-group { width: 100%; display: flex; }
          .bill-view-toggle-btn { flex: 1; justify-content: center; height: 40px; }
          .bill-search-wrap { width: 100% !important; }
          .bill-search-input { width: 100% !important; }

          .bill-card { border: none !important; box-shadow: none !important; background: transparent !important; }
          .bill-table-container { border: none !important; background: transparent !important; overflow: visible !important; }
          .bill-table { display: block !important; width: 100% !important; min-width: 0 !important; }
          .bill-table thead { display: none !important; }
          .bill-table tbody { display: block !important; width: 100% !important; }
          .bill-table tr { 
            display: block !important; 
            margin-bottom: 20px !important; 
            background: var(--bg-card) !important; 
            border: 1px solid var(--border-main) !important; 
            border-radius: 16px !important; 
            padding: 8px 0 !important;
            box-shadow: var(--pp-shadow-sm) !important;
          }
          .bill-table td {
            display: grid !important;
            grid-template-columns: 100px 1fr !important;
            gap: 12px !important;
            align-items: center !important;
            padding: 12px 20px !important;
            border-bottom: 1px dashed var(--border-main) !important;
            min-height: 48px;
            text-align: right !important;
            width: 100% !important;
          }
          .bill-table td:last-child { border-bottom: none !important; background: var(--bg-surface-2) !important; margin-top: 4px; }
          
          .bill-table td::before {
            content: attr(data-label);
            font-size: 10px !important;
            font-weight: 800 !important;
            color: var(--text-muted) !important;
            text-transform: uppercase !important;
            letter-spacing: 0.08em !important;
            text-align: left !important;
          }
          .plat-cell-val { width: 100% !important; text-align: right !important; display: flex !important; flex-direction: column !important; align-items: flex-end !important; }
        }
      `}</style>
    </div>
  );
}

