import React, { useState } from 'react';
import { 
  X, CreditCard, Plus, Receipt, IndianRupee, 
  ChevronRight, Save, Loader2, AlertCircle, CheckCircle2,
  Trash2, Edit
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useCreateCustomBill, 
  useRecordPayment 
} from '../../billing/hooks/use-billing';
import { useUpdatePatient } from '../../patients/hooks/use-patients';
import { usePatientBills } from '../../billing/hooks/use-billing';
import { 
  useCreateAdditionalCharge, 
  useUpdateAdditionalCharge,
  useCharges, 
  useDeleteAdditionalCharge 
} from '../../billing/hooks/use-accounts';

interface BillingUpdateModalProps {
  regid: number;
  patientName: string;
  onClose: () => void;
  currentConsultationFee?: number;
  defaultTab?: TabType;
  additionalCharges?: any[];
  displayDate?: Date;
  rxWorkflow?: any;
  visitId?: number;
}

type TabType = 'regular' | 'custom' | 'payment';

export function BillingUpdateModal({ 
  regid, 
  patientName, 
  onClose, 
  currentConsultationFee, 
  defaultTab, 
  additionalCharges = [],
  displayDate,
  rxWorkflow,
  visitId
}: BillingUpdateModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab || 'regular');
  const [amount, setAmount] = useState<string>(currentConsultationFee?.toString() || '');
  const [customTitle, setCustomTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [isProduct, setIsProduct] = useState(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'Cheque' | 'UPI' | 'Online' | 'Bank Transfer'>('Cash');
  const [editingChargeId, setEditingChargeId] = useState<number | null>(null);

  // Mutations
  const updatePatient = useUpdatePatient();
  const createAdditionalCharge = useCreateAdditionalCharge();
  const updateAdditionalCharge = useUpdateAdditionalCharge();
  const deleteAdditionalCharge = useDeleteAdditionalCharge();
  const recordPayment = useRecordPayment();
  const { data: bills, refetch: refetchBills } = usePatientBills(regid);
  const { data: chargesCatalog = [] } = useCharges();
  const qc = useQueryClient();

  const todayCharges = React.useMemo(() => {
    if (!displayDate || !additionalCharges) return [];
    return additionalCharges.filter((ac: any) => {
      const d = ac.createdAt ? new Date(ac.createdAt) : null;
      return d && d.toDateString() === displayDate.toDateString();
    });
  }, [displayDate, additionalCharges]);

  React.useEffect(() => {
    if (activeTab === 'custom' && todayCharges.length > 0 && !editingChargeId) {
      const firstCharge = todayCharges[0];
      const title = firstCharge.name || firstCharge.additionalName || '';
      setCustomTitle(title);
      setAmount((firstCharge.price || firstCharge.additionalPrice || firstCharge.amount || 0).toString());
      
      const match = chargesCatalog.find(c => c.charges === title);
      const isProd = (match && match.type === 'Product') || (firstCharge.quantity !== undefined && firstCharge.quantity !== null);
      
      setIsProduct(!!isProd);
      setQuantity(firstCharge.quantity || 1);
      setEditingChargeId(firstCharge.id);
    }
  }, [activeTab, todayCharges, editingChargeId, chargesCatalog]);

  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow || 'unset';
    };
  }, []);

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
      if (editingChargeId) {
        await updateAdditionalCharge.mutateAsync({
          id: editingChargeId,
          additionalName: customTitle,
          additionalPrice: Number(amount),
          additionalQuantity: isProduct ? quantity : 1,
        });
      } else {
        await createAdditionalCharge.mutateAsync({
          regid,
          additionalName: customTitle,
          additionalPrice: Number(amount),
          receivedPrice: 0,
          additionalQuantity: isProduct ? quantity : 1,
          dateval: new Date().toISOString().split('T')[0]
        });

        // If a new charge was successfully created, append its name to the current prescription's instructions
        if (rxWorkflow) {
          if (rxWorkflow.editingId) {
            rxWorkflow.setForm((prev: any) => {
              const prevInst = prev.instructions || '';
              const separator = prevInst ? ', ' : '';
              return {
                ...prev,
                instructions: `${prevInst}${separator}${customTitle}`
              };
            });
          } else if (rxWorkflow.firstRxOfToday) {
            const rx = rxWorkflow.firstRxOfToday;
            rxWorkflow.setEditingId(rx.id);
            const prevInst = rx.prescription || rx.notes || rx.instructions || '';
            const separator = prevInst ? ', ' : '';
            rxWorkflow.setForm({
              remedyName: rx.remedy_name || rx.remedyName || '',
              potencyName: rx.potency_name || rx.potencyName || '',
              frequencyName: rx.frequency_name || rx.frequencyName || '',
              days: Number(rx.days) || 0,
              instructions: `${prevInst}${separator}${customTitle}`,
              notes: rx.notes || ''
            });
            rxWorkflow.setActiveTab('rx');
          } else {
            const initialDays = 0;
            const initialForm = { 
              remedyName: '', 
              potencyName: '', 
              frequencyName: '', 
              days: initialDays, 
              instructions: customTitle, 
              notes: '' 
            };
            rxWorkflow.setForm(initialForm);
            rxWorkflow.setActiveTab('rx');
            try {
              const res = await rxWorkflow.saveMutation.mutateAsync({
                regid,
                visitId,
                deliveryMode: rxWorkflow.delivery || 'clinic',
                ...initialForm
              });
              if (res && typeof res === 'object' && 'id' in res) {
                rxWorkflow.setEditingId(Number(res.id));
              }
            } catch (err) {
              console.error('Failed to auto-create prescription for charge:', err);
            }
          }
        }
      }
      refetchBills();
      qc.invalidateQueries({ queryKey: ['medical-case', 'full'] });
      onClose();
    } catch (err) {
      console.error('Failed to save custom charge:', err);
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

  const isLoading = updatePatient.isPending || createAdditionalCharge.isPending || updateAdditionalCharge.isPending || recordPayment.isPending;

  const selectedCatalogItem = React.useMemo(() => {
    return chargesCatalog.find(c => c.charges === customTitle);
  }, [chargesCatalog, customTitle]);

  const maxQuantity = selectedCatalogItem?.type === 'Product' ? (selectedCatalogItem.quantity || 0) : null;

  return (
    <>
      <div className="mc-drawer-backdrop" onClick={onClose} />
      <div 
        className="mc-drawer animate-slide-in-right" 
        style={{ 
          position: 'fixed',
          top: 0,
          bottom: 0,
          right: 0,
          width: '100%',
          maxWidth: '580px', 
          background: 'white', 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100vh', 
          borderRadius: 0, 
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.15)',
          borderLeft: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        <div style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
              Manage Billing
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
              Patient #{regid} • <span style={{ color: '#0f172a', fontWeight: 700 }}>{patientName}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#e2e8f0', border: 'none', color: '#475569', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '0 24px', background: 'white', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '24px' }}>
          {(['regular', 'custom', 'payment'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setAmount(
                  tab === 'regular' 
                    ? (currentConsultationFee || 0).toString() 
                    : tab === 'payment' 
                      ? (bills?.totals.totalBalance || 0).toString()
                      : ''
                );
                if (tab !== 'custom') {
                  setEditingChargeId(null);
                  setCustomTitle('');
                  setQuantity(1);
                  setIsProduct(false);
                }
              }}
              style={{
                padding: '16px 0',
                border: 'none',
                background: 'none',
                fontSize: '0.9rem',
                fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? '#0f172a' : '#64748b',
                borderBottom: activeTab === tab ? '2px solid #0f172a' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none'
              }}
            >
              {tab === 'regular' ? 'Registration' : tab === 'custom' ? 'Additional' : 'Payment'}
            </button>
          ))}
        </div>

        <div 
          className="mc-drawer-body" 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            padding: '24px', 
            background: 'white', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '20px' 
          }}
        >
          <style>{`
            .mc-drawer-body::-webkit-scrollbar {
              display: none;
            }
          `}</style>
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
                    value={chargesCatalog.find(c => c.charges === customTitle)?.id?.toString() || ''}
                    onChange={e => {
                      const selected = chargesCatalog.find(c => c.id === Number(e.target.value));
                      if (selected) {
                        setCustomTitle(selected.charges || '');
                        setAmount((selected.amount || 0).toString());
                        setIsProduct(selected.type === 'Product');
                        setQuantity(1);
                      }
                    }}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Quantity</label>
                    {maxQuantity !== null && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: maxQuantity > 0 ? '#64748b' : '#ef4444' }}>
                        Available Stock: {maxQuantity}
                      </span>
                    )}
                  </div>
                  <input 
                    type="number" 
                    value={quantity} 
                    onChange={e => setQuantity(Number(e.target.value) || 1)}
                    min="1"
                    className={`pp-input ${maxQuantity !== null && quantity > maxQuantity ? 'border-red-500' : ''}`}
                    style={{ width: '100%', borderRadius: '8px', border: maxQuantity !== null && quantity > maxQuantity ? '1px solid #ef4444' : '1px solid #e2e8f0', padding: '10px 14px' }}
                  />
                  {maxQuantity !== null && quantity > maxQuantity && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>
                      <AlertCircle size={14} /> Selected quantity ({quantity}) exceeds available stock ({maxQuantity})!
                    </div>
                  )}
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


          {/* Previously Added Charges section placed below the action buttons */}
          {activeTab === 'custom' && additionalCharges && additionalCharges.length > 0 && (
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
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
                        onClick={(e) => {
                          e.preventDefault();
                          const title = ac.name || ac.additionalName || '';
                          setCustomTitle(title);
                          setAmount((ac.price || ac.additionalPrice || ac.amount || 0).toString());
                          
                          const match = chargesCatalog.find(c => c.charges === title);
                          const isProd = (match && match.type === 'Product') || (ac.quantity !== undefined && ac.quantity !== null);
                          
                          setIsProduct(!!isProd);
                          setQuantity(ac.quantity || 1);
                          setEditingChargeId(ac.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        title="Edit charge"
                      >
                        <Edit size={15} />
                      </button>
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
              {activeTab === 'regular' ? 'Update Charge' : activeTab === 'custom' ? (editingChargeId ? 'Save Changes' : 'Add Charge') : 'Record Payment'}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
