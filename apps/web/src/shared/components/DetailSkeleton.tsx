import React from 'react';

interface DetailSkeletonProps {
  type?: 'patient' | 'case';
}

export function DetailSkeleton({ type = 'patient' }: DetailSkeletonProps) {
  return (
    <div className="pp-page-container animate-fade-in" style={{ padding: 0 }}>
      {/* Header Skeleton */}
      <div className="pat-header" style={{ marginBottom: 40 }}>
        <div className="skeleton-box" style={{ width: 80, height: 80, borderRadius: '24px' }} />
        <div className="pat-header-info" style={{ gap: 12 }}>
          <div className="skeleton-box skeleton-text" style={{ width: '40%', height: 32 }} />
          <div className="flex gap-4">
            <div className="skeleton-box skeleton-text" style={{ width: 120, height: 16 }} />
            <div className="skeleton-box skeleton-text" style={{ width: 80, height: 16 }} />
            <div className="skeleton-box skeleton-text" style={{ width: 150, height: 16 }} />
          </div>
        </div>
        <div className="pat-header-actions" style={{ gap: 12 }}>
          <div className="skeleton-box" style={{ width: 100, height: 40, borderRadius: 8 }} />
          <div className="skeleton-box" style={{ width: 100, height: 40, borderRadius: 8 }} />
        </div>
      </div>

      <div className="pp-detail-grid" style={{ gap: 24, marginBottom: 24 }}>
        <div className="pp-card-premium" style={{ height: 300, padding: 24 }}>
          <div className="skeleton-box skeleton-text title" style={{ width: '50%', marginBottom: 24 }} />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex justify-between mb-4">
              <div className="skeleton-box skeleton-text" style={{ width: '30%', height: 12 }} />
              <div className="skeleton-box skeleton-text" style={{ width: '40%', height: 12 }} />
            </div>
          ))}
        </div>
        <div className="pp-card-premium" style={{ height: 300, padding: 24 }}>
          <div className="skeleton-box skeleton-text title" style={{ width: '50%', marginBottom: 24 }} />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex justify-between mb-4">
              <div className="skeleton-box skeleton-text" style={{ width: '30%', height: 12 }} />
              <div className="skeleton-box skeleton-text" style={{ width: '40%', height: 12 }} />
            </div>
          ))}
        </div>
      </div>

      <div className="pp-card-premium" style={{ height: 400, padding: 24 }}>
        <div className="skeleton-box skeleton-text title" style={{ width: '30%', marginBottom: 24 }} />
        <div className="skeleton-box" style={{ width: '100%', height: 280, borderRadius: 12 }} />
      </div>
    </div>
  );
}
