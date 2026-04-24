import type { PaymentWithPatient } from '@mmc/types';
import { format } from 'date-fns';
import { RefreshCw, Banknote } from 'lucide-react';

interface PaymentTableProps {
  payments: PaymentWithPatient[];
  isLoading: boolean;
}

export function PaymentTable({ payments, isLoading }: PaymentTableProps) {
  if (isLoading) {
    return (
      <div className="bill-empty">
        <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="bill-card">
        <div className="bill-empty">
          <Banknote size={28} className="bill-empty-icon" />
          <p className="bill-empty-text">No transaction records found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bill-card fade-in">
      <div className="bill-table-container">
        <table className="bill-table">
          <thead>
            <tr>
              <th style={{ width: '130px' }}>Date</th>
              <th>Patient</th>
              <th style={{ width: '110px' }}>Amount</th>
              <th style={{ width: '80px' }}>Mode</th>
              <th>Reference IDs</th>
              <th style={{ width: '90px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td data-label="Date" style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.78rem', color: 'var(--pp-text-3)' }}>
                  {payment.paymentDate
                    ? format(new Date(payment.paymentDate), 'dd-MM HH:mm')
                    : format(new Date(payment.createdAt), 'dd-MM-yy')}
                </td>
                <td data-label="Patient" style={{ fontWeight: 500 }}>
                  {payment.patientName}
                  <span style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.72rem', color: 'var(--pp-text-3)', marginLeft: '6px' }}>
                    #{payment.regid}
                  </span>
                </td>
                <td data-label="Amount" style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 600 }}>
                  ₹{payment.amount.toLocaleString()}
                </td>
                <td data-label="Mode">
                  <span className="bill-badge bill-badge-default" style={{ fontFamily: 'var(--pp-font-mono)' }}>
                    {payment.paymentMode.toUpperCase()}
                  </span>
                </td>
                <td data-label="Reference IDs" style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.72rem', color: 'var(--pp-text-3)', lineHeight: 1.4 }}>
                  {payment.orderId   && <div>ORD: {payment.orderId}</div>}
                  {payment.paymentId && <div>PAY: {payment.paymentId}</div>}
                  {!payment.orderId && !payment.paymentId && <div style={{ color: 'var(--pp-text-3)' }}>MANUAL</div>}
                </td>
                <td data-label="Status">
                  <span className={`bill-badge ${
                    payment.status === 'Success' || payment.status === 'Completed'
                      ? 'bill-badge-success'
                      : payment.status === 'Failed'
                      ? 'bill-badge-danger'
                      : 'bill-badge-warning'
                  }`}>
                    {payment.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
