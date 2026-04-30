import './shared.css';

/**
 * Reusable page-level skeleton loader.
 *
 * Variants:
 * - `table`   → Table header + rows  (for list pages)
 * - `detail`  → Header + 2-col grid + chart area (for detail pages)
 * - `dashboard` → KPI strip + card grid (for dashboards)
 */
interface PageSkeletonProps {
  variant: 'table' | 'detail' | 'dashboard';
  rows?: number;
  cols?: number;
}

export function PageSkeleton({ variant, rows = 6, cols = 6 }: PageSkeletonProps) {
  if (variant === 'table') return <TableSkeleton rows={rows} cols={cols} />;
  if (variant === 'detail') return <DetailSkeleton />;
  return <DashboardSkeleton />;
}

/* ─── Table Skeleton ──────────────────────────────────────────────────────── */
function TableSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div className="pp-card pp-table-scroll" style={{ padding: 0 }}>
      <table className="pp-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} style={{ padding: '16px 24px' }}>
                <div className="skeleton-box" style={{ height: '12px', width: `${30 + Math.random() * 30}px`, borderRadius: '4px', opacity: 0.7 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: cols }).map((_, colIndex) => (
                <td key={colIndex} style={{ padding: '16px 24px' }}>
                  <div className="skeleton-box" style={{ height: '14px', width: colIndex === 0 ? '40px' : colIndex === 1 ? '120px' : '80px', borderRadius: '6px' }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Detail Page Skeleton ────────────────────────────────────────────────── */
function DetailSkeleton() {
  return (
    <div className="pp-page-container pp-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
        <div className="skeleton-box skeleton-circle" style={{ width: '64px', height: '64px', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton-box skeleton-text title" style={{ width: 'min(300px, 100%)', height: '28px', marginBottom: '8px' }} />
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="skeleton-box" style={{ width: '80px', height: '22px', borderRadius: '4px' }} />
            <div className="skeleton-box" style={{ width: '100px', height: '22px', borderRadius: '12px' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="skeleton-box" style={{ width: '80px', height: '36px', borderRadius: '8px' }} />
          <div className="skeleton-box" style={{ width: '80px', height: '36px', borderRadius: '8px' }} />
        </div>
      </div>

      {/* 2-col grid */}
      <div className="pp-detail-grid" style={{ marginBottom: '24px' }}>
        {[1, 2].map(i => (
          <div key={i} className="pp-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <div className="skeleton-box" style={{ width: '20px', height: '20px', borderRadius: '4px' }} />
              <div className="skeleton-box" style={{ width: '40%', height: '18px' }} />
            </div>
            {[1, 2, 3, 4].map(j => (
              <div key={j} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div className="skeleton-box skeleton-text" style={{ width: '30%', marginBottom: 0 }} />
                <div className="skeleton-box skeleton-text" style={{ width: '45%', marginBottom: 0 }} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Chart/Table area */}
      <div className="pp-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div className="skeleton-box skeleton-text" style={{ width: '150px', height: '20px', marginBottom: 0 }} />
          <div className="skeleton-box" style={{ width: '200px', height: '32px', borderRadius: '8px' }} />
        </div>
        <div className="skeleton-box" style={{ width: '100%', height: '320px', borderRadius: '12px' }} />
      </div>
    </div>
  );
}

/* ─── Dashboard Skeleton ──────────────────────────────────────────────────── */
function DashboardSkeleton() {
  return (
    <div className="pp-fade-in">
      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="pp-card" style={{ padding: '20px', minHeight: '100px' }}>
            <div className="skeleton-box skeleton-text" style={{ width: '40%' }} />
            <div className="skeleton-box skeleton-text title" style={{ width: '60%', margin: '12px 0' }} />
            <div className="skeleton-box skeleton-text" style={{ width: '30%', marginBottom: 0 }} />
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <div className="pp-card" style={{ padding: '24px' }}>
          <div className="skeleton-box skeleton-text" style={{ width: '120px', marginBottom: '20px' }} />
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 0', borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none' }}>
              <div className="skeleton-box skeleton-circle" style={{ width: '32px', height: '32px' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-box skeleton-text" style={{ width: '30%', marginBottom: '8px' }} />
                <div className="skeleton-box skeleton-text" style={{ width: '20%', marginBottom: 0 }} />
              </div>
              <div className="skeleton-box" style={{ width: '60px', height: '24px', borderRadius: '12px' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
