import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { useMonthList, type MonthListRowData } from '../hooks/use-billing';
import { PaymentDrilldownModal } from './PaymentDrilldownModal';

export function MonthListView() {
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const { data: rows, isLoading } = useMonthList(endDate, 32);

  const [drilldown, setDrilldown] = useState<{ date: string; mode: string; title: string } | null>(null);

  // Convert dd/mm/yyyy display date to YYYY-MM-DD for API
  const convertDateForApi = (displayDate: string): string => {
    const parts = displayDate.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return endDate;
  };

  const openDrilldown = (displayDate: string, mode: string, title: string) => {
    const apiDate = convertDateForApi(displayDate);
    setDrilldown({ date: apiDate, mode, title: `${title} — ${displayDate}` });
  };

  return (
    <div className="vc-month-list">
      <div className="vc-month-header" style={{ justifyContent: 'flex-end', gap: '12px' }}>
        <div className="vc-date-input-wrap">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="vc-date-input"
          />
        </div>
        <button 
          className="vc-today-btn" 
          onClick={() => setEndDate(new Date().toISOString().split('T')[0])}
        >
          Reset to Today
        </button>
      </div>

      {isLoading ? (
        <div className="vc-loading">Loading month data...</div>
      ) : (
        <div className="vc-table-scroll">
          <table className="vc-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="vc-right">Collection</th>
                <th className="vc-right">Cash</th>
                <th className="vc-right">Card</th>
                <th className="vc-right">Cheque</th>
                <th className="vc-right">Online</th>
                <th className="vc-right">Products</th>
                <th className="vc-right">Expenses</th>
                <th className="vc-right">Cash Handed</th>
                <th className="vc-right">Deficit</th>
                <th className="vc-right">Bank Dep.</th>
                <th className="vc-right">Cash in Hand</th>
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((row: MonthListRowData, idx: number) => (
                <tr key={idx} className={row.collection === 0 ? 'vc-row-zero' : ''}>
                  <td className="vc-date-cell">{row.date}</td>
                  <td className="vc-right vc-bold">₹{row.collection.toLocaleString('en-IN')}</td>
                  <td className="vc-right">
                    ₹{row.cash.toLocaleString('en-IN')}
                    <button className="vc-info-btn" onClick={() => openDrilldown(row.date, 'Cash', 'Cash')}>
                      <Info size={12} />
                    </button>
                  </td>
                  <td className="vc-right">
                    ₹{row.card.toLocaleString('en-IN')}
                    <button className="vc-info-btn" onClick={() => openDrilldown(row.date, 'Card', 'Card')}>
                      <Info size={12} />
                    </button>
                  </td>
                  <td className="vc-right">
                    ₹{row.cheque.toLocaleString('en-IN')}
                    <button className="vc-info-btn" onClick={() => openDrilldown(row.date, 'Cheque', 'Cheque')}>
                      <Info size={12} />
                    </button>
                  </td>
                  <td className="vc-right">
                    ₹{row.online.toLocaleString('en-IN')}
                    <button className="vc-info-btn" onClick={() => openDrilldown(row.date, 'Online', 'Online')}>
                      <Info size={12} />
                    </button>
                  </td>
                  <td className="vc-right">
                    ₹{row.productCharges.toLocaleString('en-IN')}
                    <button className="vc-info-btn" onClick={() => openDrilldown(row.date, 'Product', 'Products')}>
                      <Info size={12} />
                    </button>
                  </td>
                  <td className="vc-right">₹{row.expenses.toLocaleString('en-IN')}</td>
                  <td className="vc-right">₹{row.cashDeposited.toLocaleString('en-IN')}</td>
                  <td className={`vc-right ${row.deficit < 0 ? 'vc-negative' : 'vc-positive'}`}>
                    ₹{row.deficit.toLocaleString('en-IN')}
                  </td>
                  <td className="vc-right">₹{row.bankDeposit.toLocaleString('en-IN')}</td>
                  <td className="vc-right vc-bold">₹{row.cashInHand.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drilldown && (
        <PaymentDrilldownModal
          isOpen={!!drilldown}
          onClose={() => setDrilldown(null)}
          date={drilldown.date}
          mode={drilldown.mode}
          title={drilldown.title}
        />
      )}
    </div>
  );
}
