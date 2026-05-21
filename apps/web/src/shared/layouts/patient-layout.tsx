import { useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Menu, Infinity, Search, Plus, Calendar, FileText, Pill, User, LogOut, Sun, Moon, X, Bell, ChevronRight, Home } from 'lucide-react';
import { ScrollToTop } from '@/shared/components/scroll-to-top';
import { useMobile } from '@/shared/hooks/use-mobile';
import { usePatientAuthStore } from '@/shared/stores/patient-auth-store';
import { usePublicClinicalData } from '@/features/public/hooks/use-public-api';
import '../styles/sidebar.css';

export function PatientSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { phone } = useParams<{ phone: string }>();
  const logout = usePatientAuthStore((s) => s.logout);
  const patient = usePatientAuthStore((s) => s.patient);
  const navigate = useNavigate();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = patient?.name
    ? patient.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'PT';

  const menuItems = [
    { label: 'Home', icon: Home, path: `/patient/${phone}` },
    { label: 'Appointments', icon: Calendar, path: `/patient/${phone}/appointments` },
    { label: 'Reports', icon: FileText, path: `/patient/${phone}/reports` },
    { label: 'Prescriptions', icon: Pill, path: `/patient/${phone}/prescriptions` },
  ];

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? 'is-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-group">
            <div className="sidebar-logo">
              <Infinity size={20} strokeWidth={2.5} />
            </div>
            <span className="sidebar-brand">Kreed.health</span>
          </div>
          <div className="sidebar-header-actions">
            <button className="mh-menu-btn sidebar-header-close" onClick={onClose}>
              <X size={20} strokeWidth={1.6} />
            </button>
          </div>
        </div>

        <div className="sidebar-role" style={{ padding: '4px 12px', margin: '0 16px 16px', background: 'var(--bg-surface-2)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', width: 'fit-content' }}>
          👤 Patient Portal
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.path}
                end={item.path === `/patient/${phone}`}
                onClick={onClose}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="sidebar-item-icon" strokeWidth={1.8} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar" onClick={() => { navigate(`/patient/${phone}/profile`); onClose(); }} style={{ cursor: 'pointer' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                {initials}
              </span>
            </div>
            <div className="user-info" onClick={() => { navigate(`/patient/${phone}/profile`); onClose(); }} style={{ cursor: 'pointer' }}>
              <div className="user-name">{patient?.name || 'Patient'}</div>
              <div className="user-role">Patient</div>
            </div>

            <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? <Moon size={16} strokeWidth={2} /> : <Sun size={16} strokeWidth={2} />}
            </button>

            <button className="logout-btn" onClick={handleLogout} aria-label="Sign out">
              <LogOut size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

// Nav link wrapper to bypass dynamic import issues
import { NavLink } from 'react-router-dom';

export function PatientLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMobile();

  return (
    <div className="app-container">
      <ScrollToTop />
      {/* Mobile Top Bar */}
      {isMobile && (
        <header className="mobile-header">
          <div className="mh-left">
            <button
              className="mh-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={24} strokeWidth={1.6} />
            </button>
            <div className="sidebar-logo-group">
              <div className="sidebar-logo" style={{ width: 28, height: 28 }}>
                <Infinity size={18} strokeWidth={2.5} />
              </div>
              <span className="sidebar-brand" style={{ fontSize: '1rem' }}>Kreed.health</span>
            </div>
          </div>
        </header>
      )}

      {/* Adaptive Patient Sidebar */}
      <PatientSidebar
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="app-main">
        <div className="page-content-area">
          <div className="page-content-row">
            <div className="page-content-main">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
