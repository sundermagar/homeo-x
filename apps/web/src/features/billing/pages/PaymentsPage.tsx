import { useState } from 'react';
import { Banknote, Search, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { usePaymentHistory, useRecordManualPayment } from '../hooks/use-payments';
import { usePatient } from '../../patients/hooks/use-patients';
import { PaymentTable } from '../components/PaymentTable';
import { PaymentModeEnum } from '@mmc/validation';
import { PageHeader } from '@/components/shared/page-header';
import { Pagination } from '@/components/shared/pagination';
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
      <PageHeader
        icon={Banknote}
        title="Payment Ledger"
        description="Transaction history and electronic payment processing records."
        actions={
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={14} strokeWidth={1.6} />
            Manual Payment
          </button>
        }
      />

      {/* ─── Table Section ─── */}
      <div className="bill-section-header">
        <div />

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
      <Pagination
        currentPage={page}
        totalPages={hasMore ? page + 1 : page}
        pageSize={50}
        totalItems={hasMore ? (page * 50) + 1 : page * payments.length}
        onPageChange={setPage}
        onPageSizeChange={() => {}}
      />

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
            <PatientPreview regid={regid ? parseInt(regid) : 0} />
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
function PatientPreview({ regid }: { regid?: number }) {
  const { data: patient, isLoading, isError } = usePatient(regid ?? 0);

  if (!regid) return null;
  if (isLoading) return <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>Checking ID...</div>;
  if (isError || !patient) return <div style={{ fontSize: '11px', color: 'var(--pp-danger-fg)', marginTop: 4 }}>Patient not found</div>;

  return (
    <div style={{ 
      fontSize: '11px', 
      color: 'var(--pp-success-fg)', 
      marginTop: 6, 
      display: 'flex', 
      alignItems: 'center', 
      gap: 4,
      background: 'var(--pp-success-bg)',
      padding: '4px 8px',
      borderRadius: '4px',
      width: 'fit-content'
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
      Patient Found: <strong>{patient.firstName} {patient.lastName}</strong>
    </div>
  );
}
