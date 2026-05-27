import React from 'react';
import { useAIModels } from '../hooks/use-ai-models-data';
import { Pagination } from '@/components/shared/pagination';
import { usePagination } from '@/shared/hooks/use-pagination';

export function ModelAllocationsTable() {
  const models = useAIModels();
  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(models);

  return (
    <div className="cw-card" style={{ padding: '0', overflow: 'hidden' }}>
      <div className="cw-card-header" style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', marginBottom: 0 }}>
        <div>
          <h3 className="cw-card-title">Per-Model Credit Allocation</h3>
          <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Set optional maximum credit pools assigned to individual models to prevent runaway costs.</p>
        </div>
      </div>
      
      <table className="cw-responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>MODEL</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>ALLOCATED CAP (Mo)</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>SPENT THIS MONTH</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>REMAINING</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((model) => {
            // Mocking allocated caps for the demo
            const allocated = model.monthlyCredits > 0 ? Math.ceil((model.monthlyCredits * 1.5) / 10000) * 10000 : 0;
            const remaining = allocated > 0 ? allocated - model.monthlyCredits : 0;
            
            let status = 'Normal';
            let statusColor = '#10B981';
            let statusBg = '#DCFCE7';

            if (allocated === 0) {
              status = 'Unrestricted';
              statusColor = '#6B7280';
              statusBg = '#F3F4F6';
            } else if (remaining <= 0) {
              status = 'Exceeded';
              statusColor = '#991B1B';
              statusBg = '#FEE2E2';
            } else if (remaining < allocated * 0.2) {
              status = 'Near Limit';
              statusColor = '#D97706';
              statusBg = '#FEF3C7';
            }

            return (
              <tr key={model.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td data-label="MODEL" style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Server size={16} color="#4B5563" />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{model.name}</div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>{model.provider}</div>
                    </div>
                  </div>
                </td>
                <td data-label="ALLOCATED CAP" style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                  {allocated !== 0 ? (
                    <input 
                      type="number" 
                      className="cw-form-input" 
                      defaultValue={allocated} 
                      style={{ width: '120px', padding: '6px 10px', fontSize: '13px' }} 
                    />
                  ) : (
                    <span style={{ fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic' }}>No Cap Enforced</span>
                  )}
                </td>
                <td data-label="SPENT THIS MONTH" style={{ padding: '16px 24px', verticalAlign: 'middle', fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                  {model.monthlyCredits.toLocaleString()} <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 400 }}>cr</span>
                </td>
                <td data-label="REMAINING" style={{ padding: '16px 24px', verticalAlign: 'middle', fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                  {allocated === 0 ? <span style={{ color: '#9CA3AF' }}>∞</span> : remaining.toLocaleString()} <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 400 }}>cr</span>
                </td>
                <td data-label="STATUS" style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', background: statusBg, color: statusColor, borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                    {status}
                  </div>
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
