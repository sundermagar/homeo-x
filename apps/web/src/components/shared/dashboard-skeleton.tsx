export function DashboardSkeleton() {
  return (
    <div className="dash-root doctor-dashboard-panel">
      {/* Skeleton KPI Strip */}
      <div className="dash-kpi-strip">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="dash-kpi-item" style={{ minHeight: '110px' }}>
            <div className="skeleton-box skeleton-text" style={{ width: '40%' }} />
            <div className="skeleton-box skeleton-text title" style={{ width: '60%', margin: '12px 0' }} />
            <div className="skeleton-box skeleton-text" style={{ width: '30%', marginBottom: 0 }} />
          </div>
        ))}
      </div>

      <div className="dash-grid">
        {/* Skeleton Main Column */}
        <div className="dash-main-col">
          {/* Skeleton Active Consultation */}
          <div className="dd-active-head-up" style={{ minHeight: '340px' }}>
            <div className="dd-hud-header">
              <div className="skeleton-box skeleton-text" style={{ width: '120px', marginBottom: 0 }} />
              <div className="skeleton-box skeleton-text" style={{ width: '80px', marginBottom: 0 }} />
            </div>
            <div className="dd-hud-body" style={{ display: 'block' }}>
              <div className="skeleton-box skeleton-text title" style={{ width: '35%' }} />
              <div className="skeleton-box skeleton-text" style={{ width: '55%' }} />
              <div style={{ display: 'flex', gap: '32px', margin: '24px 0', padding: '24px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
                 <div className="skeleton-box" style={{ width: '60px', height: '40px', borderRadius: '8px' }} />
                 <div className="skeleton-box" style={{ width: '70px', height: '40px', borderRadius: '8px' }} />
                 <div className="skeleton-box" style={{ width: '65px', height: '40px', borderRadius: '8px' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                 <div className="skeleton-box" style={{ width: '160px', height: '36px', borderRadius: '10px' }} />
                 <div className="skeleton-box" style={{ width: '80px', height: '36px', borderRadius: '10px' }} />
              </div>
            </div>
          </div>

          {/* Skeleton Patient Queue */}
          <div className="dash-card">
            <div className="dash-card-header">
               <div className="skeleton-box skeleton-text" style={{ width: '100px', marginBottom: 0 }} />
               <div className="skeleton-box skeleton-text" style={{ width: '140px', marginBottom: 0 }} />
            </div>
            <div className="dash-card-body" style={{ padding: '0 8px' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="dash-row" style={{ padding: '16px 8px' }}>
                   <div className="skeleton-box skeleton-circle" style={{ width: '32px', height: '32px' }} />
                   <div style={{ flex: 1, marginLeft: '12px' }}>
                     <div className="skeleton-box skeleton-text" style={{ width: '30%', marginBottom: '8px' }} />
                     <div className="skeleton-box skeleton-text" style={{ width: '20%', marginBottom: 0 }} />
                   </div>
                   <div className="skeleton-box" style={{ width: '60px', height: '24px', borderRadius: '12px' }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skeleton Sidebar */}
        <aside className="dash-sidebar">
          <div className="dash-sidebar-card">
            <div className="skeleton-box skeleton-text" style={{ width: '120px', marginBottom: '20px' }} />
            {[1, 2].map((i) => (
               <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '12px', padding: '12px', background: '#f8fafc', borderRadius: '12px' }}>
                  <div className="skeleton-box skeleton-circle" style={{ width: '8px', height: '8px', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                     <div className="skeleton-box skeleton-text" style={{ width: '100%' }} />
                     <div className="skeleton-box skeleton-text" style={{ width: '70%' }} />
                  </div>
               </div>
            ))}
          </div>
          
          <div className="dash-sidebar-card">
            <div className="skeleton-box skeleton-text" style={{ width: '140px', marginBottom: '20px' }} />
            {[1, 2, 3].map((i) => (
               <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i !== 3 ? '1px solid #f1f5f9' : 'none' }}>
                  <div>
                     <div className="skeleton-box skeleton-text" style={{ width: '90px', marginBottom: '6px' }} />
                     <div className="skeleton-box skeleton-text" style={{ width: '60px', marginBottom: 0 }} />
                  </div>
                  <div className="skeleton-box" style={{ width: '50px', height: '20px', borderRadius: '4px' }} />
               </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
