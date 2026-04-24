import { useLocation } from 'react-router-dom';
import { Bell, HelpCircle, Menu } from 'lucide-react';
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
    <header className="gh-bar">
      {/* Left: Menu Toggle (Mobile) + Breadcrumbs */}
      <div className="gh-left">
        <button
          onClick={onMenuClick}
          className="gh-menu-btn mobile-only"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <h2 className="gh-breadcrumb">{getBreadcrumb()}</h2>
      </div>

      {/* Right: Actions & Profile */}
      <div className="gh-right">
        <div className="gh-icon-row">
          <Bell size={20} className="gh-icon" />
          <HelpCircle size={20} className="gh-icon" />
        </div>

        <div className="gh-profile">
          <div className="gh-profile-info">
            <div className="gh-profile-name">{user?.name || 'Doctor'}</div>
            <div className="gh-profile-role">Primary Physician</div>
          </div>
          <div className="gh-avatar">
            {user?.name?.[0] || 'D'}
          </div>
        </div>
      </div>
    </header>
  );
}
