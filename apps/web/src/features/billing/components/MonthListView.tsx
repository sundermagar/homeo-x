import React, { useState } from 'react';
import { Info, Download, Printer } from 'lucide-react';
import { useMonthList, type MonthListRowData } from '../hooks/use-billing';
import { PaymentDrilldownModal } from './PaymentDrilldownModal';
import { TableSkeleton } from '@/components/shared/table-skeleton';

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

  const exportToCSV = () => {
    if (!rows || rows.length === 0) return;
    const headers = ['Date', 'Collection', 'Cash', 'Card', 'Cheque', 'Online', 'UPI', 'Products', 'Expenses', 'Cash Handed (Dep)', 'Deficit', 'Bank Deposit', 'Cash in Hand'];
    const csvContent = [
      headers.join(','),
      ...rows.map((r: MonthListRowData) => [
        r.date,
        r.collection,
        r.cash,
        r.card,
        r.cheque,
        r.online,
        r.upi || 0,
        r.productCharges,
        r.expenses,
        r.cashDeposited,
        r.deficit,
        r.bankDeposit,
        r.cashInHand
      ].join(','))
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Month_List_Export_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printPDF = () => {
    if (!rows || rows.length === 0) return;
    
    const html = `
      <html>
        <head>
          <title>Month List Report</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1e293b; }
            h2 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: right; }
            th { background: #f8fafc; font-weight: bold; text-align: right; }
            th:first-child, td:first-child { text-align: left; }
            @media print {
              body { padding: 0; }
              @page { size: landscape; margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h2>Collection Month List (As of ${endDate})</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th class="vc-right">Collection</th>
                <th class="vc-right">Cash</th>
                <th class="vc-right">Card</th>
                <th class="vc-right">Cheque</th>
                <th class="vc-right">Online</th>
                <th class="vc-right">UPI</th>
                <th class="vc-right">Products</th>
                <th class="vc-right">Expenses</th>
                <th class="vc-right">Cash Handed</th>
                <th class="vc-right">Deficit</th>
                <th class="vc-right">Bank Dep.</th>
                <th class="vc-right">Cash in Hand</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r: MonthListRowData) => `
                <tr>
                  <td>${r.date}</td>
                  <td class="vc-right">${r.collection.toLocaleString('en-IN')}</td>
                  <td class="vc-right">${r.cash.toLocaleString('en-IN')}</td>
                  <td class="vc-right">${r.card.toLocaleString('en-IN')}</td>
                  <td class="vc-right">${r.cheque.toLocaleString('en-IN')}</td>
                  <td class="vc-right">${r.online.toLocaleString('en-IN')}</td>
                  <td class="vc-right">${(r.upi || 0).toLocaleString('en-IN')}</td>
                  <td class="vc-right">${r.productCharges.toLocaleString('en-IN')}</td>
                  <td class="vc-right">${r.expenses.toLocaleString('en-IN')}</td>
                  <td class="vc-right">${r.cashDeposited.toLocaleString('en-IN')}</td>
                  <td class="vc-right">${r.deficit.toLocaleString('en-IN')}</td>
                  <td class="vc-right">${r.bankDeposit.toLocaleString('en-IN')}</td>
                  <td class="vc-right">${r.cashInHand.toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.print();
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  return (
    <div className="appt-card animate-fade-in">
      <div className="appt-card-header" style={{ justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
           <button className="btn-secondary" onClick={exportToCSV} disabled={isLoading || !rows?.length}>
             <Download size={14} /> Export CSV
           </button>
           <button className="btn-secondary" onClick={printPDF} disabled={isLoading || !rows?.length}>
             <Printer size={14} /> Print / PDF
           </button>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="vc-date-input-wrap">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="vc-date-input"
            />
          </div>
          <button
            className="btn-secondary"
            onClick={() => setEndDate(new Date().toISOString().split('T')[0])}
          >
            Reset to Today
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '24px 0' }}>
          <TableSkeleton rows={10} cols={13} />
        </div>
      ) : (
        <div className="pp-table-scroll">
          <table className="pp-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Date</th>
                <th style={{ textAlign: 'right' }}>Collection</th>
                <th style={{ textAlign: 'right' }}>Cash</th>
                <th style={{ textAlign: 'right' }}>Card</th>
                <th style={{ textAlign: 'right' }}>Cheque</th>
                <th style={{ textAlign: 'right' }}>Online</th>
                <th style={{ textAlign: 'right' }}>UPI</th>
                <th style={{ textAlign: 'right' }}>Products</th>
                <th style={{ textAlign: 'right' }}>Expenses</th>
                <th style={{ textAlign: 'right' }}>Cash Handed</th>
                <th style={{ textAlign: 'right' }}>Deficit</th>
                <th style={{ textAlign: 'right' }}>Bank Dep.</th>
                <th style={{ textAlign: 'right' }}>Cash in Hand</th>
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((row: MonthListRowData, idx: number) => (
                <tr key={idx} style={{ opacity: row.collection === 0 ? 0.6 : 1 }}>
                  <td style={{ fontWeight: 500 }}>{row.date}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{row.collection.toLocaleString('en-IN')}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      ₹{row.cash.toLocaleString('en-IN')}
                      <button 
                        onClick={() => openDrilldown(row.date, 'Cash', 'Cash')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                      >
                        <Info size={14} />
                      </button>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      ₹{row.card.toLocaleString('en-IN')}
                      <button 
                        onClick={() => openDrilldown(row.date, 'Card', 'Card')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                      >
                        <Info size={14} />
                      </button>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      ₹{row.cheque.toLocaleString('en-IN')}
                      <button 
                        onClick={() => openDrilldown(row.date, 'Cheque', 'Cheque')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                      >
                        <Info size={14} />
                      </button>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      ₹{row.online.toLocaleString('en-IN')}
                      <button 
                        onClick={() => openDrilldown(row.date, 'Online', 'Online')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                      >
                        <Info size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="vc-right">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      ₹{(row.upi || 0).toLocaleString('en-IN')}
                      <button 
                        onClick={() => openDrilldown(row.date, 'UPI', 'UPI Payment')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                      >
                        <Info size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="vc-right">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      ₹{row.productCharges.toLocaleString('en-IN')}
                      <button 
                        onClick={() => openDrilldown(row.date, 'Product', 'Products')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                      >
                        <Info size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="vc-right">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      ₹{row.expenses.toLocaleString('en-IN')}
                      <button 
                        onClick={() => openDrilldown(row.date, 'Expense', 'Expenses')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                      >
                        <Info size={14} />
                      </button>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>₹{row.cashDeposited.toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'right', color: row.deficit < 0 ? 'var(--pp-danger-fg, #ef4444)' : 'var(--pp-success-fg, #22c55e)' }}>
                    ₹{row.deficit.toLocaleString('en-IN')}
                  </td>
                  <td style={{ textAlign: 'right' }}>₹{row.bankDeposit.toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{row.cashInHand.toLocaleString('en-IN')}</td>
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
