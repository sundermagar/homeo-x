import type { BillWithPatient } from '@mmc/types';
import { format } from 'date-fns';
import { RefreshCw, Receipt, Printer, X } from 'lucide-react';
import { printBill } from '@/shared/utils/print';
import { useOrganizations } from '../../platform/hooks/use-organizations';
import { useAuthStore } from '@/shared/stores/auth-store';
import { useState } from 'react';

interface BillingTableProps {
  bills: BillWithPatient[];
  isLoading: boolean;
}

export function BillingTable({ bills, isLoading }: BillingTableProps) {
  const { data: orgs = [] } = useOrganizations();
  const user = useAuthStore(s => s.user);
  const myOrg = orgs.find(o => o.id === user?.contextId) || orgs[0];
  
  const [printingBill, setPrintingBill] = useState<BillWithPatient | null>(null);

  if (isLoading) {
    return (
      <div className="bill-empty">
        <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <div className="bill-card fade-in">
        <div className="bill-empty">
          <Receipt size={28} className="bill-empty-icon" />
          <p className="bill-empty-text">No billing records found for this date.</p>
        </div>
      </div>
    );
  }

  const handlePrint = (template: any) => {
    if (myOrg && printingBill) {
      printBill(printingBill, myOrg, { template });
      setPrintingBill(null);
    }
  };

  return (
    <>
      <div className="bill-card fade-in">
        <div className="bill-table-container">
          <table className="bill-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>S.No</th>
                <th style={{ width: '80px' }}>Bill #</th>
                <th style={{ width: '110px' }}>Date</th>
                <th>Patient</th>
                <th style={{ width: '90px' }}>Mode</th>
                <th style={{ width: '100px' }}>Charges</th>
                <th style={{ width: '100px' }}>Received</th>
                <th style={{ width: '100px' }}>Balance</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill, index) => (
                <tr key={bill.id}>
                  <td data-label="S.No" style={{ color: 'var(--pp-text-3)', fontSize: '0.75rem', fontWeight: 600 }}>{index + 1}</td>
                  <td data-label="Bill #" style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 700, color: 'var(--pp-ink)' }}>#{bill.billNo}</td>
                  <td data-label="Date" style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.78rem', color: 'var(--pp-text-3)' }}>
                    {bill.billDate ? format(new Date(bill.billDate), 'dd-MM-yyyy') : '—'}
                  </td>
                  <td data-label="Patient" style={{ fontWeight: 600, color: 'var(--pp-ink)' }}>{bill.patientName}</td>
                  <td data-label="Mode">
                    <span
                      className={`bill-badge ${bill.paymentMode === 'Online' ? 'bill-badge-primary' : 'bill-badge-default'}`}
                      style={{ padding: '2px 8px', fontSize: '10px' }}
                    >
                      {bill.paymentMode ?? '—'}
                    </span>
                  </td>
                  <td data-label="Charges" style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 700, color: 'var(--pp-blue)' }}>
                    ₹{bill.charges.toLocaleString()}
                  </td>
                  <td data-label="Received" style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 700, color: 'var(--pp-blue)' }}>
                    ₹{bill.received.toLocaleString()}
                  </td>
                  <td data-label="Balance" style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 700, color: 'var(--pp-blue)' }}>
                    {bill.balance > 0 ? `₹${bill.balance.toLocaleString()}` : '—'}
                  </td>
                  <td data-label="" style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button 
                        className="bill-btn bill-btn-sm" 
                        style={{ height: 28, padding: '0 12px', borderRadius: 6, background: 'var(--bg-surface-2)', border: '1px solid var(--border-main)', display: 'flex', alignItems: 'center', gap: 6 }}
                        onClick={() => setPrintingBill(bill)}
                      >
                        <Printer size={13} />
                        <span style={{ fontSize: 11, fontWeight: 700 }}>Print</span>
                      </button>

                      <button 
                        className="bill-btn bill-btn-sm" 
                        style={{ color: 'var(--pp-blue)', border: 'none', background: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
                        onClick={() => window.location.href = `/patients/${bill.regid}`}
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Template Selection Modal */}
      {printingBill && (
        <div className="bill-modal-overlay" onClick={() => setPrintingBill(null)}>
          <div className="bill-modal" style={{ maxWidth: 450, borderRadius: '24px' }} onClick={e => e.stopPropagation()}>
            <div className="bill-modal-header" style={{ padding: '20px 24px' }}>
              <h3 className="bill-modal-title" style={{ fontSize: '1.1rem' }}>Print Options</h3>
              <button className="bill-btn" style={{ padding: 8, borderRadius: 12, border: 'none' }} onClick={() => setPrintingBill(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="bill-modal-body" style={{ padding: '0 24px 24px' }}>
              <div style={{ marginBottom: 20, padding: 16, background: 'var(--pp-blue-tint)', borderRadius: 16, border: '1px solid var(--pp-blue-border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--pp-blue)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 4 }}>Active Record</div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--pp-ink)' }}>{printingBill.patientName}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--pp-text-3)', fontWeight: 600 }}>Bill No: #{printingBill.billNo} • Amount: ₹{printingBill.charges.toLocaleString()}</div>
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                <button className="bill-print-option" style={{ padding: '16px', border: '1px solid var(--pp-warm-3)', borderRadius: 16, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 4 }} onClick={() => handlePrint('standard')}>
                  <div style={{ fontWeight: 800, color: 'var(--pp-ink)', fontSize: '0.95rem' }}>Standard Receipt</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pp-text-3)', fontWeight: 500 }}>Professional bill with clinic branding</div>
                </button>
                
                <button className="bill-print-option" style={{ padding: '16px', border: '1px solid var(--pp-warm-3)', borderRadius: 16, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 4 }} onClick={() => handlePrint('pharmacy')}>
                  <div style={{ fontWeight: 800, color: 'var(--pp-ink)', fontSize: '0.95rem' }}>Pharmacy Layout</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pp-text-3)', fontWeight: 500 }}>Optimized for medicine and stock items</div>
                </button>
                
                <button className="bill-print-option" style={{ padding: '16px', border: '1px solid var(--pp-warm-3)', borderRadius: 16, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 4 }} onClick={() => handlePrint('package')}>
                  <div style={{ fontWeight: 800, color: 'var(--pp-ink)', fontSize: '0.95rem' }}>Package Invoice</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pp-text-3)', fontWeight: 500 }}>Summary of treatment plans and bundles</div>
                </button>
                
                <button className="bill-print-option" style={{ padding: '16px', border: '1px solid var(--pp-warm-3)', borderRadius: 16, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: 4 }} onClick={() => handlePrint('comprehensive')}>
                  <div style={{ fontWeight: 800, color: 'var(--pp-ink)', fontSize: '0.95rem' }}>Full Statement</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--pp-text-3)', fontWeight: 500 }}>Detailed clinical history and payments</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
