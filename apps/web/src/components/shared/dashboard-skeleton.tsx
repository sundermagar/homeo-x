export function DashboardSkeleton({ role = 'doctor' }: { role?: 'clinic-admin' | 'doctor' | 'receptionist' }) {
  if (role === 'clinic-admin') {
    return (
      <div className="cad-container animate-fade-in sa-loading-skeleton" style={{ padding: '24px' }}>
        <div className="cad-kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="cad-kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--pp-warm-4)' }}>
              <div className="skeleton-box" style={{ width: '60%', height: '24px', borderRadius: '4px' }} />
              <div className="skeleton-box" style={{ width: '40%', height: '12px', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
        <div className="cad-grid-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="cad-panel" style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--pp-warm-4)', minHeight: '250px' }}>
              <div className="skeleton-box" style={{ width: '40%', height: '20px', marginBottom: '24px', borderRadius: '4px' }} />
              <div className="skeleton-box" style={{ width: '100%', height: '40px', marginBottom: '16px', borderRadius: '8px' }} />
              <div className="skeleton-box" style={{ width: '100%', height: '40px', marginBottom: '16px', borderRadius: '8px' }} />
              <div className="skeleton-box" style={{ width: '100%', height: '40px', borderRadius: '8px' }} />
            </div>
          ))}
        </div>
        <div className="cad-grid-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
          {[1, 2].map(i => (
            <div key={i} className="cad-panel" style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--pp-warm-4)', minHeight: '250px' }}>
              <div className="skeleton-box" style={{ width: '40%', height: '20px', marginBottom: '24px', borderRadius: '4px' }} />
              <div className="skeleton-box" style={{ width: '100%', height: '40px', marginBottom: '16px', borderRadius: '8px' }} />
              <div className="skeleton-box" style={{ width: '100%', height: '40px', borderRadius: '8px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (role === 'receptionist') {
    return (
      <div className="dash-root receptionist-dashboard-panel sa-loading-skeleton">
        {/* Skeleton KPI Strip */}
        <div className="dash-kpi-strip" style={{ gap: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(200px, 1fr))' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="dash-kpi-item" style={{ minHeight: '110px', padding: '16px' }}>
              <div className="skeleton-box skeleton-text" style={{ width: '40%' }} />
              <div className="skeleton-box skeleton-text title" style={{ width: '60%', margin: '12px 0', height: '24px' }} />
            </div>
          ))}
        </div>

        {/* Quick Operations */}
        <div className="rd-quick-ops-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '16px', marginBottom: '24px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="rd-quick-op-btn" style={{ background: 'var(--bg-card)', border: '1px solid var(--pp-warm-4)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div className="skeleton-box skeleton-circle" style={{ width: '40px', height: '40px', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton-box skeleton-text" style={{ width: '60%', margin: 0 }} />
                <div className="skeleton-box skeleton-text" style={{ width: '40%', margin: 0, height: '12px' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {[1, 2, 3].map((col) => (
            <div key={col} className="rd-compact-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--pp-warm-4)', borderRadius: '12px', padding: '16px', minHeight: '400px' }}>
              <div className="skeleton-box skeleton-text" style={{ width: '40%', marginBottom: '24px', height: '20px' }} />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div className="skeleton-box skeleton-circle" style={{ width: '32px', height: '32px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton-box skeleton-text" style={{ width: '50%', marginBottom: '6px' }} />
                    <div className="skeleton-box skeleton-text" style={{ width: '30%', height: '12px', margin: 0 }} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          {[1, 2].map((col) => (
            <div key={col} className="rd-compact-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--pp-warm-4)', borderRadius: '12px', padding: '16px', minHeight: '300px' }}>
              <div className="skeleton-box skeleton-text" style={{ width: '30%', marginBottom: '24px', height: '20px' }} />
              <div className="skeleton-box" style={{ width: '100%', height: '100px', borderRadius: '8px', marginBottom: '16px' }} />
              <div className="skeleton-box" style={{ width: '100%', height: '100px', borderRadius: '8px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Doctor skeleton (default)
  return (
    <div className="dash-root dd-v2-grid">
      {/* Top Row: Active Consultation & Timeline */}
      <div className="dd-v2-top-row">
        <div className="dd-active-green" style={{ minHeight: '340px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="skeleton-box" style={{ width: '40%', height: '16px', marginBottom: '16px', borderRadius: '4px' }} />
          <div className="skeleton-box" style={{ width: '60%', height: '32px', marginBottom: '16px', borderRadius: '8px' }} />
          <div className="skeleton-box" style={{ width: '50%', height: '16px', marginBottom: '24px', borderRadius: '4px' }} />
          <div className="skeleton-box" style={{ width: '100%', height: '60px', marginBottom: '24px', borderRadius: '8px' }} />
          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="skeleton-box" style={{ width: '180px', height: '44px', borderRadius: '8px' }} />
            <div className="skeleton-box" style={{ width: '120px', height: '44px', borderRadius: '8px' }} />
          </div>
        </div>

        <div className="dd-timeline-card" style={{ padding: '24px' }}>
          <div className="skeleton-box" style={{ width: '120px', height: '24px', marginBottom: '24px', borderRadius: '4px' }} />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
              <div className="skeleton-box" style={{ width: '48px', height: '16px', borderRadius: '4px' }} />
              <div className="skeleton-box skeleton-circle" style={{ width: '12px', height: '12px', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton-box" style={{ width: '60%', height: '16px', borderRadius: '4px' }} />
                <div className="skeleton-box" style={{ width: '40%', height: '12px', borderRadius: '4px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Middle Row: Quick Actions */}
      <div className="dd-v2-actions-row">
        {[1, 2, 3].map(i => (
          <div key={i} className={`dd-action-card ${i === 1 ? 'primary' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px' }}>
            <div className="skeleton-box skeleton-circle" style={{ width: '48px', height: '48px', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="skeleton-box" style={{ width: '80%', height: '16px', borderRadius: '4px' }} />
              <div className="skeleton-box" style={{ width: '50%', height: '12px', borderRadius: '4px' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Row: Lists */}
      <div className="dd-v2-bottom-row">
        {[1, 2].map(listIdx => (
          <div key={listIdx} className="dd-list-card" style={{ padding: '24px' }}>
            <div className="skeleton-box" style={{ width: '140px', height: '24px', marginBottom: '24px', borderRadius: '4px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="dd-list-item" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div className="skeleton-box skeleton-circle" style={{ width: '40px', height: '40px', flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="skeleton-box" style={{ width: '60%', height: '16px', borderRadius: '4px' }} />
                    <div className="skeleton-box" style={{ width: '40%', height: '12px', borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
