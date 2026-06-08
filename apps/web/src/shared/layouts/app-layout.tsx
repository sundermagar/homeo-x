import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Infinity, Search, ArrowLeft, Home, Calendar, FileText, Activity } from 'lucide-react';
import { Sidebar } from '../components/sidebar';
import { DashboardHeader } from '../components/dashboard-header';
import { CommandPalette } from '../components/command-palette';
import { ScrollToTop } from '../components/scroll-to-top';
import { useMobile } from '../hooks/use-mobile';
import { useCallback, useEffect } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { AppointmentFormDrawer } from '@/features/appointments/components/appointment-form-drawer';
import { Role } from '@mmc/types';

export function AppLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [appointmentDrawerOpen, setAppointmentDrawerOpen] = useState(false);
  const isMobile = useMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const rawRole = (
    (user as any)?.type ||
    (user as any)?.role ||
    (user as any)?.roleName ||
    ''
  ).toLowerCase();

  const isPatient =
    rawRole === 'patient' ||
    user?.type === Role.Patient;

  // ── Global ⌘K / Ctrl+K shortcut ──
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setPaletteOpen(true);
    }
  }, []);

  useEffect(() => {
    if (isPatient) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, isPatient]);

  return (
    <div className="app-container">
      <ScrollToTop />
      {/* Mobile Top Bar */}
      {isMobile && !isPatient && (
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
              <span className="sidebar-brand" style={{ fontSize: '1rem' }}>
                {user?.clinicName || 'MMC'}
              </span>
            </div>
          </div>
        </header>
      )}

      {/* Adaptive Sidebar */}
      {!isPatient && <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />}

      <main className="app-main" style={isPatient ? { marginLeft: 0, width: '100%' } : {}}>
        {!isPatient && (
          <DashboardHeader
            onOpenPalette={() => setPaletteOpen(true)}
            onNewAppointment={() => setAppointmentDrawerOpen(true)}
          />
        )}
        <div className="page-content-area" style={isPatient ? { padding: isMobile ? '0' : '24px', background: 'transparent', paddingBottom: isMobile ? '80px' : '24px' } : {}}>
          <div className="page-content-row" style={isPatient ? { maxWidth: '1400px', margin: '0 auto', width: '100%' } : {}}>
            <div className="page-content-main">
              <Outlet />
            </div>
          </div>
        </div>
      </main>

      {/* Patient Mobile Bottom Navigation Bar */}
      {isPatient && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around items-center py-2 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)]">
          <div onClick={() => navigate('/portal/select-track')} className="flex flex-col items-center gap-1 cursor-pointer text-slate-500 hover:text-blue-600 px-4 py-2 hover:bg-blue-50/50 rounded-xl transition-all">
            <Home size={22} className="stroke-[2px]" />
            <span className="text-[10px] font-semibold">Home</span>
          </div>
          <div onClick={() => navigate('/appointments')} className="flex flex-col items-center gap-1 cursor-pointer text-slate-500 hover:text-blue-600 px-4 py-2 hover:bg-blue-50/50 rounded-xl transition-all">
            <Calendar size={22} className="stroke-[2px]" />
            <span className="text-[10px] font-semibold">Appts</span>
          </div>
          <div onClick={() => navigate('/reports')} className="flex flex-col items-center gap-1 cursor-pointer text-slate-500 hover:text-blue-600 px-4 py-2 hover:bg-blue-50/50 rounded-xl transition-all">
            <FileText size={22} className="stroke-[2px]" />
            <span className="text-[10px] font-semibold">Reports</span>
          </div>
          <div onClick={() => navigate('/prescriptions')} className="flex flex-col items-center gap-1 cursor-pointer text-slate-500 hover:text-blue-600 px-4 py-2 hover:bg-blue-50/50 rounded-xl transition-all">
            <Activity size={22} className="stroke-[2px]" />
            <span className="text-[10px] font-semibold">Rx</span>
          </div>
        </div>
      )}

      {!isPatient && (
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      )}

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
