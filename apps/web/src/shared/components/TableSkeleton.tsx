import React from 'react';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="plat-table-container">
      <table className="plat-table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i}>
                <div className="skeleton-box skeleton-text" style={{ width: '60%', margin: 0 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="plat-table-row">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="plat-table-cell">
                  <div 
                    className="skeleton-box skeleton-text" 
                    style={{ 
                      width: colIndex === 0 ? '30px' : colIndex === columns - 1 ? '80px' : '70%',
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
