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

        <div style={{ padding: '20px', background: 'white', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--pp-blue-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pp-blue)' }}>
              <IndianRupee size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient #{regid}</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>{patientName}</div>
            </div>
          </div>
        </div>

        <div className="mc-tab-nav" style={{ padding: '0 16px', background: 'white', borderBottom: '1px solid #f1f5f9', display: 'flex' }}>
          <button 
            className={`mc-tab-btn ${activeTab === 'regular' ? 'active' : ''}`}
            onClick={() => { setActiveTab('regular'); setAmount(currentConsultationFee?.toString() || ''); }}
            style={{ flex: 1, padding: '14px 0', fontSize: '0.85rem', fontWeight: 700 }}
          >
            Regular
          </button>
          <button 
            className={`mc-tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => { setActiveTab('custom'); setAmount(''); }}
            style={{ flex: 1, padding: '14px 0', fontSize: '0.85rem', fontWeight: 700 }}
          >
            Additional
          </button>
          <button 
            className={`mc-tab-btn ${activeTab === 'payment' ? 'active' : ''}`}
            onClick={() => { setActiveTab('payment'); setAmount(''); }}
            style={{ flex: 1, padding: '14px 0', fontSize: '0.85rem', fontWeight: 700 }}
          >
            Payment
          </button>
        </div>

        <div className="mc-drawer-body" style={{ flex: 1, padding: '24px', background: '#f8fafc' }}>
          {activeTab === 'regular' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Regular Charge (₹)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#94a3b8' }}>₹</span>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="pp-input"
                    style={{ width: '100%', paddingLeft: '32px', fontSize: '1.1rem', fontWeight: 700 }}
                    autoFocus
                  />
                </div>
                <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '12px', lineHeight: 1.4 }}>
                  This updates the default consultation fee or day charges for the patient.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Charge Title</label>
                <input 
                  type="text" 
                  value={customTitle} 
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="e.g. Investigation, Procedure"
                  className="pp-input"
                  style={{ width: '100%' }}
                  autoFocus
                />
              </div>
              <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Amount (₹)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#94a3b8' }}>₹</span>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="pp-input"
                    style={{ width: '100%', paddingLeft: '32px' }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Amount Received (₹)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#94a3b8' }}>₹</span>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="pp-input"
                    style={{ width: '100%', paddingLeft: '32px', fontSize: '1.1rem', fontWeight: 700 }}
                    autoFocus
                  />
                </div>
              </div>
              <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Payment Mode</label>
                <select 
                  className="pp-input" 
                  style={{ width: '100%' }}
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value as any)}
                >
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Card</option>
                  <option>Bank Transfer</option>
                </select>
              </div>
              
              {bills?.totals.totalBalance === 0 ? (
                <div style={{ padding: '12px', background: '#f0fdf4', color: '#16a34a', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center', border: '1px solid #dcfce7' }}>
                  <CheckCircle2 size={16} /> All balances are clear.
                </div>
              ) : (
                <div style={{ padding: '12px', background: '#fff7ed', color: '#c2410c', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center', border: '1px solid #ffedd5' }}>
                  <AlertCircle size={16} /> Outstanding Balance: ₹{bills?.totals.totalBalance}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '20px', background: 'white', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px' }}>
          <button 
            className="btn-secondary" 
            style={{ flex: 1, padding: '12px', borderRadius: '10px' }} 
            onClick={onClose} 
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            className="btn-primary" 
            style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '10px', background: 'var(--pp-blue)' }}
            disabled={isLoading || !amount}
            onClick={() => {
              if (activeTab === 'regular') handleUpdateRegular();
              if (activeTab === 'custom') handleAddCustom();
              if (activeTab === 'payment') handleRecordPayment();
            }}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span style={{ fontWeight: 700 }}>
              {activeTab === 'regular' ? 'Update Charge' : activeTab === 'custom' ? 'Add Charge' : 'Record Payment'}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
