import { Outlet } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>
      {/* Simple Public Header */}
      <header style={{ 
        height: 64, 
        background: 'white', 
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32,
            height: 32,
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 800,
            fontSize: 14
          }}>HX</div>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', letterSpacing: '-0.02em' }}>HomeoX Clinics</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: 24, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 1200 }}>
          <Outlet />
        </div>
      </main>

      <footer style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        © {new Date().getFullYear()} HomeoX. All Rights Reserved.
      </footer>
    </div>
  );
}
