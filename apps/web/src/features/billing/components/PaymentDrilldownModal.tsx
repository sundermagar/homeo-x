import React from 'react';
import { X } from 'lucide-react';
import { usePaymentDrilldown, type PaymentDrilldownRecordData } from '../hooks/use-billing';

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
  const totalAmount = (records || []).reduce((s, r) => s + r.amount, 0);

  return (
    <div className="vc-modal-overlay" onClick={onClose}>
      <div className="vc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vc-modal-header">
          <h3>{title}</h3>
          <button className="vc-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="vc-modal-body">
          {isLoading ? (
            <div className="vc-loading">Loading records...</div>
          ) : records && records.length > 0 ? (
            <table className="vc-drilldown-table">
              <thead>
                <tr>
                  <th>RegID</th>
                  <th>Name</th>
                  {isProduct && <th>Charge Type</th>}
                  {isProduct && <th>Qty</th>}
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: PaymentDrilldownRecordData, idx: number) => (
                  <tr key={idx}>
                    <td>{r.regid || '—'}</td>
                    <td>{r.patientName || '—'}</td>
                    {isProduct && <td>{r.chargeName || '—'}</td>}
                    {isProduct && <td>{r.quantity || 1}</td>}
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      ₹{r.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="vc-drilldown-total">
                  <td colSpan={isProduct ? 4 : 2} style={{ textAlign: 'right', fontWeight: 700 }}>
                    Total
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    ₹{totalAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="vc-empty">No records found for this date.</div>
          )}
        </div>
      </div>
    </div>
  );
}
