import { useLocation } from 'react-router-dom';
import { Search, Bell, HelpCircle, Menu } from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth-store';
import './header.css';

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
    <header className="global-header">
      {/* Left: Menu Toggle (Mobile) + Breadcrumbs */}
      <div className="global-header__left">
        <button
          onClick={onMenuClick}
          className="global-header__menu-btn mobile-only"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        <h2 className="global-header__breadcrumb">{getBreadcrumb()}</h2>
      </div>

      {/* Right: Actions & Profile */}
      <div className="global-header__right">
        <div className="global-header__actions">
          <button className="global-header__action-btn" aria-label="Search">
            <Search size={20} />
          </button>
          <button className="global-header__action-btn" aria-label="Notifications">
            <Bell size={20} />
          </button>
          <button className="global-header__action-btn" aria-label="Help">
            <HelpCircle size={20} />
          </button>
        </div>

        <div className="global-header__profile">
          <div className="global-header__profile-text">
            <div className="global-header__profile-name">{user?.name || 'Doctor'}</div>
            <div className="global-header__profile-role">Primary Physician</div>
          </div>
          <div className="global-header__avatar">
            {user?.name?.[0] || 'D'}
          </div>
        </div>
      </div>
    </header>
  );
}
