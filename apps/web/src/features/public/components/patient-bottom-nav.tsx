import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Home, CalendarDays, FileText, Pill, User } from 'lucide-react';

const navItems = [
  { key: 'home', label: 'Home', icon: Home, path: '' },
  { key: 'appointments', label: 'Appts', icon: CalendarDays, path: '/appointments' },
  { key: 'reports', label: 'Reports', icon: FileText, path: '/reports' },
  { key: 'prescriptions', label: 'Rx', icon: Pill, path: '/prescriptions' },
  { key: 'profile', label: 'Profile', icon: User, path: '/profile' },
];

export const PatientBottomNav: React.FC = () => {
  const { phone } = useParams<{ phone: string }>();
  const location = useLocation();
  const basePath = `/patient/${phone}`;

  const getActiveKey = () => {
    const path = location.pathname;
    if (path.endsWith('/appointments')) return 'appointments';
    if (path.endsWith('/reports')) return 'reports';
    if (path.endsWith('/prescriptions')) return 'prescriptions';
    if (path.endsWith('/profile')) return 'profile';
    return 'home';
  };

  const activeKey = getActiveKey();

  return (
    <nav className="patient-bottom-nav" id="patient-bottom-nav">
      {navItems.map(item => {
        const isActive = item.key === activeKey;
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            to={`${basePath}${item.path}`}
            className={`patient-nav-item ${isActive ? 'active' : ''}`}
            id={`patient-nav-${item.key}`}
          >
            <div className="patient-nav-icon-wrap">
              <Icon size={20} />
            </div>
            <span className="patient-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
