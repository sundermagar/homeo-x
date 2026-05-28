import React, { useState } from 'react';
import { useApiKeys, ApiKey } from '../hooks/use-api-keys-data';
import { Key, ShieldAlert, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { RotateKeyModal } from './rotate-key-modal';
import { Pagination } from '@/components/shared/pagination';
import { usePagination } from '@/shared/hooks/use-pagination';

export function KeyVaultList() {
  const { data: keys } = useApiKeys();
  const [rotatingKey, setRotatingKey] = useState<ApiKey | null>(null);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(keys);
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getDaysRemaining = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="cw-card" style={{ padding: '0', overflow: 'hidden' }}>
      <div className="cw-card-header" style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', marginBottom: 0 }}>
        <div>
          <h3 className="cw-card-title">Configured Provider Keys</h3>
          <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Keys are encrypted via AES-256-GCM. Plaintext values are never displayed.</p>
        </div>
      </div>
      
      <table className="cw-responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>PROVIDER / NAME</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>MASKED KEY</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>STATUS</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>LAST ROTATED</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280', textAlign: 'right' }}>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((key) => {
            let statusIcon = <CheckCircle size={14} />;
            let statusColor = '#10B981';
            let statusBg = '#DCFCE7';
            
            if (key.status === 'Expired' || key.status === 'Revoked') {
              statusIcon = <ShieldAlert size={14} />;
              statusColor = '#991B1B';
              statusBg = '#FEE2E2';
            } else if (key.status === 'Expiring soon') {
              statusIcon = <AlertTriangle size={14} />;
              statusColor = '#D97706';
              statusBg = '#FEF3C7';
            }

            return (
              <tr key={key.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
              <td data-label="PROVIDER / NAME" style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{key.provider}</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>{key.keyName}</div>
              </td>
              <td data-label="MASKED KEY" style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#F3F4F6', padding: '6px 12px', borderRadius: '6px', border: '1px solid #E5E7EB', fontFamily: 'monospace', fontSize: '13px', color: '#4B5563' }}>
                  <Key size={14} style={{ color: '#9CA3AF' }} />
                  {key.maskedPreview}
                </div>
              </td>
              <td data-label="STATUS" style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: statusBg, color: statusColor }}>
                    {statusIcon}
                    {key.status}
                  </span>
                  {key.expiresAt && key.status === 'Expiring soon' && (
                    <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 500 }}>
                      Expires in {getDaysRemaining(key.expiresAt)} days
                    </span>
                  )}
                </div>
              </td>
              <td data-label="LAST ROTATED" style={{ padding: '16px 24px', verticalAlign: 'middle', fontSize: '13px', color: '#4B5563' }}>
                {formatDate(key.lastRotatedAt)}
              </td>
              <td data-label="ACTIONS" style={{ padding: '16px 24px', verticalAlign: 'middle', textAlign: 'right' }}>
                <button 
                    className="plat-btn" 
                    onClick={() => setRotatingKey(key)}
                    style={{ background: 'white', border: '1px solid #D1D5DB', color: '#374151', fontSize: '13px', fontWeight: 600, padding: '6px 16px', borderRadius: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                  >
                    <RefreshCw size={14} style={{ marginRight: '6px' }} />
                    Rotate Key
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
      
      {rotatingKey && <RotateKeyModal apiKey={rotatingKey} onClose={() => setRotatingKey(null)} />}
    </div>
  );
}
