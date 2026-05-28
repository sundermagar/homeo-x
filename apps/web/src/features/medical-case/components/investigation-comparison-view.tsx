import React, { useMemo } from 'react';
import { FileText, Calendar } from 'lucide-react';

export function InvestigationComparisonView({ investigations }: { investigations: any[] }) {
  // Group investigations by type
  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    investigations.forEach(inv => {
      const type = inv.type || 'Unknown';
      if (!groups[type]) groups[type] = [];
      groups[type].push(inv);
    });

    // Sort each group by date ascending (oldest to newest left to right)
    Object.keys(groups).forEach(type => {
      groups[type]!.sort((a, b) => {
        const da = new Date(a.investDate || a.createdAt || 0).getTime();
        const db = new Date(b.investDate || b.createdAt || 0).getTime();
        return da - db;
      });
    });

    return groups;
  }, [investigations]);

  if (investigations.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
        No investigation reports available for comparison.
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', background: 'white', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
      {Object.entries(grouped).map(([type, invs]) => {
        // Collect all unique keys for this type across all dates
        const allKeys = new Set<string>();
        invs.forEach(inv => {
          Object.keys(inv.data || {}).forEach(k => {
            const lowerK = k.toLowerCase();
            if (
              lowerK !== 'attachmenturl' &&
              lowerK !== 'attachment_url' &&
              lowerK !== 'attachment' &&
              lowerK !== 'pdfurl' &&
              lowerK !== 'pdf_url' &&
              lowerK !== 'summary' &&
              lowerK !== 'ai_summary' &&
              lowerK !== 'aisummary'
            ) {
              allKeys.add(k);
            }
          });
        });
        const keysList = Array.from(allKeys);

        return (
          <div key={type} style={{ marginBottom: '48px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--pp-blue)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} /> {type} Reports
            </h3>
            
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', width: '200px', borderRight: '1px solid #e2e8f0' }}>Parameter</th>
                    {invs.map((inv, idx) => (
                      <th key={inv.id || idx} style={{ padding: '12px 16px', textAlign: 'left', borderRight: idx === invs.length - 1 ? 'none' : '1px solid #e2e8f0', minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
                          <Calendar size={14} /> 
                          {inv.investDate ? new Date(inv.investDate).toLocaleDateString('en-GB') : (inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-GB') : 'Unknown Date')}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Data Rows */}
                  {keysList.map((key, rowIdx) => {
                    const label = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    return (
                      <tr key={key} style={{ background: rowIdx % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 500, color: '#475569', borderRight: '1px solid #e2e8f0', verticalAlign: 'top' }}>{label}</td>
                        {invs.map((inv, idx) => {
                          const val = inv.data?.[key];
                          return (
                            <td key={inv.id || idx} style={{ padding: '12px 16px', color: '#1e293b', borderRight: idx === invs.length - 1 ? 'none' : '1px solid #e2e8f0', verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
                              {val ? String(val) : <span style={{ color: '#cbd5e1' }}>—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* AI Summary Row if it exists - Rendered at the End */}
                  {invs.some(inv => inv.summary || inv.data?.summary || inv.data?.Summary) && (
                    <tr style={{ background: '#eff6ff', borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e40af', borderRight: '1px solid #e2e8f0' }}>AI Summary</td>
                      {invs.map((inv, idx) => {
                        const sumVal = inv.summary || inv.data?.summary || inv.data?.Summary;
                        return (
                          <td key={inv.id || idx} style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#1e3a8a', borderRight: idx === invs.length - 1 ? 'none' : '1px solid #e2e8f0', verticalAlign: 'top' }}>
                            {sumVal ? sumVal : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No summary available</span>}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
