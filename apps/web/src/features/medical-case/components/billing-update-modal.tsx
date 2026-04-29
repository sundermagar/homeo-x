import React, { useState } from 'react';
import { 
  X, CreditCard, Plus, Receipt, IndianRupee, 
  ChevronRight, Save, Loader2, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { 
  useCreateCustomBill, 
  useRecordPayment 
} from '../../billing/hooks/use-billing';
import { useUpdatePatient } from '../../patients/hooks/use-patients';
import { usePatientBills } from '../../billing/hooks/use-billing';

interface BillingUpdateModalProps {
  regid: number;
  patientName: string;
  onClose: () => void;
  currentConsultationFee?: number;
}

type TabType = 'regular' | 'custom' | 'payment';

export function BillingUpdateModal({ regid, patientName, onClose, currentConsultationFee }: BillingUpdateModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('regular');
  const [amount, setAmount] = useState<string>(currentConsultationFee?.toString() || '');
  const [customTitle, setCustomTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');

  // Mutations
  const updatePatient = useUpdatePatient();
  const createCustomBill = useCreateCustomBill();
  const recordPayment = useRecordPayment();
  const { data: bills, refetch: refetchBills } = usePatientBills(regid);

  const handleUpdateRegular = async () => {
    if (!amount || isNaN(Number(amount))) return;
    try {
      await updatePatient.mutateAsync({
        regid,
        consultationFee: Number(amount)
      });
      onClose();
    } catch (err) {
      console.error('Failed to update regular charges:', err);
    }
  };

  const handleAddCustom = async () => {
    if (!amount || isNaN(Number(amount)) || !customTitle) return;
    try {
      await createCustomBill.mutateAsync({
        regid,
        charges: Number(amount),
        received: 0,
        customTitle,
        notes,
        billDate: new Date().toISOString().split('T')[0]
      });
      refetchBills();
      onClose();
    } catch (err) {
      console.error('Failed to add custom charge:', err);
    }
  };

  const handleRecordPayment = async () => {
    if (!amount || isNaN(Number(amount))) return;
    // For simplicity in this clinical view, we record payment against the most recent bill with balance
    // or create a generic payment if the backend supports it.
    // In our case, recordPayment needs a billId.
    const billWithBalance = bills?.bills.find(b => b.balance > 0);
    
    if (!billWithBalance) {
      // If no bill found, we might need to create a custom bill first or show an error
      alert('No outstanding bills found to apply payment to.');
      return;
    }

    try {
      await recordPayment.mutateAsync({
        regid,
        billId: billWithBalance.id,
        amount: Number(amount),
        paymentMode,
        receivedDate: new Date().toISOString().split('T')[0]
      });
      refetchBills();
      onClose();
    } catch (err) {
      console.error('Failed to record payment:', err);
    }
  };

  const isLoading = updatePatient.isPending || createCustomBill.isPending || recordPayment.isPending;

  return (
    <div className="mc-modal-overlay">
      <div className="mc-modal fade-in" style={{ maxWidth: '450px' }}>
        <div className="mc-modal-header">
          <div className="mc-modal-title-group">
            <div className="mc-modal-icon-bg" style={{ background: 'var(--pp-blue-tint)', color: 'var(--pp-blue)' }}>
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="mc-modal-title">Manage Billing</h3>
              <p className="mc-modal-sub">{regid} — {patientName}</p>
            </div>
          </div>
          <button className="mc-modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="mc-tab-nav" style={{ padding: '0 12px', background: 'transparent', borderBottom: '1px solid var(--border-main)' }}>
          <button 
            className={`mc-tab-btn ${activeTab === 'regular' ? 'active' : ''}`}
            onClick={() => { setActiveTab('regular'); setAmount(currentConsultationFee?.toString() || ''); }}
          >
            Regular
          </button>
          <button 
            className={`mc-tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => { setActiveTab('custom'); setAmount(''); }}
          >
            Additional
          </button>
          <button 
            className={`mc-tab-btn ${activeTab === 'payment' ? 'active' : ''}`}
            onClick={() => { setActiveTab('payment'); setAmount(''); }}
          >
            Payment
          </button>
        </div>

        <div className="mc-modal-body" style={{ minHeight: '220px' }}>
          {activeTab === 'regular' && (
            <div className="animate-fade-in">
              <p style={{ fontSize: '0.85rem', color: 'var(--pp-text-3)', marginBottom: '16px' }}>
                Update the default consultation fee for this patient.
              </p>
              <div className="mc-input-group">
                <label>Regular Charges (₹)</label>
                <div className="mc-input-wrap">
                  <IndianRupee size={16} className="mc-input-icon" />
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    autoFocus
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="animate-fade-in">
              <div className="mc-input-group" style={{ marginBottom: '12px' }}>
                <label>Charge Title</label>
                <input 
                  type="text" 
                  value={customTitle} 
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="e.g. Lab Tests, Special Remedy"
                  className="mc-legacy-input"
                  style={{ padding: '10px 12px' }}
                  autoFocus
                />
              </div>
              <div className="mc-input-group">
                <label>Amount (₹)</label>
                <div className="mc-input-wrap">
                  <IndianRupee size={16} className="mc-input-icon" />
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="animate-fade-in">
              <div className="mc-input-group" style={{ marginBottom: '12px' }}>
                <label>Amount Received (₹)</label>
                <div className="mc-input-wrap">
                  <IndianRupee size={16} className="mc-input-icon" />
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    autoFocus
                  />
                </div>
              </div>
              <div className="mc-input-group">
                <label>Payment Mode</label>
                <select 
                  className="mc-legacy-select" 
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-main)' }}
                >
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                  <option>Bank Transfer</option>
                </select>
              </div>
              {bills?.totals.totalBalance === 0 && (
                <div style={{ marginTop: '12px', padding: '8px 12px', background: '#f0fdf4', color: '#16a34a', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <CheckCircle2 size={14} /> All balances are currently clear.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mc-modal-footer">
          <button className="mc-btn-secondary" onClick={onClose} disabled={isLoading}>Cancel</button>
          <button 
            className="mc-btn-finalize" 
            style={{ borderRadius: '8px' }}
            disabled={isLoading || !amount}
            onClick={() => {
              if (activeTab === 'regular') handleUpdateRegular();
              if (activeTab === 'custom') handleAddCustom();
              if (activeTab === 'payment') handleRecordPayment();
            }}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {activeTab === 'regular' ? 'Update' : activeTab === 'custom' ? 'Add Charge' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
