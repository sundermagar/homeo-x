import { useState } from 'react';
import { Receipt, Search, ChevronLeft, ChevronRight, FilePlus, Grid, List } from 'lucide-react';
import { useBills, useDailyCollection } from '../hooks/use-billing';
import { BillingTable } from '../components/BillingTable';
import { DailyCollectionCard } from '../components/DailyCollectionCard';
import { format } from 'date-fns';
import '../styles/billing.css';

export default function BillingListPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [page, setPage] = useState(1);
  const [regidFilter, setRegidFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const parsedRegid = parseInt(regidFilter, 10);
  const billsQuery      = useBills({ 
    page, 
    limit: 30, 
    regid: (!isNaN(parsedRegid) && regidFilter) ? parsedRegid : undefined, 
    date: date || undefined 
  });
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 999, overflow: 'hidden', background: 'white' }}>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: 'none', background: viewMode === 'list' ? 'var(--primary-tint)' : 'transparent', color: viewMode === 'list' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
            >
              <List size={14} /> List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: 'none', background: viewMode === 'grid' ? 'var(--primary-tint)' : 'transparent', color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}
            >
              <Grid size={14} /> Grid
            </button>
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
      </div>

      {viewMode === 'list' ? (
        <BillingTable bills={bills} isLoading={billsQuery.isLoading} />
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {bills.map((bill) => (
            <div key={bill.id} className="bill-card" style={{ padding: '18px', gap: '12px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>Bill #{bill.billNo}</div>
                  <div className="text-small" style={{ color: 'var(--text-muted)' }}>{bill.billDate ? format(new Date(bill.billDate), 'dd-MM-yyyy') : 'No date'}</div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
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
              <button className="bill-btn bill-btn-primary" style={{ width: '100%' }}>View Details</button>
            </div>
          ))}
        </div>
      )}

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
