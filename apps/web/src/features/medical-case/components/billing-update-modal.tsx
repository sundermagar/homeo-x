import React, { useState } from 'react';
import { 
  X, CreditCard, Plus, Receipt, IndianRupee, 
  ChevronRight, Save, Loader2, AlertCircle, CheckCircle2,
  Trash2
} from 'lucide-react';
import { 
  useCreateCustomBill, 
  useRecordPayment 
} from '../../billing/hooks/use-billing';
import { useUpdatePatient } from '../../patients/hooks/use-patients';
import { usePatientBills } from '../../billing/hooks/use-billing';
import { useCreateAdditionalCharge, useCharges, useDeleteAdditionalCharge } from '../../billing/hooks/use-accounts';

interface BillingUpdateModalProps {
  regid: number;
  patientName: string;
  onClose: () => void;
  currentConsultationFee?: number;
  defaultTab?: TabType;
  additionalCharges?: any[];
}

type TabType = 'regular' | 'custom' | 'payment';

export function BillingUpdateModal({ regid, patientName, onClose, currentConsultationFee, defaultTab, additionalCharges = [] }: BillingUpdateModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab || 'regular');
  const [amount, setAmount] = useState<string>(currentConsultationFee?.toString() || '');
  const [customTitle, setCustomTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isProduct, setIsProduct] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'Cheque' | 'UPI' | 'Online' | 'Bank Transfer'>('Cash');

  // Mutations
  const updatePatient = useUpdatePatient();
  const createAdditionalCharge = useCreateAdditionalCharge();
  const deleteAdditionalCharge = useDeleteAdditionalCharge();
  const recordPayment = useRecordPayment();
  const { data: bills, refetch: refetchBills } = usePatientBills(regid);
  const { data: chargesCatalog = [] } = useCharges();

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
      await createAdditionalCharge.mutateAsync({
        regid,
        additionalName: customTitle,
        additionalPrice: Number(amount),
        receivedPrice: 0,
        additionalQuantity: isProduct ? quantity : 1,
        dateval: new Date().toISOString().split('T')[0]
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

  const isLoading = updatePatient.isPending || createAdditionalCharge.isPending || recordPayment.isPending;

  return (
    <>
      <div className="mc-drawer-backdrop" onClick={onClose} />
      <div className="mc-drawer animate-slide-in-right" style={{ maxWidth: '520px', background: 'white', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="mc-drawer-header" style={{ background: 'white', color: '#0f172a', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
          <div className="mc-drawer-header-title" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            Manage Billing
          </div>
          <button className="mc-drawer-close" onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 24px 10px 24px', background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Patient #{regid}:</span>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{patientName}</span>
          </div>
        </div>

        <div className="mc-tab-nav" style={{ padding: '0 24px', background: 'white', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '24px' }}>
          <button 
            className={`mc-tab-btn ${activeTab === 'regular' ? 'active' : ''}`}
            onClick={() => { setActiveTab('regular'); setAmount(currentConsultationFee?.toString() || ''); }}
            style={{ 
              padding: '14px 0', 
              fontSize: '0.9rem', 
              fontWeight: activeTab === 'regular' ? 700 : 600,
              color: activeTab === 'regular' ? '#0f172a' : '#64748b',
              borderBottom: activeTab === 'regular' ? '2px solid #0f172a' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Registration
          </button>
          <button 
            className={`mc-tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => { setActiveTab('custom'); setAmount(''); }}
            style={{ 
              padding: '14px 0', 
              fontSize: '0.9rem', 
              fontWeight: activeTab === 'custom' ? 700 : 600,
              color: activeTab === 'custom' ? '#0f172a' : '#64748b',
              borderBottom: activeTab === 'custom' ? '2px solid #0f172a' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Additional
          </button>
          <button 
            className={`mc-tab-btn ${activeTab === 'payment' ? 'active' : ''}`}
            onClick={() => { setActiveTab('payment'); setAmount(''); }}
            style={{ 
              padding: '14px 0', 
              fontSize: '0.9rem', 
              fontWeight: activeTab === 'payment' ? 700 : 600,
              color: activeTab === 'payment' ? '#0f172a' : '#64748b',
              borderBottom: activeTab === 'payment' ? '2px solid #0f172a' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Payment
          </button>
        </div>

        <div className="mc-drawer-body" style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'white', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {activeTab === 'regular' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Registration Charge (₹)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: '#64748b' }}>₹</span>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    className="pp-input"
                    style={{ width: '100%', paddingLeft: '28px', fontSize: '1rem', fontWeight: 600, borderRadius: '8px', border: '1px solid #e2e8f0', padding: '10px 14px 10px 28px' }}
                    autoFocus
                  />
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px', lineHeight: 1.4 }}>
                  This updates the default consultation fee or day charges for the patient.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {chargesCatalog && chargesCatalog.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Select from Catalog</label>
                  <select 
                    className="pp-input" 
                    style={{ width: '100%', cursor: 'pointer', fontWeight: 600, color: '#0f172a', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '10px 14px' }}
                    onChange={e => {
                      const selected = chargesCatalog.find(c => c.id === Number(e.target.value));
                      if (selected) {
                        setCustomTitle(selected.charges || '');
                        setAmount((selected.amount || 0).toString());
                        setIsProduct(selected.type === 'Product');
                        setQuantity(1);
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>-- Choose predefined service or product --</option>
                    {chargesCatalog.map(charge => (
                      <option key={charge.id} value={charge.id}>
                        {charge.charges}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Charge Title</label>
                <input 
                  type="text" 
                  value={customTitle} 
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="e.g. Investigation, Procedure"
                  className="pp-input"
                  style={{ width: '100%', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '10px 14px' }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Amount (₹)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: '#64748b' }}>₹</span>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    className="pp-input"
                    style={{ width: '100%', paddingLeft: '28px', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '10px 14px 10px 28px' }}
                  />
                </div>
              </div>

              {isProduct && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Quantity</label>
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={e => setQuantity(Number(e.target.value) || 1)}
                    min="1"
                    className="pp-input"
                    style={{ width: '100%', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '10px 14px' }}
                  />
                </div>
              )}

              {additionalCharges && additionalCharges.length > 0 && (
                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                    Previously Added Charges
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {additionalCharges.map((ac: any) => (
                      <div 
                        key={ac.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '10px 14px', 
                          background: '#f8fafc', 
                          borderRadius: '8px', 
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>{ac.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            {ac.quantity && ac.quantity > 1 ? `₹${ac.price} × ${ac.quantity}` : `₹${ac.price || ac.amount}`}
                            {ac.createdAt && ` • ${new Date(ac.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                            ₹{ac.amount}
                          </span>
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              if (confirm(`Are you sure you want to remove "${ac.name}"?`)) {
                                try {
                                  await deleteAdditionalCharge.mutateAsync(ac.id);
                                  refetchBills();
                                } catch (err) {
                                  console.error('Failed to delete additional charge:', err);
                                }
                              }
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                            title="Delete charge"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Amount Received (₹)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: '#64748b' }}>₹</span>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    className="pp-input"
                    style={{ width: '100%', paddingLeft: '28px', fontSize: '1rem', fontWeight: 600, borderRadius: '8px', border: '1px solid #e2e8f0', padding: '10px 14px 10px 28px' }}
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Payment Mode</label>
                <select 
                  className="pp-input" 
                  style={{ width: '100%', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '10px 14px' }}
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
                <div style={{ padding: '12px', background: '#f0fdf4', color: '#16a34a', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center', border: '1px solid #dcfce7' }}>
                  <CheckCircle2 size={16} /> All balances are clear.
                </div>
              ) : (
                <div style={{ padding: '12px', background: '#fff7ed', color: '#c2410c', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center', border: '1px solid #ffedd5' }}>
                  <AlertCircle size={16} /> Outstanding Balance: ₹{bills?.totals.totalBalance}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '24px', background: 'white', display: 'flex', gap: '12px', borderTop: '1px solid #f1f5f9' }}>
          <button 
            className="btn-secondary" 
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer' }} 
            onClick={onClose} 
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            className="btn-primary" 
            style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '8px', background: '#0f172a', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}
            disabled={isLoading || !amount}
            onClick={() => {
              if (activeTab === 'regular') handleUpdateRegular();
              if (activeTab === 'custom') handleAddCustom();
              if (activeTab === 'payment') handleRecordPayment();
            }}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>
              {activeTab === 'regular' ? 'Update Charge' : activeTab === 'custom' ? 'Add Charge' : 'Record Payment'}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
