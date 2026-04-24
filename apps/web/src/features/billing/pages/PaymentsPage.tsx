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
    limit: 50,
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
    <div className="bill-page fade-in">

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
        <div className="bill-stat-card" data-type="default">
          <div className="bill-stat-icon" style={{ background: 'var(--pp-blue-tint)', color: 'var(--pp-blue)' }}>
            <TrendingUp size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="bill-stat-label" style={{ margin: '0 0 6px' }}>Total Collected</p>
            <p style={{ margin: 0, lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.75, marginRight: 1 }}>₹</span>
              <span className="bill-stat-value">{totalCollected.toLocaleString('en-IN')}</span>
            </p>
          </div>
        </div>

        <div className="bill-stat-card" data-type="default">
          <div className="bill-stat-icon" style={{ background: 'var(--pp-blue-tint)', color: 'var(--pp-blue)' }}>
            <Clock size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="bill-stat-label" style={{ margin: '0 0 6px' }}>Pending Amount</p>
            <p style={{ margin: 0, lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: 2, color: 'var(--pp-blue)' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.75, marginRight: 1 }}>₹</span>
              <span className="bill-stat-value">{totalPending.toLocaleString('en-IN')}</span>
            </p>
          </div>
        </div>

        <div className="bill-stat-card" data-type="default">
          <div className="bill-stat-icon" style={{ background: 'var(--pp-blue-tint)', color: 'var(--pp-blue)' }}>
            <CheckCircle2 size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="bill-stat-label" style={{ margin: '0 0 6px' }}>Avg Ticket Size</p>
            <p style={{ margin: 0, lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: 2, color: 'var(--pp-blue)' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.75, marginRight: 1 }}>₹</span>
              <span className="bill-stat-value">{avgTicket.toLocaleString('en-IN')}</span>
            </p>
          </div>
        </div>

        <div className="bill-stat-card" data-type="default">
          <div className="bill-stat-icon" style={{ background: 'var(--pp-blue-tint)', color: 'var(--pp-blue)' }}>
            <Wallet size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="bill-stat-label" style={{ margin: '0 0 6px' }}>Counter / Manual</p>
            <p style={{ margin: 0, lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: 2, color: 'var(--pp-blue)' }}>
              <span className="bill-stat-value">{manualCount}</span>
            </p>
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

      {/* ─── Table ─── */}
      {historyQuery.isLoading ? (
        <div className="bill-card">
          <div className="bill-empty">
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
            <p className="bill-empty-text" style={{ marginTop: 12 }}>Loading transactions…</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bill-card">
          <div className="bill-empty">
            <Banknote size={36} className="bill-empty-icon" />
            <p className="bill-empty-text">No payment records found.</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--pp-text-3)', marginTop: 4 }}>
              {regidFilter ? 'Try a different Reg ID.' : 'Record a manual counter payment to get started.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="bill-card fade-in">
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
                    {/* ID */}
                    <td data-label="#" style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.75rem', color: 'var(--pp-text-3)' }}>
                      #{payment.id}
                    </td>

                    {/* Date */}
                    <td data-label="Date">
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
                    </td>

                    {/* Patient */}
                    <td data-label="Patient">
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--pp-ink)' }}>
                        {payment.patientName || '—'}
                      </div>
                      {payment.regid && (
                        <div style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.7rem', color: 'var(--pp-text-3)', marginTop: 1 }}>
                          REG #{payment.regid}
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td data-label="Amount">
                      <div style={{
                        fontFamily: 'var(--pp-font-mono)',
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: 'var(--pp-blue)',
                        letterSpacing: '-0.01em',
                      }}>
                        ₹{payment.amount.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--pp-text-3)', marginTop: 1 }}>
                        {payment.currency}
                      </div>
                    </td>

                    {/* Mode */}
                    <td data-label="Mode">
                      <span className={`bill-badge ${MODE_CLASS[payment.paymentMode] ?? 'bill-badge-default'}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {MODE_ICON[payment.paymentMode]}
                        {payment.paymentMode}
                      </span>
                    </td>

                    {/* Reference */}
                    <td data-label="Reference" style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.7rem', color: 'var(--pp-text-3)', lineHeight: 1.5 }}>
                      {payment.orderId   && <div title={payment.orderId}>ORD: {payment.orderId.slice(-8)}</div>}
                      {payment.paymentId && <div title={payment.paymentId}>PAY: {payment.paymentId.slice(-8)}</div>}
                      {!payment.orderId && !payment.paymentId && (
                        <span className="bill-badge bill-badge-default" style={{ fontSize: '0.6rem' }}>COUNTER</span>
                      )}
                    </td>

                    {/* Status */}
                    <td data-label="Status">
                      <span className={`bill-badge ${STATUS_CLASS[payment.status] ?? 'bill-badge-default'}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {payment.status === 'Success' || payment.status === 'Completed'
                          ? <CheckCircle2 size={10} />
                          : payment.status === 'Failed'
                          ? <AlertTriangle size={10} />
                          : <Clock size={10} />}
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Pagination ─── */}
      <div className="bill-pagination">
        <span className="bill-page-info">Page {page}</span>
        <button className="bill-btn bill-btn-sm bill-btn-icon" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
          <ChevronLeft size={14} strokeWidth={2} />
        </button>
        <button className="bill-btn bill-btn-sm bill-btn-icon" disabled={!hasMore} onClick={() => setPage(p => p + 1)}>
          <ChevronRight size={14} strokeWidth={2} />
        </button>
      </div>

      {/* ─── Manual Payment Modal ─── */}
      {isModalOpen && <ManualPaymentModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}

/* ─── Manual Payment Modal ──────────────────────────────────────────────────── */
function ManualPaymentModal({ onClose }: { onClose: () => void }) {
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
    <div className="bill-modal-overlay fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bill-modal" style={{ maxWidth: 460 }}>

        {/* Header */}
        <div className="bill-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--pp-blue-tint)', color: 'var(--pp-blue)',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <IndianRupee size={17} strokeWidth={2} />
            </div>
            <div>
              <h2 className="bill-modal-title">Record Counter Payment</h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--pp-text-3)', margin: 0, marginTop: 1 }}>
                Manual / cash counter receipt
              </p>
            </div>
          </div>
          <button className="bill-btn bill-btn-icon" onClick={onClose} style={{ border: 'none' }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="bill-modal-body">
          {error && (
            <div style={{
              background: 'var(--pp-danger-bg)', color: 'var(--pp-danger-fg)',
              border: '1px solid var(--pp-danger-border)', borderRadius: 8,
              padding: '10px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {/* Patient ID */}
          <div className="bill-form-group">
            <label className="bill-form-label">
              Patient Reg ID <span className="bill-form-required">*</span>
            </label>
            <input
              id="modal-regid"
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

          {/* Amount */}
          <div className="bill-form-group">
            <label className="bill-form-label">
              Amount (₹) <span className="bill-form-required">*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--pp-text-3)', fontWeight: 700, fontSize: '1rem', pointerEvents: 'none',
              }}>₹</span>
              <input
                id="modal-amount"
                type="number"
                required
                min={1}
                step="0.01"
                className="bill-form-input"
                style={{ paddingLeft: 30, fontFamily: 'var(--pp-font-mono)', fontSize: '1.15rem', fontWeight: 700 }}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Payment Mode */}
          <div className="bill-form-group">
            <label className="bill-form-label">Payment Mode</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PaymentModeEnum.options.filter(o => o !== 'Online').map(o => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setMode(o)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700,
                    cursor: 'pointer', border: '1.5px solid',
                    transition: 'all 0.15s ease',
                    background: mode === o ? 'var(--pp-blue)' : 'var(--bg-card)',
                    color:      mode === o ? '#fff' : 'var(--pp-text-2)',
                    borderColor: mode === o ? 'var(--pp-blue)' : 'var(--border-main)',
                    boxShadow: mode === o ? '0 4px 12px rgba(37,99,235,0.2)' : 'none',
                  }}
                >
                  {MODE_ICON[o]}
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bill-form-group">
            <label className="bill-form-label">Notes <span style={{ opacity: 0.5, fontWeight: 500, textTransform: 'none' }}>(optional)</span></label>
            <textarea
              className="bill-form-textarea"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Advance payment for next visit…"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="bill-modal-footer">
          <button type="button" className="bill-btn" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="bill-btn bill-btn-primary"
            disabled={recordManual.isPending || !regid || !amount}
            onClick={handleSubmit as any}
            style={{ minWidth: 140 }}
          >
            {recordManual.isPending
              ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
              : <><CheckCircle2 size={14} /> Confirm Payment</>}
          </button>
        </div>
      </div>
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
