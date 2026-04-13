import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Infinity } from 'lucide-react';
import { Sidebar } from '../components/sidebar';
import { useMobile } from '../hooks/use-mobile';

export function AppLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMobile();

  return (
    <div className="app-container">
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
              <span className="sidebar-brand" style={{ fontSize: '1rem' }}>HomeoX</span>
            </div>
          </div>
        </header>
      )}

      {/* Adaptive Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
