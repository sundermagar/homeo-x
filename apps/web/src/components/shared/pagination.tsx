import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './shared.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const fromEntry = (currentPage - 1) * pageSize + 1;
  const toEntry = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="pat-pagination-bar animate-fade-in">
      <div className="pat-pagination-info-wrap">
        <span className="pat-pagination-info">
          Showing {fromEntry}-{toEntry} of {totalItems}
        </span>
        <select
          className="pat-pagination-limit"
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1);
          }}
        >
          {[5, 10, 20, 50].map((limit) => (
            <option key={limit} value={limit}>
              {limit} per page
            </option>
          ))}
        </select>
      </div>

      <div className="pat-pagination-controls">
        <button
          className="pat-pagination-btn"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft size={16} />
        </button>

        {Array.from({ length: totalPages }).map((_, i) => {
          const p = i + 1;
          if (
            p === 1 ||
            p === totalPages ||
            (p >= currentPage - 1 && p <= currentPage + 1)
          ) {
            return (
              <button
                key={p}
                className={`pat-pagination-page ${p === currentPage ? 'is-active' : ''}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            );
          }
          if (p === currentPage - 2 || p === currentPage + 2) {
            return <span key={p} style={{ color: '#cbd5e1', padding: '0 4px', display: 'inline-flex', alignItems: 'center' }}>...</span>;
          }
          return null;
        })}

        <button
          className="pat-pagination-btn"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
