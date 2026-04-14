import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { LayoutDashboard, Users, UsersRound, Calendar, FileText, LogOut, X, Briefcase, ChevronDown, ChevronRight, Circle } from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth-store';

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
    { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
    { label: 'Patients', icon: <Users size={20} />, path: '/patients' },
    { label: 'Consultations', icon: <FileText size={20} />, path: '/consultation-history' },
    { label: 'Appointments', icon: <Calendar size={20} />, path: '/appointments' },
    { label: 'Staff & Admin', icon: <Briefcase size={20} />, path: '/staff' },
    { label: 'Family Groups', icon: <UsersRound size={20} />, path: '/family-groups' },
    { 
      label: 'Operations Hub', 
      icon: <LayoutDashboard size={20} />,
      subItems: [
        { label: 'Logistics & Couriers', path: '/operations?tab=logistics' },
        { label: 'Lead CRM & Promos', path: '/operations?tab=crm' },
        { label: 'Medical Knowledge base', path: '/operations?tab=knowledge' },
        { label: 'Global Data Tools', path: '/operations?tab=tools' },
      ]
    },
  ];

  const activeStyle = {
    background: '#eef2ff',
    color: '#6366f1',
    fontWeight: 700
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 40
          }}
          className="mobile-only"
        />
      )}

      <div style={{
        width: 'var(--sidebar-width)',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 50,
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)'
      }} className="sidebar-container">
        {/* Brand & Close Button (Mobile) */}
        <div style={{
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-light)'
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
            <span style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', letterSpacing: '-0.02em' }}>HomeoX</span>
          </div>
          <button onClick={onClose} className="mobile-only" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {menuItems.map((item) => (
            <div key={item.label}>
              {item.subItems ? (
                <>
                  <button
                    onClick={() => toggleFolder(item.label)}
                    className="nav-item-hover"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#64748b',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {item.icon}
                      {item.label}
                    </div>
                    {expandedFolders[item.label] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {expandedFolders[item.label] && (
                    <div style={{ paddingLeft: 38, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {item.subItems.map(subItem => (
                        <NavLink
                          key={subItem.label}
                          to={subItem.path}
                          onClick={onClose}
                          style={({ isActive }) => {
                            // Check if current search param matches this path's param
                            const isSearchActive = location.search === subItem.path.split('?')[1] ? '?' + location.search : false;
                            const reallyActive = isActive && location.search.includes(subItem.path.split('=')[1]);
                            return {
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '8px 12px',
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: reallyActive ? 600 : 400,
                              color: reallyActive ? '#4f46e5' : '#64748b',
                              background: reallyActive ? '#eef2ff' : 'transparent',
                              transition: 'all 0.2s',
                            };
                          }}
                          className={({ isActive }) => isActive && location.search.includes(subItem.path.split('=')[1]) ? '' : 'nav-subitem-hover'}
                        >
                          <Circle size={6} fill="currentColor" />
                          {subItem.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <NavLink
                  to={item.path!}
                  end
                  onClick={onClose}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 16px',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#6366f1' : '#64748b',
                    background: isActive ? '#eef2ff' : 'transparent',
                    transition: 'all 0.2s',
                  })}
                  className={({ isActive }) => isActive ? '' : 'nav-item-hover'}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: 16, borderTop: '1px solid var(--border-light)' }}>
          <button
            onClick={logout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 16px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              color: '#ef4444',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>

        <style>{`
          .nav-item-hover:hover {
            background: #f8fafc;
            color: #0f172a;
          }
          .nav-subitem-hover:hover {
            color: #0f172a !important;
          }
          @media (min-width: 1024px) {
            .sidebar-container {
              position: sticky !important;
              transform: none !important;
            }
          }
        `}</style>
      </div>
    </>
  );
}
