import type { BillWithPatient } from '@mmc/types';
import { format } from 'date-fns';
import { RefreshCw, Receipt } from 'lucide-react';

interface BillingTableProps {
  bills: BillWithPatient[];
  isLoading: boolean;
}

export function BillingTable({ bills, isLoading }: BillingTableProps) {
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
    <div className="bill-card fade-in">
      <div style={{ overflowX: 'auto' }}>
        <table className="bill-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Bill #</th>
              <th style={{ width: '120px' }}>Date</th>
              <th>Patient</th>
              <th style={{ width: '100px' }}>Mode</th>
              <th style={{ width: '110px' }}>Charges</th>
              <th style={{ width: '110px' }}>Received</th>
              <th style={{ width: '110px' }}>Balance</th>
              <th style={{ width: '70px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr key={bill.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>#{bill.billNo}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {bill.billDate ? format(new Date(bill.billDate), 'dd-MM-yyyy') : '—'}
                </td>
                <td style={{ fontWeight: 500 }}>{bill.patientName}</td>
                <td>
                  <span
                    className={`bill-badge ${bill.paymentMode === 'Online' ? 'bill-badge-primary' : 'bill-badge-default'}`}
                  >
                    {bill.paymentMode ?? '—'}
                  </span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ₹{bill.charges.toLocaleString()}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--success)' }}>
                  ₹{bill.received.toLocaleString()}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: bill.balance > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                  {bill.balance > 0 ? `₹${bill.balance.toLocaleString()}` : '—'}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button className="bill-btn bill-btn-sm" style={{ color: 'var(--primary)', border: 'none', background: 'none', fontWeight: 600 }}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
