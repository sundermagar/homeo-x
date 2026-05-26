import type { BillWithPatient } from '@mmc/types';
import { format } from 'date-fns';
import { RefreshCw, Receipt, Printer, X, DollarSign, CreditCard, ChevronRight, ChevronDown } from 'lucide-react';
import { printBill, printGroupedBills } from '@/shared/utils/print';
import { useOrganizations } from '../../platform/hooks/use-organizations';
import { useAuthStore } from '@/shared/stores/auth-store';
import { useState, useMemo, Fragment } from 'react';
import { useRecordPayment, usePatientBills, useUpdateCharges } from '../hooks/use-billing';
import { Drawer } from '@/shared/components/drawer';


interface BillingTableProps {
  bills: BillWithPatient[];
  isLoading: boolean;
  onPrint?: (bill: BillWithPatient) => void;
}

export function BillingTable({ bills, isLoading, onPrint }: BillingTableProps) {
  const { data: orgs = [] } = useOrganizations();
  const user = useAuthStore(s => s.user);
  const myOrg = orgs.find(o => o.id === user?.contextId) || orgs[0];
  const recordPayment = useRecordPayment();
  const updateCharges = useUpdateCharges();
  
  const [printingBill, setPrintingBill] = useState<BillWithPatient | null>(null);
  const [receivingBill, setReceivingBill] = useState<BillWithPatient | null>(null);
  const [receivingGroup, setReceivingGroup] = useState<any | null>(null);
  const [receiveAmount, setReceiveAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState('Cash');

  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  
  const { data: patientHistory } = usePatientBills(selectedGroup?.regid || 0);
  const [editingChargeId, setEditingChargeId] = useState<number | null>(null);
  const [newChargeAmount, setNewChargeAmount] = useState<number>(0);

  // We keep the grouping logic


  const groupedBills = useMemo(() => {
    const map = new Map<number, {
      regid: number;
      patientName: string;
      billDate: string | null;
      registrationCharge: number;
      medicineDaysCharge: number;
      packageCharge: number;
      additionalCharge: number;
      totalCharges: number;
      totalReceived: number;
      totalBalance: number;
      paymentModes: Set<string>;
      bills: BillWithPatient[];
    }>();

    for (const bill of bills) {
      if (!map.has(bill.regid)) {
        map.set(bill.regid, {
          regid: bill.regid,
          patientName: bill.patientName ?? '',
          billDate: bill.billDate,
          registrationCharge: 0,
          medicineDaysCharge: 0,
          packageCharge: 0,
          additionalCharge: 0,
          totalCharges: 0,
          totalReceived: 0,
          totalBalance: 0,
          paymentModes: new Set(),
          bills: []
        });
      }
      const group = map.get(bill.regid)!;
      
      const chargeAmount = bill.charges || 0;
      group.totalCharges += chargeAmount;
      group.totalReceived += bill.received || 0;
      group.totalBalance += bill.balance || 0;

      // Breakdown calculation
      if (bill.billType === 'Additional') {
        group.additionalCharge += chargeAmount;
      } else if (bill.treatment?.startsWith('Package:')) {
        group.packageCharge += chargeAmount;
      } else if (bill.billType === 'Registration') {
        group.registrationCharge += chargeAmount;
      } else if (bill.billType === 'Consultation') {
        // Only consider as medicine days charge if not Registration/Package/Additional
        // Some consultation bills might be registration if the type wasn't set correctly, but we follow standard types.
        group.medicineDaysCharge += chargeAmount;
      } else {
        // Fallback: add to registration or general if type is missing or Custom
        if (bill.billType !== 'Custom') {
           group.registrationCharge += chargeAmount;
        }
      }

      if (bill.paymentMode && (bill.received || 0) > 0) {
        group.paymentModes.add(bill.paymentMode);
      }
      group.bills.push(bill);
    }
    return Array.from(map.values());
  }, [bills]);

  const handlePrint = (template: any) => {
    if (myOrg && printingBill) {
      printBill(printingBill, myOrg, { template });
      setPrintingBill(null);
    }
  };

  const handleReceivePayment = async () => {
    if (!receivingBill || receiveAmount <= 0) return;
    try {
      await recordPayment.mutateAsync({
        regid: receivingBill.regid,
        billId: receivingBill.id,
        amount: receiveAmount,
        paymentMode: paymentMode,
      });
      setReceivingBill(null);
      setReceiveAmount(0);
    } catch (err) {
      console.error(err);
      alert('Failed to record payment');
    }
  };

  const handleReceiveGroupPayment = async () => {
    if (!receivingGroup || receiveAmount <= 0) return;
    try {
      let remaining = receiveAmount;
      for (const bill of receivingGroup.bills) {
        if (remaining <= 0) break;
        if (bill.balance > 0) {
          const payAmt = Math.min(bill.balance, remaining);
          await recordPayment.mutateAsync({
            regid: bill.regid,
            billId: bill.id,
            amount: payAmt,
            paymentMode: paymentMode,
          });
          remaining -= payAmt;
        }
      }
      setReceivingGroup(null);
      setReceiveAmount(0);
      setSelectedGroup(null);
    } catch (err) {
      console.error(err);
      alert('Failed to record consolidated payment');
    }
  };

  const handleSaveCharges = async (billId: number) => {
    if (newChargeAmount < 0) return;
    try {
      await updateCharges.mutateAsync({ billId, amount: newChargeAmount });
      setEditingChargeId(null);
      // Wait for patientHistory to automatically re-fetch via invalidateQueries
    } catch (err) {
      console.error(err);
      alert('Failed to update charges');
    }
  };

  const todayBillIds = useMemo(() => new Set(selectedGroup?.bills.map((b: any) => b.id) || []), [selectedGroup]);
  const pastBills = useMemo(() => {
    if (!patientHistory?.bills || !selectedGroup?.billDate) return [];
    const selectedDate = new Date(selectedGroup.billDate);
    selectedDate.setHours(0, 0, 0, 0); // Normalize time
    
    return patientHistory.bills.filter(b => {
      if (todayBillIds.has(b.id)) return false;
      const bDate = new Date(b.billDate);
      bDate.setHours(0, 0, 0, 0);
      return bDate.getTime() < selectedDate.getTime();
    });
  }, [patientHistory, selectedGroup, todayBillIds]);

  const renderBillCard = (bill: any, isPast: boolean = false) => (
    <div key={bill.id} style={{ padding: 16, border: '1px solid var(--pp-warm-3)', borderRadius: 16, background: 'var(--bg-surface-2)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--pp-ink)' }}>
            {(() => {
              const t = bill.treatment || bill.billType || 'Consultation';
              return t === 'Consultation' ? 'Medicine Charge' : t;
            })()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--pp-text-3)', fontWeight: 600, marginTop: 2 }}>
            Bill #{bill.billNo} • {isPast && bill.billDate ? format(new Date(bill.billDate), 'dd MMM yyyy') + ' • ' : ''}{bill.paymentMode ?? 'No Payment Mode'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--pp-ink)', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
              ₹{bill.charges.toLocaleString()}
            </div>
          {bill.balance > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--pp-danger-fg)', fontWeight: 700, marginTop: 4 }}>Owes ₹{bill.balance.toLocaleString()}</div>
          )}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="bill-empty">
        <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <div className="bill-card">
        <div className="bill-empty">
          <Receipt size={28} className="bill-empty-icon" />
          <p className="bill-empty-text">No billing records found for this date.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bill-card fade-in" style={{ boxShadow: 'var(--pp-premium-shadow)' }}>
        <div className="bill-table-container">
          <table className="bill-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Bill #</th>
                <th style={{ width: '120px' }}>Date</th>
                <th>Patient</th>
                <th style={{ width: '90px' }}>Mode</th>
                <th style={{ width: '220px' }}>Charges Breakdown</th>
                <th style={{ width: '90px' }}>Total</th>
                <th style={{ width: '90px' }}>Received</th>
                <th style={{ width: '90px' }}>Balance</th>
                <th style={{ width: '220px', textAlign: 'right' }}>Action</th>

              </tr>
            </thead>
            <tbody>
              {groupedBills.map((group) => {
                const isExpanded = selectedGroup?.regid === group.regid;
                return (
                  <Fragment key={`group-${group.regid}`}>
                    <tr onClick={() => setSelectedGroup(group)} style={{ cursor: 'pointer', background: isExpanded ? 'var(--bg-surface-2)' : 'transparent', transition: 'background 0.2s ease' }}>
                      <td data-label="Bill #" style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--pp-text-3)' }}>
                            {group.bills.length} Item{group.bills.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </td>
                      <td data-label="Date" style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.78rem', color: 'var(--pp-text-3)' }}>
                        <div>{group.billDate ? format(new Date(group.billDate), 'dd-MM-yyyy') : '—'}</div>
                      </td>
                      <td data-label="Patient" style={{ fontWeight: 600 }}>
                        <div>{group.patientName ? group.patientName.replace(/\b\w/g, c => c.toUpperCase()) : '—'}</div>
                      </td>
                      <td data-label="Mode">
                        <div className="plat-cell-val" style={{ gap: 4, display: 'flex', flexWrap: 'wrap' }}>
                          {Array.from(group.paymentModes).map(mode => (
                            <span key={mode} className={`bill-badge ${mode === 'Online' ? 'bill-badge-primary' : 'bill-badge-default'}`}>
                              {mode}
                            </span>
                          ))}
                          {group.paymentModes.size === 0 && '—'}
                        </div>
                      </td>
                      <td data-label="Charges Breakdown">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--pp-text-3)' }}>Reg:</span> <span style={{ fontWeight: 600 }}>₹{group.registrationCharge}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--pp-text-3)' }}>Med:</span> <span style={{ fontWeight: 600 }}>₹{group.medicineDaysCharge}</span></div>
                          {group.packageCharge > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--pp-text-3)' }}>Pkg:</span> <span style={{ fontWeight: 600 }}>₹{group.packageCharge}</span></div>}
                          {group.additionalCharge > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--pp-text-3)' }}>Add:</span> <span style={{ fontWeight: 600 }}>₹{group.additionalCharge}</span></div>}
                        </div>
                      </td>
                      <td data-label="Total" style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 700, color: 'var(--pp-blue)' }}>
                        <div className="plat-cell-val">
                          ₹{group.totalCharges.toLocaleString()}
                        </div>
                      </td>
                      <td data-label="Received" style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 700, color: 'var(--pp-success-fg)' }}>
                        <div className="plat-cell-val">
                          ₹{group.totalReceived.toLocaleString()}
                        </div>
                      </td>
                      <td data-label="Balance" style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 700, color: group.totalBalance > 0 ? 'var(--pp-danger-fg)' : 'var(--pp-text-3)' }}>
                        <div className="plat-cell-val">
                          {group.totalBalance > 0 ? `₹${group.totalBalance.toLocaleString()}` : '—'}
                        </div>
                      </td>
                      <td data-label="Action" style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div className="plat-cell-val">
                          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                             <button className="bill-btn bill-btn-sm" style={{ color: 'var(--pp-blue)', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 11, padding: '0 8px' }} onClick={() => setSelectedGroup(group)}>
                               View Details
                             </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive Payment Side Drawer */}
      <Drawer
        isOpen={!!receivingBill || !!receivingGroup}
        onClose={() => { setReceivingBill(null); setReceivingGroup(null); }}
        title={receivingGroup ? "Consolidated Payment" : "Record Payment"}
        maxWidth="400px"
      >
        {(receivingBill || receivingGroup) && (
          <div className="bill-form">
            <div style={{ marginBottom: 16, padding: 16, background: 'var(--bg-surface-2)', borderRadius: 16 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--pp-text-3)', fontWeight: 700 }}>
                {receivingBill ? `Bill #${receivingBill.billNo}` : 'All Unpaid Invoices'} • {receivingBill ? receivingBill.patientName : receivingGroup.patientName}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 850, color: 'var(--pp-blue)', marginTop: 4 }}>
                Balance: ₹{(receivingBill ? receivingBill.balance : receivingGroup.totalBalance).toLocaleString()}
              </div>
            </div>
            
            <div className="bill-form-group">
              <label className="bill-form-label">Amount Received (₹)</label>
              <input 
                type="number" 
                className="bill-form-input" 
                style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--pp-font-mono)' }}
                value={receiveAmount} 
                onChange={e => setReceiveAmount(Number(e.target.value))} 
              />
            </div>
            
            <div className="bill-form-group" style={{ marginTop: 16 }}>
              <label className="bill-form-label">Payment Mode</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                <button 
                  className={`bill-view-toggle-btn ${paymentMode === 'Cash' ? 'is-active' : ''}`} 
                  onClick={() => setPaymentMode('Cash')}
                  style={{ justifyContent: 'center', height: 40, borderRadius: 12, border: '1px solid var(--pp-warm-4)', fontSize: '0.8rem' }}
                >
                  <DollarSign size={14} /> Cash
                </button>
                <button 
                  className={`bill-view-toggle-btn ${paymentMode === 'UPI' ? 'is-active' : ''}`} 
                  onClick={() => setPaymentMode('UPI')}
                  style={{ justifyContent: 'center', height: 40, borderRadius: 12, border: '1px solid var(--pp-warm-4)', fontSize: '0.8rem' }}
                >
                  <CreditCard size={14} /> UPI
                </button>
                <button 
                  className={`bill-view-toggle-btn ${paymentMode === 'Card' ? 'is-active' : ''}`} 
                  onClick={() => setPaymentMode('Card')}
                  style={{ justifyContent: 'center', height: 40, borderRadius: 12, border: '1px solid var(--pp-warm-4)', fontSize: '0.8rem' }}
                >
                  <CreditCard size={14} /> Card
                </button>
                <button 
                  className={`bill-view-toggle-btn ${paymentMode === 'Online' ? 'is-active' : ''}`} 
                  onClick={() => setPaymentMode('Online')}
                  style={{ justifyContent: 'center', height: 40, borderRadius: 12, border: '1px solid var(--pp-warm-4)', fontSize: '0.8rem' }}
                >
                  <CreditCard size={14} /> Online
                </button>
              </div>
            </div>
            
            <button 
              className="bill-btn bill-btn-primary" 
              style={{ width: '100%', marginTop: 24, height: 48, borderRadius: 14, fontSize: '0.95rem' }}
              disabled={recordPayment.isPending}
              onClick={receivingBill ? handleReceivePayment : handleReceiveGroupPayment}
            >
              {recordPayment.isPending ? 'Saving...' : 'Confirm Payment'}
            </button>
          </div>
        )}
      </Drawer>

      {/* Print Options Side Drawer */}
      <Drawer
        isOpen={!!printingBill}
        onClose={() => setPrintingBill(null)}
        title="Print Options"
        maxWidth="450px"
      >
        {printingBill && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ padding: 20, background: 'var(--pp-blue-tint)', borderRadius: 20, border: '1px solid var(--pp-blue-border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--pp-blue)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>Selected Record</div>
              <div style={{ fontWeight: 850, fontSize: '1.1rem', color: 'var(--pp-ink)' }}>{printingBill.patientName}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--pp-text-3)', fontWeight: 600, marginTop: 4 }}>Bill No: #{printingBill.billNo} • Amount: ₹{printingBill.charges.toLocaleString()}</div>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {[
                { id: 'standard', label: 'Standard Receipt', sub: 'Professional bill with clinic branding' },
                { id: 'pharmacy', label: 'Pharmacy Layout', sub: 'Optimized for medicine and stock items' },
                { id: 'package', label: 'Package Invoice', sub: 'Summary of treatment plans and bundles' },
                { id: 'comprehensive', label: 'Full Statement', sub: 'Detailed clinical history and payments' },
              ].map(opt => (
                <button 
                  key={opt.id}
                  className="bill-print-option" 
                  style={{ 
                    padding: '18px', 
                    border: '1px solid var(--pp-warm-3)', 
                    borderRadius: 20, 
                    background: 'var(--bg-card)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 4,
                    transition: 'all 0.2s ease',
                    boxShadow: 'var(--pp-shadow-sm)'
                  }} 
                  onClick={() => handlePrint(opt.id)}
                >
                  <div style={{ fontWeight: 850, color: 'var(--pp-ink)', fontSize: '1rem' }}>{opt.label}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--pp-text-3)', fontWeight: 500 }}>{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </Drawer>
      {/* Billing Details Side Drawer */}
      <Drawer
        isOpen={!!selectedGroup}
        onClose={() => setSelectedGroup(null)}
        title="Patient Billing Details"
        maxWidth="600px"
      >
        {selectedGroup && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ padding: 20, background: 'var(--pp-blue-tint)', borderRadius: 20, border: '1px solid var(--pp-blue-border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--pp-blue)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>Daily Summary</div>
              <div style={{ fontWeight: 850, fontSize: '1.2rem', color: 'var(--pp-ink)' }}>{selectedGroup.patientName}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--pp-text-3)', fontWeight: 600, marginTop: 4 }}>
                {selectedGroup.billDate ? format(new Date(selectedGroup.billDate), 'dd MMM yyyy') : 'No Date'} • {selectedGroup.bills.length} Items
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 16 }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--pp-text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Charges Breakdown</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}><span style={{ color: 'var(--pp-text-3)' }}>Registration:</span> <span style={{ fontWeight: 600 }}>₹{selectedGroup.registrationCharge}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}><span style={{ color: 'var(--pp-text-3)' }}>Medicine Days:</span> <span style={{ fontWeight: 600 }}>₹{selectedGroup.medicineDaysCharge}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}><span style={{ color: 'var(--pp-text-3)' }}>Package Plan:</span> <span style={{ fontWeight: 600 }}>₹{selectedGroup.packageCharge}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}><span style={{ color: 'var(--pp-text-3)' }}>Additional:</span> <span style={{ fontWeight: 600 }}>₹{selectedGroup.additionalCharge}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--border-main)' }}><span style={{ color: 'var(--pp-ink)', fontWeight: 700 }}>Total Bill Amount:</span> <span style={{ fontWeight: 800, color: 'var(--pp-blue)' }}>₹{selectedGroup.totalCharges.toLocaleString()}</span></div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--pp-text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Received</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--pp-success-fg)', marginTop: 6 }}>₹{selectedGroup.totalReceived.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--pp-text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Balance</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: selectedGroup.totalBalance > 0 ? 'var(--pp-danger-fg)' : 'var(--pp-text-3)', marginTop: 6 }}>
                    {selectedGroup.totalBalance > 0 ? `₹${selectedGroup.totalBalance.toLocaleString()}` : '—'}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px dashed var(--pp-blue-border)' }}>
                {selectedGroup.totalBalance > 0 && (
                  <button 
                    className="bill-btn bill-btn-primary" 
                    style={{ flex: 1, height: 36, borderRadius: 10, fontSize: 12, fontWeight: 700 }}
                    onClick={() => { 
                      setReceivingGroup(selectedGroup); 
                      setReceiveAmount(selectedGroup.totalBalance); 
                    }}
                  >
                    Receive Total (₹{selectedGroup.totalBalance.toLocaleString()})
                  </button>
                )}
                <button 
                  className="bill-btn bill-btn-sm" 
                  style={{ flex: selectedGroup.totalBalance > 0 ? 'none' : 1, width: selectedGroup.totalBalance > 0 ? 'auto' : '100%', height: 36, padding: '0 16px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  onClick={() => {
                    if (myOrg) printGroupedBills(selectedGroup, myOrg);
                  }}
                >
                  <Printer size={14} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Print Consolidated Statement</span>
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--pp-ink)', marginBottom: 12 }}>Selected Date Invoices</div>
              <div style={{ display: 'grid', gap: 12 }}>
                {selectedGroup.bills.map((bill: any) => renderBillCard(bill, false))}
              </div>
              
              {pastBills.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--pp-ink)', marginBottom: 12, paddingTop: 16, borderTop: '1px solid var(--border-main)' }}>Past Invoices</div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {pastBills.map((bill: any) => renderBillCard(bill, true))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
