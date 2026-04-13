import React, { useState } from 'react';
import { History, RefreshCw, ArrowLeft, Filter, Search, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStockLogs, useMedicines } from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

export default function StocksLogPage() {
  const [selectedMedicine, setSelectedMedicine] = useState<number | undefined>();
  const { data: logs = [], isLoading } = useStockLogs(selectedMedicine);
  const { data: medicines = [] } = useMedicines();

  return (
    <div className="plat-page fade-in">
      <Link to="/settings" className="settings-back-link">
        <ArrowLeft size={14} />
        Back to Settings
      </Link>

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
          <div style={{ overflowX: 'auto' }}>
            <table className="plat-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Medicine</th>
                  <th>Change Type</th>
                  <th>Quantity</th>
                  <th>Stock Path</th>
                  <th>Reason/Reference</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => {
                  const medicine = medicines.find((m: any) => m.id === log.medicineId);
                  const isPositive = log.changeType === 'INVENTORY_ADD';
                  
                  return (
                    <tr key={log.id}>
                      <td className="text-sm">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="font-semibold">
                        {medicine?.name || `Medicine #${log.medicineId}`}
                      </td>
                      <td>
                        <span className={`plat-badge ${isPositive ? 'plat-badge-staff' : 'plat-badge-default'}`}>
                           {log.changeType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className={`font-mono text-center ${isPositive ? 'text-success' : 'text-danger'}`}>
                         {isPositive ? '+' : '-'}{log.quantity}
                      </td>
                      <td className="font-mono text-xs">
                        {log.previousStock} → <span className="font-bold">{log.newStock}</span>
                      </td>
                      <td className="text-sm italic color-secondary">
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
