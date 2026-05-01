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
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'Cheque' | 'UPI' | 'Online' | 'Bank Transfer'>('Cash');

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
        paymentMode: 'Cash',
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
    <>
      <div className="mc-drawer-backdrop" onClick={onClose} />
      <div className="mc-drawer">
        <div className="mc-drawer-header">
          <div className="mc-drawer-header-title">
            <CreditCard size={18} /> Manage Billing
          </div>
          <button className="mc-drawer-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ padding: '16px 20px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>PATIENT #{regid}</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{patientName}</div>
        </div>

        <div className="mc-tab-nav" style={{ padding: '0 12px', background: 'white', borderBottom: '1px solid #f1f5f9' }}>
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

        <div className="mc-drawer-body" style={{ flex: 1, padding: '24px' }}>
          {activeTab === 'regular' && (
            <div className="animate-fade-in">
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
                Update the default consultation fee for this patient.
              </p>
              <div className="mc-legacy-input-group">
                <label>Regular Charges (₹)</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="mc-legacy-input"
                  autoFocus
                />
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="animate-fade-in">
              <div className="mc-legacy-input-group" style={{ marginBottom: '16px' }}>
                <label>Charge Title</label>
                <input 
                  type="text" 
                  value={customTitle} 
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="e.g. Lab Tests, Special Remedy"
                  className="mc-legacy-input"
                  autoFocus
                />
              </div>
              <div className="mc-legacy-input-group">
                <label>Amount (₹)</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="mc-legacy-input"
                />
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="animate-fade-in">
              <div className="mc-legacy-input-group" style={{ marginBottom: '16px' }}>
                <label>Amount Received (₹)</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="mc-legacy-input"
                  autoFocus
                />
              </div>
              <div className="mc-legacy-input-group">
                <label>Payment Mode</label>
                <select 
                  className="mc-legacy-select" 
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value as any)}
                >
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                  <option>Bank Transfer</option>
                </select>
              </div>
              {bills?.totals.totalBalance === 0 && (
                <div style={{ marginTop: '20px', padding: '12px', background: '#f0fdf4', color: '#16a34a', borderRadius: '10px', fontSize: '0.8rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <CheckCircle2 size={16} /> All balances are currently clear.
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '20px', background: 'white', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px' }}>
          <button className="mc-legacy-btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={isLoading}>Cancel</button>
          <button 
            className="mc-legacy-btn-primary" 
            style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
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
    </>
  );
}
