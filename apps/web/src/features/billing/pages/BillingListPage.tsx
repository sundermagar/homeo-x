import { useState } from 'react';
import { Receipt, Search, ChevronLeft, ChevronRight, FilePlus, Grid, List, Printer } from 'lucide-react';
import { useBills, useDailyCollection } from '../hooks/use-billing';
import { BillingTable } from '../components/BillingTable';
import { DailyCollectionCard } from '../components/DailyCollectionCard';
import { PrintOptionsModal } from '../components/PrintOptionsModal';
import { useOrganizations } from '../../platform/hooks/use-organizations';
import { useAuthStore } from '../../../shared/stores/auth-store';
import { printBill } from '../../../shared/utils/print';
import { format } from 'date-fns';
import type { BillWithPatient } from '@mmc/types';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
import '../../platform/styles/platform.css';
import '../styles/billing.css';

export default function BillingListPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [page, setPage] = useState(1);
  const [regidFilter, setRegidFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedBill, setSelectedBill] = useState<BillWithPatient | null>(null);

  const { data: orgs = [] } = useOrganizations();
  const user = useAuthStore(s => s.user);
  const myOrg = orgs.find(o => o.id === user?.contextId) || orgs[0];

  const parsedRegid = parseInt(regidFilter, 10);
  const billsQuery = useBills({
    page,
    limit: 30,
    regid: (!isNaN(parsedRegid) && regidFilter) ? parsedRegid : undefined,
    date: date || undefined
  });
  const collectionQuery = useDailyCollection(date);

  const total = billsQuery.data?.total ?? 0;
  const bills = billsQuery.data?.data ?? [];
  const hasMore = bills.length === 30;

  const handlePrint = (template: 'standard' | 'pharmacy' | 'package' | 'comprehensive') => {
    if (!selectedBill || !myOrg) return;
    printBill(selectedBill, myOrg, { template });
    setSelectedBill(null);
  };

  return (
    <div className="bill-page fade-in">

      {/* ─── Header ─── */}
      <PageHeader
        icon={Receipt}
        title="Billing & Finance"
        description="Manage clinic invoices, daily collections, and patient accounts."
        actions={
          <div className="bill-header-actions">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pp-input" style={{ width: 'auto', height: '36px' }}
            />
            <button className="btn-primary" onClick={() => (window.location.href = '/billing/create')}>
              <FilePlus size={14} strokeWidth={1.6} />
              New Bill
            </button>
            <button className="btn-secondary" onClick={() => (window.location.href = '/billing/custom')}>
              <FilePlus size={14} strokeWidth={1.6} />
              Custom Bill
            </button>
          </div>
        }
      />

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="appt-segmented-toggle">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`appt-segmented-btn ${viewMode === 'list' ? 'active' : ''}`}
            >
              <List size={16} /> List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`appt-segmented-btn ${viewMode === 'grid' ? 'active' : ''}`}
            >
              <Grid size={16} /> Grid
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

      {viewMode === 'list' ? (
        <BillingTable
          bills={bills}
          isLoading={billsQuery.isLoading}
          onPrint={(bill) => setSelectedBill(bill)}
        />
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
              <div className="bill-grid-card-footer" style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="bill-btn"
                  style={{
                    flex: 1,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onClick={() => setSelectedBill(bill)}
                >
                  <Printer size={14} /> Print
                </button>
                <button
                  className="bill-btn bill-btn-primary"
                  style={{ flex: 1.5 }}
                  onClick={() => window.location.href = `/patients/${bill.regid}`}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Pagination ─── */}
      {total > 0 && (
        <Pagination
          currentPage={page}
          totalPages={Math.max(1, Math.ceil(total / 30))}
          pageSize={30}
          totalItems={total}
          onPageChange={setPage}
          onPageSizeChange={() => {}}
        />
      )}

      {selectedBill && (
        <PrintOptionsModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
          onPrint={handlePrint}
        />
      )}
    </div>
  );
}
