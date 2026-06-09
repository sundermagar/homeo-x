import React, { useMemo, useState } from 'react';
import { Drawer } from '@/shared/components/drawer';
import { format } from 'date-fns';
import { DollarSign, Printer, CreditCard, FileText } from 'lucide-react';
import { usePatientBills, useRecordPayment } from '../hooks/use-billing';
import { printGroupedBills } from '@/shared/utils/print';
import { useOrganizations } from '../../platform/hooks/use-organizations';
import { useAuthStore } from '@/shared/stores/auth-store';
import '../styles/billing.css';

interface Props {
  regid: number;
  patientName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PatientBillingDrawer({ regid, patientName, isOpen, onClose }: Props) {
  const { data: patientHistory } = usePatientBills(regid);
  const { data: orgs = [] } = useOrganizations();
  const user = useAuthStore(s => s.user);
  const myOrg = orgs.find(o => o.id === user?.contextId) || orgs[0];
  const recordPayment = useRecordPayment();

  const [receivingGroup, setReceivingGroup] = useState<any | null>(null);
  const [receiveAmount, setReceiveAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState('Cash');

  // Group bills by date
  const groups = useMemo(() => {
    if (!patientHistory?.bills) return [];
    const map = new Map<string, any>();
    for (const bill of patientHistory.bills) {
      const bDate = new Date((bill.billDate || bill.createdAt || new Date().toISOString()) as string);
      bDate.setHours(0, 0, 0, 0);
      const dateStr = format(bDate, 'yyyy-MM-dd');
      if (!map.has(dateStr)) {
        map.set(dateStr, {
          patientName: (bill as any).patientName,
          regid: bill.regid,
          billDate: dateStr,
          totalCharges: 0,
          totalReceived: 0,
          totalBalance: 0,
          consultationCharge: 0,
          medicineCharge: 0,
          registrationCharge: 0,
          packageCharge: 0,
          additionalCharge: 0,
          bills: []
        });
      }
      const group = map.get(dateStr)!;
      group.bills.push(bill);
      const chargeAmount = bill.charges || 0;
      group.totalCharges += chargeAmount;
      group.totalReceived += bill.received || 0;
      group.totalBalance += bill.balance || 0;

      const billType = bill.billType as string | undefined;
      const description = ((bill.customTitle || bill.treatment || bill.billType) as string || '').toLowerCase();
      const isAdditional = billType === 'Additional';
      const isPackage = bill.treatment?.startsWith('Package:');
      const isRegistration = billType === 'Registration';
      const isMedicine = description.includes('medicine');
      const isConsultation = billType === 'Consultation' && !isMedicine;

      if (isMedicine && !isPackage) {
        group.medicineCharge += chargeAmount;
      } else if (isAdditional) {
        group.additionalCharge += chargeAmount;
      } else if (isPackage) {
        group.packageCharge += chargeAmount;
      } else if (isRegistration) {
        group.registrationCharge += chargeAmount;
      } else if (isConsultation) {
        group.consultationCharge += chargeAmount;
      } else if (billType !== 'Custom') {
        group.registrationCharge += chargeAmount;
      }
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime());
  }, [patientHistory]);

  const latestGroup = groups.length > 0 ? groups[0] : null;
  const pastBillGroups = groups.length > 1 ? groups.slice(1) : [];

  const handleReceiveGroupPayment = async () => {
    if (!receivingGroup || receiveAmount <= 0) return;
    try {
      let remaining = receiveAmount;
      const splitPayments = [];
      for (const bill of receivingGroup.bills) {
        if (remaining <= 0) break;
        if (bill.balance > 0) {
          const payAmt = Math.min(bill.balance, remaining);
          splitPayments.push({
            billId: bill.id,
            amount: payAmt,
            paymentMode: paymentMode,
          });
          remaining -= payAmt;
        }
      }

      if (splitPayments.length > 0) {
        await recordPayment.mutateAsync({
          regid: receivingGroup.regid,
          splitPayments: splitPayments,
          paymentMode: paymentMode,
        });
      }

      setReceivingGroup(null);
      setReceiveAmount(0);
    } catch (err) {
      console.error(err);
      alert('Failed to record payment');
    }
  };

  const renderPastGroupCard = (group: any) => {
    const isPaid = group.totalBalance === 0;
    return (
      <div key={group.billDate} style={{ padding: '10px', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--pp-ink)' }}>{format(new Date(group.billDate), 'dd MMM yyyy')}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--pp-text-3)', fontWeight: 600, marginTop: 1 }}>{group.bills.length} Invoice Item{group.bills.length !== 1 ? 's' : ''}</div>
          </div>
          {isPaid ? <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--pp-success-fg)', background: 'var(--pp-success-bg)', padding: '2px 8px', borderRadius: 12 }}>PAID</span> : <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--pp-danger-fg)', background: 'var(--pp-danger-bg)', padding: '2px 8px', borderRadius: 12 }}>UNPAID</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
          <div style={{ background: 'var(--bg-surface-2)', padding: '5px 7px', borderRadius: 8 }}>
            <div style={{ fontSize: '0.56rem', color: 'var(--pp-text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Billed</div>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--pp-blue)', fontFamily: 'var(--pp-font-mono)' }}>₹{group.totalCharges.toLocaleString()}</div>
          </div>
          <div style={{ background: 'var(--bg-surface-2)', padding: '6px 8px', borderRadius: 8 }}>
            <div style={{ fontSize: '0.56rem', color: 'var(--pp-text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Received</div>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--pp-success-fg)', fontFamily: 'var(--pp-font-mono)' }}>₹{group.totalReceived.toLocaleString()}</div>
          </div>
          <div style={{ background: group.totalBalance > 0 ? 'var(--pp-danger-bg)' : 'var(--bg-surface-2)', padding: '6px 8px', borderRadius: 8 }}>
            <div style={{ fontSize: '0.56rem', color: group.totalBalance > 0 ? 'var(--pp-danger-fg)' : 'var(--pp-text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Balance</div>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: group.totalBalance > 0 ? 'var(--pp-danger-fg)' : 'var(--pp-text-3)', fontFamily: 'var(--pp-font-mono)' }}>₹{group.totalBalance.toLocaleString()}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
          {[
            { label: 'Consultation Fee', val: group.consultationCharge, color: 'var(--pp-blue)' },
            { label: 'Medicine', val: group.medicineCharge, color: 'var(--pp-warning-fg)' },
            { label: 'Registration Fee', val: group.registrationCharge, color: 'var(--pp-teal)' },
            { label: 'Package Treatment Plans', val: group.packageCharge, color: 'var(--pp-success-fg)' },
            { label: 'Additional Charges / Services', val: group.additionalCharge, color: 'var(--pp-purple)' }
          ].map((item, idx) => {
            if (item.val === 0 && idx > 0) return null;
            return (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color }} /><span style={{ color: 'var(--pp-text-2)', fontWeight: 600 }}>{item.label}</span></div>
                <span style={{ fontWeight: 700, color: 'var(--pp-ink)', fontFamily: 'var(--pp-font-mono)' }}>₹{item.val.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, paddingTop: 8, borderTop: '1px dashed var(--pp-warm-3)' }}>
          {group.totalBalance > 0 && (
            <button className="bill-btn bill-btn-primary" style={{ flex: 1, height: 30, borderRadius: 8, fontSize: '0.72rem' }} onClick={() => { setReceivingGroup(group); setReceiveAmount(group.totalBalance); }}>
              Receive ₹{group.totalBalance.toLocaleString()}
            </button>
          )}
          <button className="bill-btn" style={{ flex: group.totalBalance > 0 ? 'none' : 1, width: group.totalBalance > 0 ? 'auto' : '100%', height: 30, borderRadius: 8, fontSize: '0.72rem', border: '1px solid var(--pp-warm-3)' }} onClick={() => { if (myOrg) printGroupedBills(group, myOrg); }}>
            <Printer size={12} /> Print
          </button>
        </div>
      </div>
    );
  };

  const cleanName = patientName
    ? patientName.trim().replace(/,\s*$/, '').replace(/\b\w/g, (c: string) => c.toUpperCase())
    : '—';

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} title="Patient Billing Details" maxWidth="600px">
        {latestGroup ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Daily Summary Main Card */}
            <div style={{ padding: '14px 12px', background: 'linear-gradient(135deg, var(--pp-blue-tint) 0%, rgba(37, 99, 235, 0.05) 100%)', borderRadius: 20, border: '1px solid var(--pp-blue-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>
                <div style={{ fontSize: '0.64rem', color: 'var(--pp-blue)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.08em' }}>Daily Summary</div>
                <div style={{ fontWeight: 850, fontSize: '1.05rem', color: 'var(--pp-ink)', letterSpacing: '-0.01em' }}>{cleanName}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--pp-text-3)', fontWeight: 600, marginTop: 1 }}>
                  {latestGroup.billDate ? format(new Date(latestGroup.billDate), 'dd MMM yyyy') : 'No Date'} • {latestGroup.bills.length} Invoice Item{latestGroup.bills.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* KPI Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--pp-warm-3)', borderRadius: 14, padding: '5px 7px', boxShadow: 'var(--pp-shadow-sm)', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: '0.56rem', color: 'var(--pp-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Billed</span>
                  <span style={{ fontSize: '1rem', fontWeight: 850, color: 'var(--pp-blue)', fontFamily: 'var(--pp-font-mono)' }}>₹{latestGroup.totalCharges.toLocaleString()}</span>
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--pp-warm-3)', borderRadius: 14, padding: '6px 8px', boxShadow: 'var(--pp-shadow-sm)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--pp-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Received</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 850, color: 'var(--pp-success-fg)', fontFamily: 'var(--pp-font-mono)' }}>₹{latestGroup.totalReceived.toLocaleString()}</span>
                </div>
                <div style={{ background: latestGroup.totalBalance > 0 ? 'var(--pp-danger-bg)' : 'var(--bg-card)', border: latestGroup.totalBalance > 0 ? '1px solid var(--pp-danger-border)' : '1px solid var(--pp-warm-3)', borderRadius: 14, padding: '6px 8px', boxShadow: 'var(--pp-shadow-sm)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: '0.65rem', color: latestGroup.totalBalance > 0 ? 'var(--pp-danger-fg)' : 'var(--pp-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Balance</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 850, color: latestGroup.totalBalance > 0 ? 'var(--pp-danger-fg)' : 'var(--pp-text-3)', fontFamily: 'var(--pp-font-mono)' }}>
                    {latestGroup.totalBalance > 0 ? `₹${latestGroup.totalBalance.toLocaleString()}` : '₹0'}
                  </span>
                </div>
              </div>

              {/* Charges Breakdown panel */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--pp-warm-3)', borderRadius: 14, padding: 10, boxShadow: 'var(--pp-shadow-sm)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--pp-text-3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--pp-warm-2)', paddingBottom: 6 }}>Itemized Charges Breakdown</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: 'Consultation Fee', val: latestGroup.consultationCharge, color: 'var(--pp-blue)' },
                    { label: 'Medicine', val: latestGroup.medicineCharge, color: 'var(--pp-warning-fg)' },
                    { label: 'Registration Fee', val: latestGroup.registrationCharge, color: 'var(--pp-teal)' },
                    { label: 'Package Treatment Plans', val: latestGroup.packageCharge, color: 'var(--pp-success-fg)' },
                    { label: 'Additional Charges / Services', val: latestGroup.additionalCharge, color: 'var(--pp-purple)' }
                  ].map((item, idx) => {
                    if (item.val === 0 && idx > 0) return null;
                    return (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} /><span style={{ color: 'var(--pp-text-2)', fontWeight: 600 }}>{item.label}</span></div>
                        <span style={{ fontWeight: 750, color: 'var(--pp-ink)', fontFamily: 'var(--pp-font-mono)' }}>₹{item.val.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions Button Row */}
              <div style={{ display: 'flex', gap: 5, borderTop: '1px dashed var(--pp-blue-border)', paddingTop: 6 }}>
                {latestGroup.totalBalance > 0 && (
                  <button className="bill-btn bill-btn-primary" style={{ flex: 1, height: 30, borderRadius: 12, fontSize: '0.74rem', fontWeight: 750, gap: 4 }} onClick={() => { setReceivingGroup(latestGroup); setReceiveAmount(latestGroup.totalBalance); }}>
                    <DollarSign size={14} /> Receive Total (₹{latestGroup.totalBalance.toLocaleString()})
                  </button>
                )}
                <button className="bill-btn" style={{ flex: latestGroup.totalBalance > 0 ? 'none' : 1, width: latestGroup.totalBalance > 0 ? 'auto' : '100%', height: 30, padding: '0 12px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '0.76rem', fontWeight: 750, color: 'var(--pp-ink)' }} onClick={() => { if (myOrg) printGroupedBills(latestGroup, myOrg); }}>
                  <Printer size={14} /> <span>Print Bill</span>
                </button>
              </div>
            </div>

            {pastBillGroups.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--pp-ink)', marginBottom: 6 }}>Past Invoices</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {pastBillGroups.map((group: any) => renderPastGroupCard(group))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--pp-text-3)' }}>No billing records found.</div>
        )}
      </Drawer>

      {/* Receive Payment Side Drawer */}
      <Drawer isOpen={!!receivingGroup} onClose={() => setReceivingGroup(null)} title="Consolidated Payment" maxWidth="400px">
        {receivingGroup && (
          <div className="bill-form">
            <div style={{ marginBottom: 16, padding: 16, background: 'var(--bg-surface-2)', borderRadius: 16 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--pp-text-3)', fontWeight: 700 }}>All Unpaid Invoices • {receivingGroup.patientName}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 850, color: 'var(--pp-blue)', marginTop: 4 }}>Balance: ₹{receivingGroup.totalBalance.toLocaleString()}</div>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  className={`bill-view-toggle-btn ${paymentMode === 'Cash' ? 'is-active' : ''}`}
                  onClick={() => setPaymentMode('Cash')}
                  style={{ flex: '1 1 30%', justifyContent: 'center', height: 40, borderRadius: 12, border: '1px solid var(--pp-warm-4)', fontSize: '0.8rem' }}
                >
                  <DollarSign size={14} /> Cash
                </button>
                <button
                  className={`bill-view-toggle-btn ${paymentMode === 'UPI' ? 'is-active' : ''}`}
                  onClick={() => setPaymentMode('UPI')}
                  style={{ flex: '1 1 30%', justifyContent: 'center', height: 40, borderRadius: 12, border: '1px solid var(--pp-warm-4)', fontSize: '0.8rem' }}
                >
                  <CreditCard size={14} /> UPI
                </button>
                <button
                  className={`bill-view-toggle-btn ${paymentMode === 'Card' ? 'is-active' : ''}`}
                  onClick={() => setPaymentMode('Card')}
                  style={{ flex: '1 1 30%', justifyContent: 'center', height: 40, borderRadius: 12, border: '1px solid var(--pp-warm-4)', fontSize: '0.8rem' }}
                >
                  <CreditCard size={14} /> Card
                </button>
                <button
                  className={`bill-view-toggle-btn ${paymentMode === 'Online' ? 'is-active' : ''}`}
                  onClick={() => setPaymentMode('Online')}
                  style={{ flex: '1 1 30%', justifyContent: 'center', height: 40, borderRadius: 12, border: '1px solid var(--pp-warm-4)', fontSize: '0.8rem' }}
                >
                  <CreditCard size={14} /> Online
                </button>
                <button
                  className={`bill-view-toggle-btn ${paymentMode === 'Cheque' ? 'is-active' : ''}`}
                  onClick={() => setPaymentMode('Cheque')}
                  style={{ flex: '1 1 30%', justifyContent: 'center', height: 40, borderRadius: 12, border: '1px solid var(--pp-warm-4)', fontSize: '0.8rem' }}
                >
                  <FileText size={14} /> Cheque
                </button>
              </div>
            </div>
            <button
              className="bill-btn bill-btn-primary"
              style={{ width: '100%', marginTop: 24, height: 48, borderRadius: 14, fontSize: '0.95rem' }}
              onClick={handleReceiveGroupPayment}
              disabled={recordPayment.isPending || receiveAmount <= 0}
            >
              Confirm Payment (₹{receiveAmount})
            </button>
          </div>
        )}
      </Drawer>
    </>
  );
}
