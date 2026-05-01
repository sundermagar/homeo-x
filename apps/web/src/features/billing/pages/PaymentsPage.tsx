import { useState, useMemo } from 'react';
import {
  Banknote, Search, ChevronLeft, ChevronRight, Plus, X,
  TrendingUp, CreditCard, RefreshCw, Wallet, CheckCircle2,
  Clock, AlertTriangle, IndianRupee,
} from 'lucide-react';
import { usePaymentHistory, useRecordManualPayment } from '../hooks/use-payments';
import { usePatient } from '../../patients/hooks/use-patients';
import { PaymentModeEnum } from '@mmc/validation';
import type { PaymentWithPatient } from '@mmc/types';
import { Pagination } from '@/shared/components/Pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { Drawer } from '@/shared/components/drawer';
import { format } from 'date-fns';
import '../styles/billing.css';

/* ─── Payment mode display helpers ─────────────────────────────────────────── */
const MODE_ICON: Record<string, React.ReactNode> = {
  Cash:          <IndianRupee size={11} strokeWidth={2.5} />,
  Card:          <CreditCard  size={11} strokeWidth={2.5} />,
  UPI:           <Wallet      size={11} strokeWidth={2.5} />,
  Cheque:        <Banknote    size={11} strokeWidth={2.5} />,
  Online:        <TrendingUp  size={11} strokeWidth={2.5} />,
  'Bank Transfer': <Banknote  size={11} strokeWidth={2.5} />,
};

const MODE_CLASS: Record<string, string> = {
  Cash:          'bill-badge-success',
  Card:          'bill-badge-primary',
  UPI:           'bill-badge-info',
  Cheque:        'bill-badge-warning',
  Online:        'bill-badge-primary',
  'Bank Transfer': 'bill-badge-staff',
};

const STATUS_CLASS: Record<string, string> = {
  Success:   'bill-badge-success',
  Completed: 'bill-badge-success',
  Pending:   'bill-badge-warning',
  Failed:    'bill-badge-danger',
};

/* ─── Main Page ─────────────────────────────────────────────────────────────── */
export default function PaymentsPage() {
  const [page, setPage]               = useState(1);
  const [regidFilter, setRegidFilter] = useState('');
  const [fromDate, setFromDate]       = useState('');
  const [toDate, setToDate]           = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const historyQuery = usePaymentHistory({
    page,
    limit: 10,
    regid: regidFilter ? parseInt(regidFilter, 10) : undefined,
  });

  const payments: PaymentWithPatient[] = historyQuery.data?.data ?? [];
  const hasMore = payments.length === 50;

  /* Client-side date filter (server only supports regid right now) */
  const filtered = useMemo(() => {
    if (!fromDate && !toDate) return payments;
    return payments.filter(p => {
      const d = p.paymentDate ? new Date(p.paymentDate) : new Date(p.createdAt);
      if (fromDate && d < new Date(fromDate)) return false;
      if (toDate   && d > new Date(toDate + 'T23:59:59')) return false;
      return true;
    });
  }, [payments, fromDate, toDate]);

  /* KPI calculations */
  const totalCollected  = filtered.reduce((s, p) => p.status === 'Success' || p.status === 'Completed' ? s + p.amount : s, 0);
  const totalPending    = filtered.reduce((s, p) => p.status === 'Pending'  ? s + p.amount : s, 0);
  const avgTicket       = filtered.length ? Math.round(totalCollected / filtered.filter(p => p.status === 'Success' || p.status === 'Completed').length || 0) : 0;
  const manualCount     = filtered.filter(p => !p.orderId && !p.paymentId).length;

  return (
    <div className="pp-page-container bill-page animate-fade-in">

      {/* ─── Header ─── */}
      <div className="bill-header">
        <div>
          <h1 className="bill-header-title">
            <Banknote size={20} strokeWidth={1.6} style={{ color: 'var(--pp-blue)' }} />
            Payment Ledger
          </h1>
          <p className="bill-header-sub">Transaction history, counter receipts and payment mode breakdown.</p>
        </div>
        <div className="bill-header-actions">
          <button className="bill-btn bill-btn-primary" id="btn-record-payment" onClick={() => setIsModalOpen(true)}>
            <Plus size={14} strokeWidth={2} />
            Record Payment
          </button>
        </div>
      </div>

      {/* ─── KPI Stats ─── */}
      <div className="bill-stats-bar">
        <div className="bill-stat-card">
          <div className="bill-stat-icon" style={{ background: 'var(--pp-blue-tint)', color: 'var(--pp-blue)' }}>
            <TrendingUp size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="bill-stat-label">Total Collected</p>
            <div className="bill-stat-value">₹{totalCollected.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="bill-stat-card">
          <div className="bill-stat-icon" style={{ background: 'var(--pp-blue-tint)', color: 'var(--pp-blue)' }}>
            <Clock size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="bill-stat-label">Pending Amount</p>
            <div className="bill-stat-value">₹{totalPending.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="bill-stat-card">
          <div className="bill-stat-icon" style={{ background: 'var(--pp-blue-tint)', color: 'var(--pp-blue)' }}>
            <CheckCircle2 size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="bill-stat-label">Avg Ticket Size</p>
            <div className="bill-stat-value">₹{avgTicket.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="bill-stat-card">
          <div className="bill-stat-icon" style={{ background: 'var(--pp-blue-tint)', color: 'var(--pp-blue)' }}>
            <Wallet size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="bill-stat-label">Counter / Manual</p>
            <div className="bill-stat-value">{manualCount}</div>
          </div>
        </div>
      </div>

      {/* ─── Filters ─── */}
      <div className="bill-filters" style={{ marginBottom: 'var(--pp-space-4)' }}>
        <div className="bill-search-wrap">
          <Search size={13} className="bill-search-icon" strokeWidth={2} />
          <input
            id="payment-search-regid"
            type="text"
            className="bill-filter-input bill-search-input"
            style={{ width: '190px', fontFamily: 'var(--pp-font-mono)' }}
            placeholder="Search Reg ID…"
            value={regidFilter}
            onChange={(e) => { setRegidFilter(e.target.value); setPage(1); }}
          />
        </div>
        <input
          type="date"
          className="bill-filter-input"
          style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.8rem' }}
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          title="From date"
        />
        <input
          type="date"
          className="bill-filter-input"
          style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.8rem' }}
          value={toDate}
          onChange={e => setToDate(e.target.value)}
          title="To date"
        />
        {(fromDate || toDate || regidFilter) && (
          <button
            className="bill-btn bill-btn-sm"
            onClick={() => { setFromDate(''); setToDate(''); setRegidFilter(''); setPage(1); }}
            title="Clear filters"
          >
            <X size={12} strokeWidth={2.5} /> Clear
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--pp-text-3)', fontFamily: 'var(--pp-font-mono)' }}>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {historyQuery.isLoading ? (
        <TableSkeleton rows={10} columns={7} />
      ) : filtered.length === 0 ? (
        <div className="bill-card" style={{ boxShadow: 'var(--pp-premium-shadow)' }}>
          <div className="bill-empty">
            <Banknote size={36} className="bill-empty-icon" />
            <p className="bill-empty-text">No payment records found.</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--pp-text-3)', marginTop: 4 }}>
              {regidFilter ? 'Try a different Reg ID.' : 'Record a manual counter payment to get started.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bill-card fade-in" style={{ boxShadow: 'var(--pp-premium-shadow)' }}>
          <div className="bill-table-container">
            <table className="bill-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th style={{ width: 130 }}>Date & Time</th>
                  <th>Patient</th>
                  <th style={{ width: 130 }}>Amount</th>
                  <th style={{ width: 110 }}>Mode</th>
                  <th style={{ width: 100 }}>Reference</th>
                  <th style={{ width: 90 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((payment) => (
                  <tr key={payment.id}>
                    <td data-label="#" style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.75rem', color: 'var(--pp-text-3)' }}>
                      <div>#{payment.id}</div>
                    </td>

                    <td data-label="Date">
                      <div className="plat-cell-val">
                        <div style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.8rem', fontWeight: 600, color: 'var(--pp-ink)' }}>
                          {payment.paymentDate
                            ? format(new Date(payment.paymentDate), 'dd MMM yyyy')
                            : format(new Date(payment.createdAt), 'dd MMM yyyy')}
                        </div>
                        <div style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.7rem', color: 'var(--pp-text-3)', marginTop: 1 }}>
                          {payment.paymentDate
                            ? format(new Date(payment.paymentDate), 'hh:mm a')
                            : format(new Date(payment.createdAt), 'hh:mm a')}
                        </div>
                      </div>
                    </td>

                    <td data-label="Patient">
                      <div className="plat-cell-val">
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--pp-ink)' }}>
                          {payment.patientName || '—'}
                        </div>
                        {payment.regid && (
                          <div style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.7rem', color: 'var(--pp-text-3)', marginTop: 1 }}>
                            REG #{payment.regid}
                          </div>
                        )}
                      </div>
                    </td>

                    <td data-label="Amount">
                      <div className="plat-cell-val">
                        <div style={{
                          fontFamily: 'var(--pp-font-mono)',
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: 'var(--pp-blue)',
                          letterSpacing: '-0.01em',
                        }}>
                          ₹{payment.amount.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </td>

                    <td data-label="Mode">
                      <div className="plat-cell-val">
                        <span className={`bill-badge ${MODE_CLASS[payment.paymentMode] ?? 'bill-badge-default'}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {MODE_ICON[payment.paymentMode]}
                          {payment.paymentMode}
                        </span>
                      </div>
                    </td>

                    <td data-label="Reference">
                      <div className="plat-cell-val">
                        <div style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.7rem', color: 'var(--pp-text-3)', lineHeight: 1.5, textAlign: 'right' }}>
                          {payment.orderId   && <div title={payment.orderId}>ORD: {payment.orderId.slice(-8)}</div>}
                          {payment.paymentId && <div title={payment.paymentId}>PAY: {payment.paymentId.slice(-8)}</div>}
                          {!payment.orderId && !payment.paymentId && (
                            <span className="bill-badge bill-badge-default" style={{ fontSize: '0.6rem' }}>COUNTER</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td data-label="Status">
                      <div className="plat-cell-val">
                        <span className={`bill-badge ${STATUS_CLASS[payment.status] ?? 'bill-badge-default'}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {payment.status === 'Success' || payment.status === 'Completed'
                            ? <CheckCircle2 size={10} />
                            : payment.status === 'Failed'
                            ? <AlertTriangle size={10} />
                            : <Clock size={10} />}
                          {payment.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        totalItems={historyQuery.data?.pagination?.total ?? 0}
        itemsPerPage={10}
        currentPage={page}
        onPageChange={(p) => setPage(p)}
        onLimitChange={() => {}}
      />

      <Drawer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Counter Payment"
        maxWidth="460px"
      >
        <ManualPaymentDrawerContent onClose={() => setIsModalOpen(false)} />
      </Drawer>

      <style>{`
        @media (max-width: 1024px) {
          .bill-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
          .bill-header-actions { width: 100%; }
          .bill-header-actions .bill-btn { width: 100%; height: 44px; border-radius: 12px; justify-content: center; }

          .bill-stats-bar { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .bill-stat-card { padding: 12px !important; }
          .bill-stat-value { font-size: 18px !important; }

          .bill-filters { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
          .bill-search-wrap { width: 100% !important; }
          .bill-search-input { width: 100% !important; height: 44px; border-radius: 12px; }
          .bill-filter-input { width: 100% !important; height: 44px; border-radius: 12px; }

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
            grid-template-columns: 120px 1fr !important;
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
          [data-label="#"] { background: var(--bg-surface-2) !important; border-bottom: 1px solid var(--border-main) !important; margin-bottom: 4px; }
        }
      `}</style>
    </div>
  );
}

/* ─── Manual Payment Drawer Content ────────────────────────────────────────── */
function ManualPaymentDrawerContent({ onClose }: { onClose: () => void }) {
  const [regid,  setRegid]  = useState('');
  const [amount, setAmount] = useState('');
  const [mode,   setMode]   = useState('Cash');
  const [notes,  setNotes]  = useState('');
  const [error,  setError]  = useState('');

  const recordManual = useRecordManualPayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!regid || !amount) { setError('Patient ID and amount are required.'); return; }
    try {
      await recordManual.mutateAsync({
        regid:       parseInt(regid),
        amount:      parseFloat(amount),
        paymentMode: mode as any,
        notes,
      });
      onClose();
    } catch {
      setError('Failed to record payment. Please try again.');
    }
  };

  return (
    <div className="bill-form">
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--pp-text-3)', margin: 0 }}>
          Use this to record manual receipts, cash payments, or counter transactions.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            background: 'var(--pp-danger-bg)', color: 'var(--pp-danger-fg)',
            border: '1px solid var(--pp-danger-border)', borderRadius: 12,
            padding: '12px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 20
          }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <div className="bill-form-group">
          <label className="bill-form-label">Patient Reg ID <span className="bill-form-required">*</span></label>
          <input
            type="number"
            required
            className="bill-form-input"
            style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '1rem' }}
            value={regid}
            onChange={e => setRegid(e.target.value)}
            placeholder="e.g. 1042"
            autoFocus
          />
          <PatientPreview regid={regid ? parseInt(regid) : 0} />
        </div>

        <div className="bill-form-group" style={{ marginTop: 20 }}>
          <label className="bill-form-label">Amount (₹) <span className="bill-form-required">*</span></label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--pp-text-3)', fontWeight: 700, fontSize: '1.1rem', pointerEvents: 'none',
            }}>₹</span>
            <input
              type="number"
              required
              min={1}
              step="0.01"
              className="bill-form-input"
              style={{ paddingLeft: 30, fontFamily: 'var(--pp-font-mono)', fontSize: '1.25rem', fontWeight: 850 }}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="bill-form-group" style={{ marginTop: 20 }}>
          <label className="bill-form-label">Payment Mode</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
            {PaymentModeEnum.options.filter(o => o !== 'Online').map(o => (
              <button
                key={o}
                type="button"
                onClick={() => setMode(o)}
                className={`bill-view-toggle-btn ${mode === o ? 'is-active' : ''}`}
                style={{
                  justifyContent: 'center', height: 40, borderRadius: 12, border: '1px solid var(--pp-warm-4)'
                }}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        <div className="bill-form-group" style={{ marginTop: 20 }}>
          <label className="bill-form-label">Notes</label>
          <textarea
            className="bill-form-textarea"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add any internal remarks..."
            style={{ borderRadius: 12 }}
          />
        </div>

        <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
          <button type="button" className="bill-btn" style={{ flex: 1, height: 48, borderRadius: 14 }} onClick={onClose}>Cancel</button>
          <button
            type="submit"
            className="bill-btn bill-btn-primary"
            disabled={recordManual.isPending || !regid || !amount}
            style={{ flex: 2, height: 48, borderRadius: 14 }}
          >
            {recordManual.isPending ? 'Saving...' : 'Confirm Payment'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Patient Preview Chip ───────────────────────────────────────────────────── */
function PatientPreview({ regid }: { regid?: number }) {
  const { data: patient, isLoading, isError } = usePatient(regid ?? 0);

  if (!regid) return null;
  if (isLoading) return (
    <div style={{ fontSize: '0.75rem', color: 'var(--pp-text-3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
      <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> Verifying patient…
    </div>
  );
  if (isError || !patient) return (
    <div style={{ fontSize: '0.75rem', color: 'var(--pp-danger-fg)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--pp-danger-bg)', padding: '4px 10px', borderRadius: 6, width: 'fit-content' }}>
      <AlertTriangle size={11} /> Patient not found
    </div>
  );

  return (
    <div style={{
      fontSize: '0.78rem',
      color: 'var(--pp-success-fg)',
      marginTop: 6,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      background: 'var(--pp-success-bg)',
      padding: '6px 12px',
      borderRadius: 8,
      width: 'fit-content',
      border: '1px solid rgba(34,197,94,0.15)',
    }}>
      <CheckCircle2 size={13} />
      <span>
        <strong style={{ fontSize: '0.85rem' }}>{patient.firstName} {patient.surname}</strong>
        <span style={{ marginLeft: 8, opacity: 0.7, fontFamily: 'var(--pp-font-mono)', fontSize: '0.72rem' }}>
          REG #{patient.regid ?? regid}
        </span>
      </span>
    </div>
  );
}
