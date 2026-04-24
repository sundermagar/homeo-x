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
        <div className="plat-search-wrap">
          <Filter size={14} className="plat-search-icon" />
          <select 
            className="plat-form-input plat-search-input" 
            style={{ width: '220px' }}
            value={selectedMedicine ?? ''}
            onChange={e => setSelectedMedicine(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">Full Inventory Trail</option>
            {medicines.map((m: any) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty" style={{ minHeight: 200 }}>
             <RefreshCw size={22} className="animate-spin opacity-30" />
          </div>
        ) : logs.length === 0 ? (
          <div className="plat-empty" style={{ minHeight: 200 }}>
            <Package size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No inventory movements recorded in the system audit.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '180px' }}>Timestamp</th>
                  <th>Clinical Item</th>
                  <th style={{ width: '150px' }}>Adjustment</th>
                  <th style={{ width: '100px' }}>Qty</th>
                  <th style={{ width: '180px' }}>Inventory Shift</th>
                  <th>Audit Reference</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => {
                  const medicine = medicines.find((m: any) => m.id === log.medicineId);
                  const isPositive = log.changeType === 'INVENTORY_ADD';
                  
                  return (
                    <tr key={log.id} className="plat-table-row">
                      <td className="plat-table-cell font-mono text-[11px] color-muted">
                        {new Date(log.createdAt).toLocaleString('en-GB', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="plat-table-cell">
                        <div className="font-bold text-[14px]">
                          {medicine?.name || `Remedy #${log.medicineId}`}
                        </div>
                        <div className="text-[10px] color-muted mt-0.5 uppercase tracking-tighter">Clinical Pharmacy Stock</div>
                      </td>
                      <td className="plat-table-cell">
                        <span className={`plat-badge ${isPositive ? 'plat-badge-staff' : 'bg-red-50 text-red-600 border-red-100'} flex items-center w-fit gap-1 text-[10px]`}>
                           {log.changeType === 'INVENTORY_ADD' ? 'Stock Added' : 'Stock Consumed'}
                        </span>
                      </td>
                      <td className={`plat-table-cell font-mono font-black ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                         {isPositive ? '+' : '-'}{log.quantity}
                      </td>
                      <td className="plat-table-cell">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="color-muted">{log.previousStock}</span>
                          <span className="opacity-30">→</span>
                          <span className="font-bold text-main">{log.newStock}</span>
                          <span className="text-[10px] color-muted ml-1 opacity-60">Units</span>
                        </div>
                      </td>
                      <td className="plat-table-cell text-xs italic color-muted">
                        {log.reason || 'Sytem Auto-Adjustment'}
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
