import React, { useState } from 'react';
import { useRequestLogs, RequestLog } from '../hooks/use-logs-data';
import { Activity, ShieldAlert, CheckCircle, Search, Filter, AlertTriangle } from 'lucide-react';
import { LogDetailsDrawer } from './log-details-drawer';
import { Pagination } from '@/components/shared/pagination';

export function AuditLogsTable() {
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data: paginatedData, total: totalItems, loading } = useRequestLogs(currentPage, itemsPerPage, searchQuery);

  const getFeatureColor = (feature: string) => {
    switch(feature) {
      case 'Consultation':
      case 'Consultation AI': return '#10B981';
      case 'Clinical Extraction': return '#8B5CF6';
      case 'Followup Summary': return '#F59E0B';
      case 'Prescription Gen': return '#F43F5E';
      case 'Scan Investigation':
      case 'Scan Investigation Upload': return '#3B82F6';
      case 'Medicine Issue Detection': return '#EC4899';
      case 'Summarisation':
      case 'Summarization': return '#F59E0B';
      case 'Transcription': return '#3B82F6';
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
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '8px', fontSize: '13px', width: '100%' }} 
            />
          </div>
          <button className="plat-btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4B5563', padding: '6px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', whiteSpace: 'nowrap' }}>
            <Filter size={14} /> Filters
          </button>
        </div>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table className="cw-responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>TIMESTAMP</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>FEATURE</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>MODEL</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>USER</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>PROMPT</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>TOKENS</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>CREDITS</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>Loading logs...</td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>No logs found matching your criteria.</td>
              </tr>
            ) : paginatedData.map((log) => {
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
                  <td data-label="FEATURE" style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#374151', padding: '2px 8px', borderRadius: '12px', background: `${featColor}15` }}>
                      <Activity size={12} color={featColor} />
                      {log.feature}
                    </div>
                  </td>
                  <td data-label="MODEL" style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: '12px', color: '#4B5563', fontWeight: 500 }}>
                    {log.modelId}
                  </td>
                  <td data-label="USER" style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: '12px', color: '#4B5563', fontWeight: 500 }}>
                    {log.userName || log.userId || '-'}
                  </td>
                  <td data-label="PROMPT" style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: '11px', color: '#6B7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.prompt ? (
                      <span style={{ cursor: 'pointer', color: '#6366F1', fontWeight: 500 }}>
                        ••• [Click to reveal]
                      </span>
                    ) : '-'}
                  </td>
                  <td data-label="TOKENS" style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: '12px', color: '#4B5563', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {isDeposit ? '-' : ((log.inputTokens || 0) + (log.outputTokens || 0)).toLocaleString()}
                  </td>
                  <td data-label="CREDITS" style={{ padding: '12px 16px', verticalAlign: 'middle', fontSize: '13px', fontWeight: 700, color: creditColor }}>
                    {creditText}
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
