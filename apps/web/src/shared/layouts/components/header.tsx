import { useLocation } from 'react-router-dom';
import { Search, Bell, HelpCircle, Menu } from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth-store';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function GlobalHeader({ onMenuClick }: HeaderProps) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/patients')) {
      if (path.includes('/add')) return 'Patients / Add New';
      if (path.includes('/edit')) return 'Patients / Edit Record';
      return 'Patients / Registry';
    }
    return path.slice(1).charAt(0).toUpperCase() + path.slice(2);
  };

  return (
    <header style={{
      height: 'var(--header-height)',
      background: 'white',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px', // Mobile padding
      position: 'sticky',
      top: 0,
      zIndex: 10
    }} className="header-responsive">
      {/* Left: Menu Toggle (Mobile) + Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button 
          onClick={onMenuClick}
          className="mobile-only"
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }}
        >
          <Menu size={24} />
        </button>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }} className="breadcrumb-text">{getBreadcrumb()}</h2>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .header-responsive { padding: 0 32px !important; }
          .breadcrumb-text { fontSize: 16px !important; }
        }
      `}</style>

      {/* Right: Actions & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ display: 'flex', gap: 16, color: '#94a3b8' }}>
          <Search size={20} style={{ cursor: 'pointer' }} />
          <Bell size={20} style={{ cursor: 'pointer' }} />
          <HelpCircle size={20} style={{ cursor: 'pointer' }} />
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '4px 4px 4px 16px',
          borderRadius: 40,
          background: '#f8fafc',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{user?.name || 'Doctor'}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Primary Physician</div>
          </div>
          <div style={{
            width: 32,
            height: 32,
            background: '#6366f1',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: 12
          }}>
            {user?.name?.[0] || 'D'}
          </div>
        </div>
      </div>
    </header>
  );
}
