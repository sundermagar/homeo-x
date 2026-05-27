import React, { useState } from 'react';
import { useRequestLogs, RequestLog } from '../hooks/use-logs-data';
import { Activity, ShieldAlert, CheckCircle, Search, Filter, AlertTriangle, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { LogDetailsDrawer } from './log-details-drawer';
import { Pagination } from '@/components/shared/pagination';
import { usePagination } from '@/shared/hooks/use-pagination';

export function AuditLogsTable() {
  const logs = useRequestLogs();
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const getFeatureColor = (feature: string) => {
    switch(feature) {
      case 'Consultation AI': return '#10B981';
      case 'Transcription': return '#3B82F6';
      case 'Summarization': return '#F59E0B';
      case 'Follow-ups': return '#F59E0B';
      case 'Analysis': return '#93C5FD';
      case 'Prescription': return '#F43F5E';
      case 'Wallet Top-up': return '#2563EB';
      default: return '#6B7280';
    }
  };

  const truncate = (text: string, length = 45) => {
    if (!text) return '-';
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.feature.toLowerCase().includes(q) ||
      log.type.toLowerCase().includes(q) ||
      log.prompt.toLowerCase().includes(q) ||
      (log.modelId && log.modelId.toLowerCase().includes(q))
    );
  });

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(filteredLogs);

  return (
    <div className="cw-card" style={{ padding: '0', overflow: 'hidden' }}>
      <div className="cw-card-header" style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB', marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#F3F4F6', borderRadius: '6px', padding: '6px 12px', flex: 1, maxWidth: '350px' }}>
            <Search size={14} color="#9CA3AF" style={{ flexShrink: 0 }} />
            <input 
              type="text" 
              placeholder="Search Session or User..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '8px', fontSize: '13px', width: '100%' }} 
            />
          </div>
          <button className="plat-btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4B5563', padding: '6px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', whiteSpace: 'nowrap' }}>
            <Filter size={14} /> Filters
          </button>
        </div>
      </div>
      
      <div style={{ overflowX: 'hidden' }}>
        <table className="cw-responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>TIMESTAMP</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>TYPE</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>FEATURE / DESC</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>CREDITS</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textAlign: 'right' }}>AMOUNT (₹)</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280', textAlign: 'right' }}>RUNNING BAL</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((log) => {
              const featColor = getFeatureColor(log.feature);
              
              let statusIcon = <CheckCircle size={14} />;
              let statusColor = '#10B981';
              let statusBg = '#DCFCE7';
              
              if (log.status === 'FAILED') {
                statusIcon = <ShieldAlert size={14} />;
                statusColor = '#991B1B';
                statusBg = '#FEE2E2';
              } else if (log.status === 'FALLBACK_USED') {
                statusIcon = <AlertTriangle size={14} />;
                statusColor = '#D97706';
                statusBg = '#FEF3C7';
              }

              const isDeposit = log.type === 'DEPOSIT';
              const creditVal = isDeposit ? Math.abs(log.creditsDeducted) : log.creditsDeducted;
              const creditText = isDeposit ? `+${creditVal.toLocaleString()}` : `-${creditVal.toLocaleString()}`;
              const creditColor = isDeposit ? '#10B981' : '#EF4444';

              return (
                <tr 
                  key={log.id} 
                  style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer', transition: 'background 0.2s' }}
                  onClick={() => setSelectedLog(log)}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td data-label="TIMESTAMP" style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: '12px', color: '#4B5563', whiteSpace: 'nowrap' }}>
                    {formatDate(log.createdAt)}
                  </td>
                  <td data-label="TYPE" style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: isDeposit ? '#10B981' : '#EF4444' }}>
                      {isDeposit ? <ArrowDownToLine size={14} /> : <ArrowUpFromLine size={14} />}
                      {log.type}
                    </div>
                  </td>
                  <td data-label="FEATURE / DESC" style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#374151', padding: '2px 8px', borderRadius: '12px', background: `${featColor}15`, marginBottom: '4px' }}>
                      <Activity size={12} color={featColor} />
                      {log.feature}
                    </div>
                    {log.type === 'DEDUCTION' && (
                      <div style={{ fontSize: '11px', color: '#6B7280', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.modelId} • {log.prompt}
                      </div>
                    )}
                    {log.type === 'DEPOSIT' && (
                      <div style={{ fontSize: '11px', color: '#6B7280', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.prompt}
                      </div>
                    )}
                  </td>
                  <td data-label="CREDITS" style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: '13px', fontWeight: 700, color: creditColor }}>
                    {creditText}
                  </td>
                  <td data-label="AMOUNT (₹)" style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                    {isDeposit ? '+' : ''}₹{log.costInr.toFixed(4)}
                  </td>
                  <td data-label="RUNNING BAL" style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#374151' }}>
                    {log.runningBalance ? log.runningBalance.toLocaleString() : '-'}
                  </td>
                  <td data-label="STATUS" style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: statusBg, color: statusColor }}>
                      {statusIcon}
                      {log.status === 'FALLBACK_USED' ? 'Fallback' : log.status === 'DEPOSIT_COMPLETED' ? 'Completed' : log.status === 'SUCCESS' ? 'Success' : 'Failed'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
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

      {selectedLog && <LogDetailsDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}
