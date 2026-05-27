import React from 'react';
import { useKeyAuditLogs } from '../hooks/use-api-keys-data';
import { Eye, Plus, RefreshCw, ShieldOff } from 'lucide-react';
import { Pagination } from '@/components/shared/pagination';
import { usePagination } from '@/shared/hooks/use-pagination';

export function KeyAuditTable() {
  const logs = useKeyAuditLogs();
  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(logs);

  const getActionDetails = (action: string) => {
    switch(action) {
      case 'VIEWED_MASKED': return { icon: <Eye size={14} />, color: '#3B82F6', label: 'Viewed Masked' };
      case 'KEY_ADDED': return { icon: <Plus size={14} />, color: '#10B981', label: 'Key Added' };
      case 'KEY_ROTATED': return { icon: <RefreshCw size={14} />, color: '#F59E0B', label: 'Key Rotated' };
      case 'KEY_REVOKED': return { icon: <ShieldOff size={14} />, color: '#EF4444', label: 'Key Revoked' };
      default: return { icon: <Eye size={14} />, color: '#6B7280', label: action };
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="cw-card" style={{ padding: '0', overflow: 'hidden' }}>
      <div className="cw-card-header" style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', marginBottom: 0 }}>
        <div>
          <h3 className="cw-card-title">Immutable Audit Log</h3>
          <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Every interaction with the vault is permanently logged for security compliance.</p>
        </div>
      </div>
      
      <table className="cw-responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>TIMESTAMP</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>ACTION</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>PROVIDER</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>ADMIN USER</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>IP ADDRESS</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((log) => {
            const actionInfo = getActionDetails(log.action);
            
            return (
              <tr key={log.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td data-label="TIMESTAMP" style={{ padding: '16px 24px', verticalAlign: 'middle', fontSize: '13px', color: '#4B5563' }}>
                  {formatDate(log.timestamp)}
                </td>
                <td data-label="ACTION" style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: actionInfo.color, fontSize: '13px', fontWeight: 600 }}>
                    {actionInfo.icon}
                    {actionInfo.label}
                  </div>
                </td>
                <td data-label="PROVIDER" style={{ padding: '16px 24px', verticalAlign: 'middle', fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                  {log.provider}
                </td>
                <td data-label="ADMIN USER" style={{ padding: '16px 24px', verticalAlign: 'middle', fontSize: '13px', color: '#4B5563', fontFamily: 'monospace' }}>
                  {log.adminId}
                </td>
                <td data-label="IP ADDRESS" style={{ padding: '16px 24px', verticalAlign: 'middle', fontSize: '13px', color: '#6B7280' }}>
                  {log.ipAddress}
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
    </div>
  );
}
