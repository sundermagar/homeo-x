import React from 'react';

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="pp-card pp-table-scroll" style={{ padding: 0 }}>
      <table className="pp-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} style={{ padding: '16px 24px' }}>
                <div className="skeleton-box" style={{ height: '12px', width: '40px', borderRadius: '4px', opacity: 0.7 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: cols }).map((_, colIndex) => (
                <td key={colIndex} style={{ padding: '16px 24px' }}>
                  <div className="skeleton-box" style={{ height: '24px', width: colIndex === 0 ? '120px' : '80px', borderRadius: '6px' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
