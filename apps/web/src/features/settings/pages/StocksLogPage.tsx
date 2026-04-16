import React, { useState } from 'react';
import { History, RefreshCw, Filter, Search, Package  } from 'lucide-react';

import { useStockLogs, useMedicines } from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

export default function StocksLogPage() {
  const [selectedMedicine, setSelectedMedicine] = useState<number | undefined>();
  const { data: logs = [], isLoading } = useStockLogs(selectedMedicine);
  const { data: medicines = [] } = useMedicines();

  return (
    <div className="plat-page animate-fade-in">
      

      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <History size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Stocks Management
          </h1>
          <p className="plat-header-sub">Track inventory history and stock movements across the medicine catalog.</p>
        </div>
      </div>

      <div className="plat-filters">
        <div className="flex items-center gap-2">
           <Filter size={14} className="text-muted" />
           <span className="text-sm font-semibold">Filter by Medicine:</span>
           <select 
             className="plat-filter-input" 
             style={{ minWidth: '200px' }}
             value={selectedMedicine ?? ''}
             onChange={e => setSelectedMedicine(e.target.value ? Number(e.target.value) : undefined)}
           >
             <option value="">All Medicines</option>
             {medicines.map((m: any) => (
               <option key={m.id} value={m.id}>{m.name}</option>
             ))}
           </select>
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty">
            <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="plat-empty">
            <Package size={28} className="plat-empty-icon" />
            <p className="plat-empty-text">No stock movement history found.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Medicine</th>
                  <th>Change Type</th>
                  <th>Quantity</th>
                  <th>Stock Path</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => {
                  const medicine = medicines.find((m: any) => m.id === log.medicineId);
                  const isPositive = log.changeType === 'INVENTORY_ADD';
                  
                  return (
                    <tr key={log.id}>
                      <td data-label="Date">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td data-label="Medicine" style={{ fontWeight: 700 }}>
                        {medicine?.name || `Medicine #${log.medicineId}`}
                      </td>
                      <td data-label="Type">
                        <span className={`plat-badge ${isPositive ? 'plat-badge-staff' : 'plat-badge-default'}`}>
                           {log.changeType.replace('_', ' ')}
                        </span>
                      </td>
                      <td data-label="Qty" style={{ fontFamily: 'var(--pp-font-mono)', color: isPositive ? 'var(--pp-success-fg)' : 'var(--pp-danger-fg)', fontWeight: 700 }}>
                         {isPositive ? '+' : '-'}{log.quantity}
                      </td>
                      <td data-label="Stock" style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.8rem' }}>
                        {log.previousStock} → <strong>{log.newStock}</strong>
                      </td>
                      <td data-label="Reason" style={{ fontStyle: 'italic', color: 'var(--pp-text-3)', fontSize: '0.85rem' }}>
                        {log.reason || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
