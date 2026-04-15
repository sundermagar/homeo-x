import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Users, UsersRound, Calendar, FileText, LogOut,
  X, Briefcase, ChevronDown, ChevronRight, Circle
} from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth-store';
import './sidebar.css';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'Operations Hub': location.pathname.includes('/operations')
  });

  const toggleFolder = (label: string) => {
    setExpandedFolders(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const menuItems = [
    { label: 'Dashboard',        icon: <LayoutDashboard size={20} />, path: '/' },
    { label: 'Patients',         icon: <Users size={20} />,           path: '/patients' },
    { label: 'Consultations',    icon: <FileText size={20} />,        path: '/appointments/queue' },
    { label: 'Appointments',     icon: <Calendar size={20} />,        path: '/appointments' },
    { label: 'Staff & Admin',    icon: <Briefcase size={20} />,       path: '/staff' },
    { label: 'Family Groups',    icon: <UsersRound size={20} />,      path: '/family-groups' },
    {
      label: 'Operations Hub',
      icon: <LayoutDashboard size={20} />,
      subItems: [
        { label: 'Logistics & Couriers',      path: '/operations?tab=logistics' },
        { label: 'Lead CRM & Promos',         path: '/operations?tab=crm' },
        { label: 'Medical Knowledge base',    path: '/operations?tab=knowledge' },
        { label: 'Global Data Tools',         path: '/operations?tab=tools' },
      ]
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="sidebar-backdrop mobile-only"
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
        {/* Brand & Close */}
        <div className="sidebar__brand">
          <div className="sidebar__brand-inner">
            <div className="sidebar__logo">HX</div>
            <span className="sidebar__brand-name">HomeoX</span>
          </div>
          <button onClick={onClose} className="sidebar__close-btn mobile-only" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar__nav">
          {menuItems.map((item) => (
            <div key={item.label}>
              {item.subItems ? (
                <>
                  <button
                    onClick={() => toggleFolder(item.label)}
                    className="sidebar__folder-btn"
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {item.icon}
                      {item.label}
                    </span>
                    {expandedFolders[item.label] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {expandedFolders[item.label] && (
                    <div className="sidebar__folder-content">
                      {item.subItems.map(subItem => {
                        const param = subItem.path.split('=')[1] || '';
                        const isActive = location.pathname.startsWith('/operations') && location.search.includes(param);
                        return (
                          <NavLink
                            key={subItem.label}
                            to={subItem.path}
                            onClick={onClose}
                            className={`sidebar__sub-item ${isActive ? 'sidebar__sub-item--active' : ''}`}
                          >
                            <Circle size={6} fill="currentColor" />
                            {subItem.label}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                <NavLink
                  to={item.path!}
                  end
                  onClick={onClose}
                  className={({ isActive }) =>
                    `sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar__footer">
          <button onClick={logout} className="sidebar__signout-btn">
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
