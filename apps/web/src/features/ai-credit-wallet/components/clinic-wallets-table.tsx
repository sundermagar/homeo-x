import React, { useState, useEffect, useMemo } from 'react';
import { useClinicWallets, ClinicWallet } from '../hooks/use-routing-data';
import { Edit2, Search, Filter, Loader2, Plus } from 'lucide-react';
import { EditClinicLimitModal } from './edit-clinic-limit-modal';
import { Pagination } from '@/components/shared/pagination';
import { usePagination } from '@/shared/hooks/use-pagination';

export function ClinicWalletsTable() {
  const { data: initialWallets, loading } = useClinicWallets();
  const [wallets, setWallets] = useState<ClinicWallet[]>([]);
  const [editingWallet, setEditingWallet] = useState<ClinicWallet | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    if (initialWallets.length > 0) {
      setWallets(initialWallets);
    }
  }, [initialWallets]);

  const handleSaveLimit = (id: string, newLimit: number) => {
    setWallets(prev => prev.map(w => w.id === id ? { ...w, monthlyLimit: newLimit } : w));
  };

  const filteredWallets = useMemo(() => {
    return wallets.filter(w => {
      const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            w.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const percent = w.monthlyLimit > 0 ? (w.spentThisMonth / w.monthlyLimit) * 100 : 0;
      let status = 'Normal';
      if (w.monthlyLimit === 0) status = 'Unrestricted';
      else if ((w as any).isSuspended) status = 'Suspended';
      else if (percent >= 100) status = 'At limit';
      else if (percent >= 80) status = 'Near limit';
      
      const matchesStatus = statusFilter === 'All' || status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [wallets, searchQuery, statusFilter]);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(filteredWallets);

  if (loading && wallets.length === 0) {
    return (
      <div className="cw-card" style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="cw-card" style={{ padding: '0', overflow: 'hidden' }}>
      <div className="cw-card-header" style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 className="cw-card-title">Multi-Tenant Sub-Wallets</h3>
          <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Monitor credit consumption and manage monthly limits per clinic.</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => setEditingWallet({ id: 'NEW', name: 'New Clinic', monthlyLimit: 0, spentThisMonth: 0 })}
            style={{ padding: '8px 16px', background: '#0F172A', color: 'white', borderRadius: '6px', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Set limit
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input 
                type="text" 
                placeholder="Search clinics..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  padding: '8px 12px 8px 36px', 
                  border: '1px solid #D1D5DB', 
                  borderRadius: '6px', 
                  fontSize: '13px',
                  width: '220px',
                  outline: 'none'
                }} 
              />
            </div>
            
            <div style={{ position: 'relative' }}>
              <Filter size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ 
                  padding: '8px 12px 8px 36px', 
                  border: '1px solid #D1D5DB', 
                  borderRadius: '6px', 
                  fontSize: '13px',
                  backgroundColor: 'white',
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  paddingRight: '32px'
                }}
              >
                <option value="All">All Status</option>
                <option value="Normal">Normal</option>
                <option value="Near limit">Near limit</option>
                <option value="At limit">At limit</option>
                <option value="Suspended">Suspended</option>
                <option value="Unrestricted">Unrestricted</option>
              </select>
            </div>
          </div>
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
            const percent = wallet.monthlyLimit > 0 ? (wallet.spentThisMonth / wallet.monthlyLimit) * 100 : 0;
            let status = 'Normal';
            let statusColor = '#10B981';
            let statusBg = '#DCFCE7';
            
            if (wallet.monthlyLimit === 0) {
              status = 'Unrestricted';
              statusColor = '#6B7280';
              statusBg = '#F3F4F6';
            } else if ((wallet as any).isSuspended) {
              status = 'Suspended';
              statusColor = '#7F1D1D';
              statusBg = '#FEE2E2';
            } else if (percent >= 100) {
              status = 'At limit';
              statusColor = '#EF4444';
              statusBg = '#FEE2E2';
            } else if (percent >= 80) {
              status = 'Near limit';
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
                    <span style={{ fontWeight: 600 }}>{wallet.spentThisMonth.toLocaleString()} cr</span>
                    <span style={{ color: '#6B7280' }}>{wallet.monthlyLimit > 0 ? `${percent.toFixed(1)}%` : 'N/A'}</span>
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
