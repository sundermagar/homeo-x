import { useState } from 'react';
import { Banknote, Search, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { usePaymentHistory, useRecordManualPayment } from '../hooks/use-payments';
import { PaymentTable } from '../components/PaymentTable';
import { PaymentModeEnum } from '@mmc/validation';
import '../styles/billing.css';

export default function PaymentsPage() {
  const [page, setPage]             = useState(1);
  const [regidFilter, setRegidFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const historyQuery = usePaymentHistory({
    page,
    limit: 50,
    regid: regidFilter ? parseInt(regidFilter, 10) : undefined,
  });

  const payments = historyQuery.data?.data ?? [];
  const hasMore  = payments.length === 50;

  return (
    <div className="bill-page fade-in">

      {/* ─── Header ─── */}
      <div className="bill-header">
        <div>
          <h1 className="bill-header-title">
            <Banknote size={20} strokeWidth={1.6} style={{ color: 'var(--pp-blue)' }} />
            Payment Ledger
          </h1>
          <p className="bill-header-sub">Transaction history and electronic payment processing records.</p>
        </div>
        <div className="bill-header-actions">
          <button className="bill-btn bill-btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={14} strokeWidth={1.6} />
            Manual Payment
          </button>
        </div>
      </div>

      {/* ─── Table Section ─── */}
      <div className="bill-section-header">
        <div>
          <p className="bill-section-title">Transaction History</p>
          <p className="bill-section-sub">Verified clinic income ledger</p>
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

      <PaymentTable payments={payments} isLoading={historyQuery.isLoading} />

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

/* ─── Manual Payment Modal ──────────────────────────────────────────────── */
function ManualPaymentModal({ onClose }: { onClose: () => void }) {
  const [regid,  setRegid]  = useState('');
  const [amount, setAmount] = useState(0);
  const [mode,   setMode]   = useState('Cash');
  const [notes,  setNotes]  = useState('');

  const recordManual = useRecordManualPayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await recordManual.mutateAsync({ regid: parseInt(regid), amount, paymentMode: mode as any, notes });
      onClose();
    } catch {
      alert('Failed to record payment');
    }
  };

  return (
    <div className="bill-modal-overlay fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bill-modal">
        <div className="bill-modal-header">
          <h2 className="bill-modal-title">Record Counter Payment</h2>
          <button className="bill-btn bill-btn-icon" onClick={onClose} style={{ border: 'none' }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bill-modal-body">
          <div className="bill-form-group">
            <label className="bill-form-label">Patient ID (Regid) <span style={{ color: 'var(--pp-danger-fg)' }}>*</span></label>
            <input type="number" required className="bill-form-input" style={{ fontFamily: 'var(--pp-font-mono)' }} value={regid} onChange={e => setRegid(e.target.value)} placeholder="e.g. 1042" />
          </div>

          <div className="bill-form-group">
            <label className="bill-form-label">Amount (₹) <span style={{ color: 'var(--pp-danger-fg)' }}>*</span></label>
            <input type="number" required className="bill-form-input" style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '1.2rem', fontWeight: 700 }} value={amount} onChange={e => setAmount(parseFloat(e.target.value))} />
          </div>

          <div className="bill-form-group">
            <label className="bill-form-label">Payment Mode</label>
            <select className="bill-form-select" value={mode} onChange={e => setMode(e.target.value)}>
              {PaymentModeEnum.options.filter(o => o !== 'Online').map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="bill-form-group">
            <label className="bill-form-label">Notes</label>
            <textarea className="bill-form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional note…" />
          </div>
        </form>

        <div className="bill-modal-footer">
          <button type="button" className="bill-btn" onClick={onClose}>Cancel</button>
          <button
            type="submit"
            form="manual-payment-form"
            className="bill-btn bill-btn-primary"
            disabled={recordManual.isPending}
            onClick={handleSubmit as any}
          >
            {recordManual.isPending ? 'Saving…' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
