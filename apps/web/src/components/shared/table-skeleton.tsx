import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  cols?: number; // For backwards compatibility
}

export function TableSkeleton({ rows = 10, columns = 8, cols }: TableSkeletonProps) {
  // Always render at least 8 columns to ensure the skeleton fills the entire table width
  // as per the requirement "fill the table completely with columns".
  const colCount = Math.max(columns || cols || 0, 8);
  
  return (
    <div className="pp-table-scroll pp-card-premium" style={{ padding: 0 }}>
      <table className="pp-table">
        <thead>
          <tr>
            {Array.from({ length: colCount }).map((_, i) => (
              <th key={i}>
                <div className="skeleton-box skeleton-text" style={{ width: i === 0 ? '40%' : '75%', margin: 0, height: '12px' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="hover-row">
              {Array.from({ length: colCount }).map((_, colIndex) => (
                <td key={colIndex}>
                  <div 
                    className="skeleton-box skeleton-text" 
                    style={{ 
                      width: '90px',
                      margin: 0,
                      height: '15px'
                    }} 
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
