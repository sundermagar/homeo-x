import React from 'react';
import { usePaymentDrilldown, type PaymentDrilldownRecordData } from '../hooks/use-billing';
import { Drawer } from '@/shared/components/drawer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  mode: string;
  title: string;
}

export function PaymentDrilldownModal({ isOpen, onClose, date, mode, title }: Props) {
  const { data: records, isLoading } = usePaymentDrilldown(date, mode, isOpen);

  if (!isOpen) return null;

  const isProduct = mode === 'Product';
  const isExpense = mode === 'Expense';
  const totalAmount = (records || []).reduce((s, r) => s + r.amount, 0);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={title} maxWidth="500px">
      <div style={{ padding: '24px', maxHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        {isLoading ? (
          <div className="vc-loading" style={{ padding: '40px 0', textAlign: 'center', color: 'var(--pp-text-muted)' }}>
            Loading records...
          </div>
        ) : records && records.length > 0 ? (
          <div>
              <table className="pp-table vc-summary-table">
                <thead>
                <tr>
                  <th>Date</th>
                  {isExpense ? (
                    <>
                      <th>Category</th>
                      <th>Detail</th>
                    </>
                  ) : (
                    <>
                      <th>RegID</th>
                      <th>Name</th>
                    </>
                  )}
                  {isProduct && <th>Charge Type</th>}
                  {isProduct && <th>Qty</th>}
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: PaymentDrilldownRecordData, idx: number) => {
                  const d = r.date ? new Date(r.date) : new Date(date);
                  const formattedDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                  return (
                    <tr key={idx} className="pp-hover-row">
                      <td style={{ color: 'var(--pp-text-muted)', fontSize: '13px' }}>{formattedDate}</td>
                      {isExpense ? (
                        <>
                          <td style={{ fontWeight: 600, fontSize: '13px' }}>{r.patientName || '—'}</td>
                          <td style={{ color: 'var(--pp-text-muted)', fontSize: '13px' }}>{r.chargeName || '—'}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ fontSize: '13px' }}>{r.regid || '—'}</td>
                          <td style={{ fontWeight: 500, fontSize: '13px' }}>{r.patientName || '—'}</td>
                        </>
                      )}
                      {isProduct && <td style={{ fontSize: '13px' }}>{r.chargeName || '—'}</td>}
                      {isProduct && <td style={{ fontSize: '13px' }}>{r.quantity || 1}</td>}
                      <td style={{ textAlign: 'right', fontWeight: 600, fontSize: '14px', color: 'var(--pp-text-primary)' }}>
                        ₹{r.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--pp-bg-subtle)' }}>
                  <td colSpan={isExpense ? 3 : (isProduct ? 5 : 3)} style={{ textAlign: 'right', fontWeight: 600, fontSize: '13px', color: 'var(--pp-text-muted)', padding: '12px 16px' }}>
                    Total
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '15px', color: 'var(--pp-text-primary)', padding: '12px 16px' }}>
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="vc-empty" style={{ padding: '40px 0', textAlign: 'center', color: 'var(--pp-text-muted)' }}>
            No records found for this date.
          </div>
        )}
      </div>
    </Drawer>
  );
}
