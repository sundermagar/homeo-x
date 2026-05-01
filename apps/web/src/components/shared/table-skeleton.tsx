import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  cols?: number; // For backwards compatibility
}

export function TableSkeleton({ rows = 5, columns, cols }: TableSkeletonProps) {
  const colCount = columns || cols || 4;
  
  return (
    <div className="pp-table-scroll pp-card-premium" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="pp-table" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr>
            {Array.from({ length: colCount }).map((_, i) => (
              <th key={i}>
                <div className="skeleton-box skeleton-text" style={{ width: '60%', margin: 0 }} />
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
                      width: colIndex === 0 ? '30px' : colIndex === colCount - 1 ? '80px' : '70%',
                      margin: 0 
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
