import React from 'react';

export function CaseDetailSkeleton() {
  return (
    <div className="mc-legacy-layout animate-fade-in">
      {/* Top Bar Skeleton */}
      <div className="mc-legacy-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton-box skeleton-text" style={{ width: '30%', height: 24 }} />
        <div className="flex gap-4">
          <div className="skeleton-box" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <div className="skeleton-box" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <div className="skeleton-box" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <div className="skeleton-box" style={{ width: 100, height: 20 }} />
        </div>
      </div>

      {/* Sub Bar Skeleton */}
      <div className="mc-legacy-sub-bar" style={{ display: 'flex', gap: 12, padding: '12px 20px' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div key={i} className="skeleton-box" style={{ width: 36, height: 36, borderRadius: 10 }} />
        ))}
      </div>

      <div className="mc-legacy-main" style={{ height: 'calc(100vh - 160px)', display: 'flex' }}>
        <div className="mc-legacy-content" style={{ flex: 1, padding: 16 }}>
          <div className="mc-legacy-panes" style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.2fr', gap: 16, height: '100%' }}>
            {/* Col 1 */}
            <div className="mc-legacy-pane" style={{ padding: 20 }}>
              <div className="skeleton-box skeleton-text title" style={{ width: '60%', marginBottom: 20 }} />
              {[1, 2, 3].map(i => (
                <div key={i} style={{ marginBottom: 24 }}>
                  <div className="skeleton-box skeleton-text" style={{ width: '40%', height: 10, marginBottom: 8 }} />
                  <div className="skeleton-box" style={{ width: '100%', height: 60, borderRadius: 8 }} />
                </div>
              ))}
            </div>
            {/* Col 2 */}
            <div className="mc-legacy-pane" style={{ padding: 0 }}>
              <div className="skeleton-box" style={{ width: '100%', height: '100%' }} />
            </div>
            {/* Col 3 */}
            <div className="mc-legacy-pane" style={{ padding: 20 }}>
              <div className="skeleton-box skeleton-text title" style={{ width: '60%', marginBottom: 20 }} />
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="mb-6">
                  <div className="skeleton-box skeleton-text" style={{ width: '40%', height: 12, marginBottom: 12 }} />
                  <div className="skeleton-box" style={{ width: '100%', height: 100, borderRadius: 12 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
