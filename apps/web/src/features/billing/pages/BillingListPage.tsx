import { useState } from 'react';
import { Receipt, Search, ChevronLeft, ChevronRight, FilePlus } from 'lucide-react';
import { useBills, useDailyCollection } from '../hooks/use-billing';
import { BillingTable } from '../components/BillingTable';
import { DailyCollectionCard } from '../components/DailyCollectionCard';
import { format } from 'date-fns';
import '../styles/billing.css';

export default function BillingListPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [page, setPage] = useState(1);
  const [regidFilter, setRegidFilter] = useState('');

  const billsQuery      = useBills({ page, limit: 30, regid: regidFilter ? parseInt(regidFilter, 10) : undefined, date: date || undefined });
  const collectionQuery = useDailyCollection(date);

  const total     = billsQuery.data?.total     ?? 0;
  const bills     = billsQuery.data?.data       ?? [];
  const hasMore   = bills.length === 30;

  return (
    <div className="bill-page fade-in">

      {/* ─── Header ─── */}
      <div className="bill-header">
        <div>
          <h1 className="bill-header-title">
            <Receipt size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
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
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
          />
          <button className="bill-btn bill-btn-primary" onClick={() => (window.location.href = '/billing/create')}>
            <FilePlus size={14} strokeWidth={1.6} />
            New Bill
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
        <div>
          <p className="bill-section-title">Invoice History</p>
          <p className="bill-section-sub">Showing {bills.length} of {total} records</p>
        </div>

        <div className="bill-search-wrap">
          <Search size={13} className="bill-search-icon" strokeWidth={2} />
          <input
            type="text"
            className="bill-filter-input bill-search-input"
            style={{ width: '180px', fontFamily: 'var(--font-mono)' }}
            placeholder="Search Reg ID…"
            value={regidFilter}
            onChange={(e) => { setRegidFilter(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <BillingTable bills={bills} isLoading={billsQuery.isLoading} />

      {/* ─── Pagination ─── */}
      <div className="bill-pagination">
        <span className="bill-page-info">Page {page} · {total} total</span>
        <button className="bill-btn bill-btn-sm bill-btn-icon" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <button className="bill-btn bill-btn-sm bill-btn-icon" disabled={!hasMore} onClick={() => setPage(p => p + 1)}>
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>

    </div>
  );
}
