import type { BillWithPatient } from '@mmc/types';
import { format } from 'date-fns';
import { RefreshCw, Receipt, Printer, X, DollarSign, CreditCard, ChevronRight, ChevronDown, Trash2, MoreHorizontal, Eye } from 'lucide-react';
import { printBill, printGroupedBills } from '@/shared/utils/print';
import { useOrganizations } from '../../platform/hooks/use-organizations';
import { useAuthStore } from '@/shared/stores/auth-store';
import { useState, useMemo, Fragment } from 'react';
import { useRecordPayment, usePatientBills, useUpdateCharges, useDeleteBill } from '../hooks/use-billing';
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

  const [activeDropdownRegId, setActiveDropdownRegId] = useState<number | null>(null);
  const deleteBill = useDeleteBill();

  const handleDeleteGroup = async (billsList: any[]) => {
    if (window.confirm(`Are you sure you want to delete this billing group? This will delete all ${billsList.length} invoice(s) under this group.`)) {
      try {
        for (const b of billsList) {
          await deleteBill.mutateAsync(b.id);
        }
        alert('Billing group deleted successfully.');
      } catch (err) {
        console.error(err);
        alert('Failed to delete billing group.');
      }
    }
  };

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
      if ((bill.billType as string) === 'Additional') {
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
  const pastBillGroups = useMemo(() => {
    if (!patientHistory?.bills || !selectedGroup?.billDate) return [];
    const selectedDate = new Date(selectedGroup.billDate);
    selectedDate.setHours(0, 0, 0, 0); // Normalize time

    const map = new Map<string, any>();

    for (const bill of patientHistory.bills) {
      if (todayBillIds.has(bill.id)) continue;
      const bDate = new Date((bill.billDate || bill.createdAt || new Date().toISOString()) as string);
      bDate.setHours(0, 0, 0, 0);
      if (bDate.getTime() >= selectedDate.getTime()) continue;

      const dateStr = bDate.toISOString().split('T')[0]!;
      if (!map.has(dateStr)) {
        map.set(dateStr, {
          patientName: (bill as any).patientName,
          regid: bill.regid,
          billDate: dateStr,
          totalCharges: 0,
          totalReceived: 0,
          totalBalance: 0,
          registrationCharge: 0,
          medicineDaysCharge: 0,
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

      if ((bill.billType as string) === 'Additional') {
        group.additionalCharge += chargeAmount;
      } else if (bill.treatment?.startsWith('Package:')) {
        group.packageCharge += chargeAmount;
      } else if (bill.billType === 'Registration') {
        group.registrationCharge += chargeAmount;
      } else if (bill.billType === 'Consultation') {
        group.medicineDaysCharge += chargeAmount;
      } else if (bill.billType !== 'Custom') {
        group.registrationCharge += chargeAmount;
      }
    }

    return Array.from(map.values()).sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime());
  }, [patientHistory, selectedGroup, todayBillIds]);

  const renderPastGroupCard = (group: any) => {
    const isPaid = group.totalBalance === 0;

    return (
      <div key={group.billDate} style={{
        padding: '16px',
        background: 'var(--bg-card)',
        borderRadius: 16,
        border: '1px solid var(--border-main)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--pp-ink)' }}>
              {format(new Date(group.billDate), 'dd MMM yyyy')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--pp-text-3)', fontWeight: 600, marginTop: 2 }}>
              {group.bills.length} Invoice Item{group.bills.length !== 1 ? 's' : ''}
            </div>
          </div>

          {isPaid ? (
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--pp-success-fg)', background: 'var(--pp-success-bg)', padding: '2px 8px', borderRadius: 12 }}>PAID</span>
          ) : (
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--pp-danger-fg)', background: 'var(--pp-danger-bg)', padding: '2px 8px', borderRadius: 12 }}>UNPAID</span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div style={{ background: 'var(--bg-surface-2)', padding: '8px 10px', borderRadius: 8 }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--pp-text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Billed</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--pp-blue)', fontFamily: 'var(--pp-font-mono)' }}>₹{group.totalCharges.toLocaleString()}</div>
          </div>
          <div style={{ background: 'var(--bg-surface-2)', padding: '8px 10px', borderRadius: 8 }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--pp-text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Received</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--pp-success-fg)', fontFamily: 'var(--pp-font-mono)' }}>₹{group.totalReceived.toLocaleString()}</div>
          </div>
          <div style={{ background: group.totalBalance > 0 ? 'var(--pp-danger-bg)' : 'var(--bg-surface-2)', padding: '8px 10px', borderRadius: 8 }}>
            <div style={{ fontSize: '0.6rem', color: group.totalBalance > 0 ? 'var(--pp-danger-fg)' : 'var(--pp-text-3)', fontWeight: 700, textTransform: 'uppercase' }}>Balance</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: group.totalBalance > 0 ? 'var(--pp-danger-fg)' : 'var(--pp-text-3)', fontFamily: 'var(--pp-font-mono)' }}>₹{group.totalBalance.toLocaleString()}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          {[
            { label: 'Registration Fee', val: group.registrationCharge, color: 'var(--pp-blue)' },
            { label: 'Medicine & Consultation', val: group.medicineDaysCharge, color: 'var(--pp-warning-fg)' },
            { label: 'Package Treatment Plans', val: group.packageCharge, color: 'var(--pp-success-fg)' },
            { label: 'Additional Charges / Services', val: group.additionalCharge, color: 'var(--pp-purple)' }
          ].map((item, idx) => {
            if (item.val === 0 && idx > 0) return null;
            return (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color }} />
                  <span style={{ color: 'var(--pp-text-2)', fontWeight: 600 }}>{item.label}</span>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--pp-ink)', fontFamily: 'var(--pp-font-mono)' }}>₹{item.val.toLocaleString()}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 12, borderTop: '1px dashed var(--pp-warm-3)' }}>
          {group.totalBalance > 0 && (
            <button
              className="bill-btn bill-btn-primary"
              style={{ flex: 1, height: 32, borderRadius: 8, fontSize: '0.75rem' }}
              onClick={() => { setReceivingGroup(group); setReceiveAmount(group.totalBalance); }}
            >
              Receive ₹{group.totalBalance.toLocaleString()}
            </button>
          )}
          <button
            className="bill-btn"
            style={{ flex: group.totalBalance > 0 ? 'none' : 1, width: group.totalBalance > 0 ? 'auto' : '100%', height: 32, borderRadius: 8, fontSize: '0.75rem', border: '1px solid var(--pp-warm-3)' }}
            onClick={() => { if (myOrg) printGroupedBills(group, myOrg); }}
          >
            <Printer size={12} /> Print
          </button>
        </div>
      </div>
    );
  };

  const renderBillCard = (bill: any, isPast: boolean = false) => {
    const showPeriod = bill.fromDate || bill.toDate;
    const isPaid = bill.balance === 0;

    // Premium Left Border Color based on treatment / billType
    let accentColor = 'var(--pp-blue)';
    const t = bill.treatment || bill.billType || 'Consultation';
    const treatmentLabel = t === 'Consultation' ? 'Medicine Charge' : t;

    if (bill.billType === 'Additional') {
      accentColor = 'var(--pp-purple)';
    } else if (bill.treatment?.startsWith('Package:')) {
      accentColor = 'var(--pp-success-fg)';
    } else if (bill.billType === 'Registration') {
      accentColor = 'var(--pp-blue)';
    } else if (bill.billType === 'Consultation') {
      accentColor = 'var(--pp-warning-fg)';
    }

    return (
      <div
        key={bill.id}
        style={{
          padding: '16px 20px',
          border: '1px solid var(--pp-warm-3)',
          borderLeft: `5px solid ${accentColor}`,
          borderRadius: 16,
          background: 'var(--bg-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          boxShadow: 'var(--pp-shadow-sm)',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--pp-ink)' }}>
                {treatmentLabel}
              </span>
              <span className={`bill-badge ${isPaid ? 'bill-badge-success' : 'bill-badge-danger'}`} style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                {isPaid ? 'Paid' : 'Unpaid'}
              </span>
            </div>

            {showPeriod && (
              <div style={{ fontSize: '0.78rem', color: 'var(--pp-blue)', fontWeight: 650, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ background: 'var(--pp-blue-tint)', padding: '2px 6px', borderRadius: 4 }}>
                  Period: {bill.fromDate ? format(new Date(bill.fromDate), 'dd-MM-yyyy') : ''} → {bill.toDate ? format(new Date(bill.toDate), 'dd-MM-yyyy') : ''}
                </span>
              </div>
            )}

            <div style={{ fontSize: '0.75rem', color: 'var(--pp-text-3)', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Bill #{bill.billNo}</span>
              <span style={{ color: 'var(--pp-warm-4)' }}>•</span>
              <span>{isPast && bill.billDate ? format(new Date(bill.billDate), 'dd MMM yyyy') + ' • ' : ''}{bill.paymentMode ?? 'No Payment'}</span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1rem', fontWeight: 850, color: 'var(--pp-ink)', fontFamily: 'var(--pp-font-mono)' }}>
              ₹{bill.charges.toLocaleString()}
            </div>
            {!isPaid && (
              <div style={{ fontSize: '0.72rem', color: 'var(--pp-danger-fg)', fontWeight: 700, marginTop: 4, background: 'var(--pp-danger-bg)', padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>
                Owes ₹{bill.balance.toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--pp-warm-2)', paddingTop: 10, marginTop: 2 }}>
          <button
            className="bill-btn bill-btn-sm"
            style={{
              height: 28,
              padding: '0 12px',
              borderRadius: 8,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-main)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              color: 'var(--pp-ink)',
              fontSize: '0.75rem',
              fontWeight: 650,
              transition: 'all 0.2s ease'
            }}
            onClick={() => setPrintingBill(bill)}
          >
            <Printer size={12} />
            Print Bill
          </button>
        </div>
      </div>
    );
  };

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
      <div className="appt-card fade-in">
        <div className="pp-table-scroll">
          <table className="pp-table">
            <thead>
              <tr>
                <th>Bill #</th>
                <th>Date</th>
                <th>Patient</th>
                <th>Mode</th>
                <th>Charges Breakdown</th>
                <th>Total</th>
                <th>Received</th>
                <th>Balance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {groupedBills.map((group) => {
                const isExpanded = selectedGroup?.regid === group.regid;
                return (
                  <Fragment key={`group-${group.regid}`}>
                    <tr onClick={() => setSelectedGroup(group)} style={{ cursor: 'pointer', background: isExpanded ? 'var(--bg-surface-2)' : undefined }}>
                      <td data-label="Bill #">
                        <span className="appt-cell-id">{group.bills.length}</span>
                        <div className="appt-cell-phone">Item{group.bills.length !== 1 ? 's' : ''}</div>
                      </td>
                      <td data-label="Date">
                        <div className="appt-cell-name">{group.billDate ? format(new Date(group.billDate), 'dd-MM-yyyy') : '—'}</div>
                      </td>
                      <td data-label="Patient">
                        <div className="appt-cell-name">{group.patientName ? group.patientName.replace(/\b\w/g, c => c.toUpperCase()) : '—'}</div>
                      </td>
                      <td data-label="Mode">
                        {Array.from(group.paymentModes).map(mode => (
                          <span key={mode} className={`bill-badge ${mode === 'Online' ? 'bill-badge-primary' : 'bill-badge-default'}`}>
                            {mode}
                          </span>
                        ))}
                        {group.paymentModes.size === 0 && <span className="appt-cell-slash">—</span>}
                      </td>
                      <td data-label="Charges Breakdown">
                        <div className="appt-cell-phone" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <span>Reg: <strong>₹{group.registrationCharge}</strong></span>
                          <span>Med: <strong>₹{group.medicineDaysCharge}</strong></span>
                          {group.packageCharge > 0 && <span>Pkg: <strong>₹{group.packageCharge}</strong></span>}
                          {group.additionalCharge > 0 && <span>Add: <strong>₹{group.additionalCharge}</strong></span>}
                        </div>
                      </td>
                      <td data-label="Total">
                        <span className="appt-cell-name" style={{ color: 'var(--pp-blue)', fontFamily: 'var(--pp-font-mono)' }}>₹{group.totalCharges.toLocaleString()}</span>
                      </td>
                      <td data-label="Received">
                        <span className="appt-cell-name" style={{ color: 'var(--pp-success-fg)', fontFamily: 'var(--pp-font-mono)' }}>₹{group.totalReceived.toLocaleString()}</span>
                      </td>
                      <td data-label="Balance">
                        <span className="appt-cell-name" style={{ color: group.totalBalance > 0 ? 'var(--pp-danger-fg)' : 'var(--pp-text-3)', fontFamily: 'var(--pp-font-mono)' }}>
                          {group.totalBalance > 0 ? `₹${group.totalBalance.toLocaleString()}` : '—'}
                        </span>
                      </td>
                      <td data-label="Action" onClick={(e) => e.stopPropagation()}>
                        <div className="appt-kebab-wrap" style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            className="appt-kebab-btn"
                            style={{ color: 'var(--pp-blue)' }}
                            onClick={() => setSelectedGroup(group)}
                            title="View Details"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="appt-kebab-btn"
                            style={{ color: 'var(--pp-danger-fg)' }}
                            onClick={() => handleDeleteGroup(group.bills)}
                            title="Delete Group"
                          >
                            <Trash2 size={15} />
                          </button>
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
        {selectedGroup && (() => {
          const cleanName = selectedGroup.patientName
            ? selectedGroup.patientName.trim().replace(/,\s*$/, '').replace(/\b\w/g, (c: string) => c.toUpperCase())
            : '—';

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Daily Summary Main Card */}
              <div style={{
                padding: '24px 20px',
                background: 'linear-gradient(135deg, var(--pp-blue-tint) 0%, rgba(37, 99, 235, 0.05) 100%)',
                borderRadius: 24,
                border: '1px solid var(--pp-blue-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--pp-blue)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.08em' }}>Daily Summary</div>
                  <div style={{ fontWeight: 850, fontSize: '1.35rem', color: 'var(--pp-ink)', letterSpacing: '-0.01em' }}>{cleanName}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--pp-text-3)', fontWeight: 600, marginTop: 4 }}>
                    {selectedGroup.billDate ? format(new Date(selectedGroup.billDate), 'dd MMM yyyy') : 'No Date'} • {selectedGroup.bills.length} Invoice Item{selectedGroup.bills.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* KPI Metrics Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {/* Total Bill Card */}
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--pp-warm-3)',
                    borderRadius: 16,
                    padding: '12px 14px',
                    boxShadow: 'var(--pp-shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--pp-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Billed</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 850, color: 'var(--pp-blue)', fontFamily: 'var(--pp-font-mono)' }}>₹{selectedGroup.totalCharges.toLocaleString()}</span>
                  </div>

                  {/* Received Card */}
                  <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--pp-warm-3)',
                    borderRadius: 16,
                    padding: '12px 14px',
                    boxShadow: 'var(--pp-shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--pp-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Received</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 850, color: 'var(--pp-success-fg)', fontFamily: 'var(--pp-font-mono)' }}>₹{selectedGroup.totalReceived.toLocaleString()}</span>
                  </div>

                  {/* Balance Card */}
                  <div style={{
                    background: selectedGroup.totalBalance > 0 ? 'var(--pp-danger-bg)' : 'var(--bg-card)',
                    border: selectedGroup.totalBalance > 0 ? '1px solid var(--pp-danger-border)' : '1px solid var(--pp-warm-3)',
                    borderRadius: 16,
                    padding: '12px 14px',
                    boxShadow: 'var(--pp-shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}>
                    <span style={{ fontSize: '0.65rem', color: selectedGroup.totalBalance > 0 ? 'var(--pp-danger-fg)' : 'var(--pp-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Balance</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 850, color: selectedGroup.totalBalance > 0 ? 'var(--pp-danger-fg)' : 'var(--pp-text-3)', fontFamily: 'var(--pp-font-mono)' }}>
                      {selectedGroup.totalBalance > 0 ? `₹${selectedGroup.totalBalance.toLocaleString()}` : '₹0'}
                    </span>
                  </div>
                </div>

                {/* Charges Breakdown panel */}
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--pp-warm-3)',
                  borderRadius: 16,
                  padding: 16,
                  boxShadow: 'var(--pp-shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--pp-text-3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--pp-warm-2)', paddingBottom: 8 }}>Itemized Charges Breakdown</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Registration Fee', val: selectedGroup.registrationCharge, color: 'var(--pp-blue)' },
                      { label: 'Medicine & Consultation', val: selectedGroup.medicineDaysCharge, color: 'var(--pp-warning-fg)' },
                      { label: 'Package Treatment Plans', val: selectedGroup.packageCharge, color: 'var(--pp-success-fg)' },
                      { label: 'Additional Charges / Services', val: selectedGroup.additionalCharge, color: 'var(--pp-purple)' }
                    ].map((item, idx) => {
                      // show registration by default or any other items with positive values
                      if (item.val === 0 && idx > 0) return null;
                      return (
                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                            <span style={{ color: 'var(--pp-text-2)', fontWeight: 600 }}>{item.label}</span>
                          </div>
                          <span style={{ fontWeight: 750, color: 'var(--pp-ink)', fontFamily: 'var(--pp-font-mono)' }}>₹{item.val.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions Button Row */}
                <div style={{ display: 'flex', gap: 10, borderTop: '1px dashed var(--pp-blue-border)', paddingTop: 16 }}>
                  {selectedGroup.totalBalance > 0 && (
                    <button
                      className="bill-btn bill-btn-primary"
                      style={{
                        flex: 1,
                        height: 40,
                        borderRadius: 12,
                        fontSize: '0.82rem',
                        fontWeight: 750,
                        gap: 6
                      }}
                      onClick={() => {
                        setReceivingGroup(selectedGroup);
                        setReceiveAmount(selectedGroup.totalBalance);
                      }}
                    >
                      <DollarSign size={14} />
                      Receive Total (₹{selectedGroup.totalBalance.toLocaleString()})
                    </button>
                  )}
                  <button
                    className="bill-btn"
                    style={{
                      flex: selectedGroup.totalBalance > 0 ? 'none' : 1,
                      width: selectedGroup.totalBalance > 0 ? 'auto' : '100%',
                      height: 40,
                      padding: '0 16px',
                      borderRadius: 12,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-main)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      fontSize: '0.82rem',
                      fontWeight: 750,
                      color: 'var(--pp-ink)'
                    }}
                    onClick={() => {
                      if (myOrg) printGroupedBills(selectedGroup, myOrg);
                    }}
                  >
                    <Printer size={14} />
                    <span>Print Bill</span>
                  </button>
                </div>
              </div>

              <div>

                {pastBillGroups.length > 0 && (
                  <div style={{ marginTop: 32 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--pp-ink)', marginBottom: 12 }}>Past Invoices</div>
                    <div style={{ display: 'grid', gap: 12 }}>
                      {pastBillGroups.map((group: any) => renderPastGroupCard(group))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Drawer>
    </>
  );
}
