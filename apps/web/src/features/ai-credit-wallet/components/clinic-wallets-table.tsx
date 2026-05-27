import React, { useState, useEffect } from 'react';
import { useClinicWallets, ClinicWallet } from '../hooks/use-routing-data';
import { Edit2 } from 'lucide-react';
import { EditClinicLimitModal } from './edit-clinic-limit-modal';
import { Pagination } from '@/components/shared/pagination';
import { usePagination } from '@/shared/hooks/use-pagination';

export function ClinicWalletsTable() {
  const initialWallets = useClinicWallets();
  const [wallets, setWallets] = useState(initialWallets);
  const [editingWallet, setEditingWallet] = useState<ClinicWallet | null>(null);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(wallets);

  useEffect(() => {
    setWallets(initialWallets);
  }, [initialWallets]);

  const handleSaveLimit = (id: string, newLimit: number) => {
    setWallets(prev => prev.map(w => w.id === id ? { ...w, monthlyLimit: newLimit } : w));
  };

  return (
    <div className="cw-card" style={{ padding: '0', overflow: 'hidden' }}>
      <div className="cw-card-header" style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', marginBottom: 0 }}>
        <div>
          <h3 className="cw-card-title">Multi-Tenant Sub-Wallets</h3>
          <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Monitor credit consumption and manage monthly limits per clinic.</p>
        </div>
      </div>
      
      <table className="cw-responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>CLINIC</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>MONTHLY LIMIT</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280', width: '35%' }}>CONSUMPTION</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>STATUS</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280', textAlign: 'right' }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((wallet) => {
            const percent = (wallet.spentThisMonth / wallet.monthlyLimit) * 100;
            let status = 'Normal';
            let statusColor = '#10B981';
            let statusBg = '#DCFCE7';
            
            if (percent >= 100) {
              status = 'Suspended';
              statusColor = '#991B1B';
              statusBg = '#FEE2E2';
            } else if (percent >= 80) {
              status = 'Near Limit';
              statusColor = '#D97706';
              statusBg = '#FEF3C7';
            }

            return (
              <tr key={wallet.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td data-label="CLINIC" style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{wallet.name}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{wallet.id}</div>
                </td>
                <td data-label="MONTHLY LIMIT" style={{ padding: '16px 24px', verticalAlign: 'middle', fontSize: '14px', fontWeight: 600, color: '#4B5563' }}>
                  {wallet.monthlyLimit.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: 400, color: '#9CA3AF' }}>cr</span>
                </td>
                <td data-label="CONSUMPTION" style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600 }}>₹{wallet.spentThisMonth.toLocaleString()}</span>
                    <span style={{ color: '#6B7280' }}>{percent.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(percent, 100)}%`, background: statusColor, borderRadius: '3px' }} />
                  </div>
                </td>
                <td data-label="STATUS" style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', background: statusBg, color: statusColor, borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                    {status}
                  </div>
                </td>
                <td data-label="ACTIONS" style={{ padding: '16px 24px', verticalAlign: 'middle', textAlign: 'right' }}>
                  <button 
                    onClick={() => setEditingWallet(wallet)}
                    style={{ background: 'transparent', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: '#374151', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB' }}>
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalItems / itemsPerPage)}
          pageSize={itemsPerPage}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={setItemsPerPage}
        />
      </div>

      {editingWallet && (
        <EditClinicLimitModal 
          wallet={editingWallet} 
          onClose={() => setEditingWallet(null)} 
          onSave={handleSaveLimit} 
        />
      )}
    </div>
  );
}
