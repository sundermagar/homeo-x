import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Infinity, Search } from 'lucide-react';
import { Sidebar } from '../components/sidebar';
import { DashboardHeader } from '../components/dashboard-header';
import { CommandPalette } from '../components/command-palette';
import { ScrollToTop } from '../components/scroll-to-top';
import { useMobile } from '../hooks/use-mobile';
import { useCallback, useEffect } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { AppointmentFormDrawer } from '@/features/appointments/components/appointment-form-drawer';

export function AppLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [appointmentDrawerOpen, setAppointmentDrawerOpen] = useState(false);
  const isMobile = useMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // ── Global ⌘K / Ctrl+K shortcut ──
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setPaletteOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
              <span className="sidebar-brand" style={{ fontSize: '1rem' }}>{user?.clinicName || 'Kreed.health'}</span>
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
        <DashboardHeader 
          onOpenPalette={() => setPaletteOpen(true)} 
          onNewAppointment={() => setAppointmentDrawerOpen(true)}
        />
        <div className="page-content-area">
          <div className="page-content-row">
            {/* {location.pathname !== '/' && location.pathname !== '/login' && (
              <div className="page-back-widget-area">
                <button
                  className="page-back-widget"
                  onClick={() => navigate(-1)}
                  aria-label="Go back"
                >
                  <ArrowLeft size={16} strokeWidth={2.5} />
                </button>
              </div>
            )} */}
            <div className="page-content-main">
              <Outlet />
            </div>
          </div>
        </div>
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      
      <AppointmentFormDrawer 
        isOpen={appointmentDrawerOpen} 
        onClose={() => setAppointmentDrawerOpen(false)}
        onSuccess={() => {
          // If we are on the appointments page, we might want to refresh the list
          // But since it's a global drawer, the child components should handle their own refresh via react-query if applicable
        }}
      />
    </div>
  );
}
