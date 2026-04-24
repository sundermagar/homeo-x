import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, ChevronRight, Power } from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth-store';
import { apiClient } from '@/infrastructure/api-client';

interface DashboardHeaderProps {
  onOpenPalette: () => void;
}

// ─── Route → Title Mapping ────────────────────────────────────────────────────
const ROUTE_TITLES: Record<string, string> = {
  '/':                        'Dashboard',
  '/patients':                'Patients',
  '/patients/add':            'New Patient',
  '/appointments':            'Appointments',
  '/appointments/calendar':   'Calendar',
  '/appointments/queue':      'Token Queue',
  '/medical-cases':           'Medical Cases',
  '/billing':                 'Billing',
  '/payments':                'Payments',
  '/analytics':               'Analytics',
  '/communications':          'Communications',
  '/packages':                'Packages',
  '/platform/clinics':        'Clinics',
  '/platform/accounts':       'Accounts',
};

function getPageTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  const key = Object.keys(ROUTE_TITLES).find(
    (k) => k !== '/' && pathname.startsWith(k)
  );
  return key ? (ROUTE_TITLES[key] ?? 'Dashboard') : 'Dashboard';
}

function useFormattedDate(): string {
  const [date, setDate] = useState('');
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-IN', {
      weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
    });
    setDate(fmt.format(new Date()));
    const t = setInterval(() => setDate(fmt.format(new Date())), 60_000);
    return () => clearInterval(t);
  }, []);
  return date;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function DashboardHeader({ onOpenPalette }: DashboardHeaderProps) {
  const location     = useLocation();
  const navigate     = useNavigate();
  const { user }   = useAuthStore();
  const formattedDate = useFormattedDate();

  const pageTitle  = getPageTitle(location.pathname);
  const clinicName = user?.clinicName || 'Kreed.health Clinic';

  const rawRole = ((user as any)?.type || (user as any)?.role || (user as any)?.roleName || '').toLowerCase();
  const isDoctor = rawRole === 'doctor' || rawRole === 'medical practitioner' || ((user as any)?.name || '').toLowerCase().startsWith('dr');

  const [isDoctorActive, setIsDoctorActive] = useState<boolean>(true);
  const [toggleLoading, setToggleLoading] = useState(false);

  useEffect(() => {
    if (isDoctor) {
      apiClient.get<{ success: boolean; isActive: boolean }>('/doctors/status').then(({ data }) => {
        if (typeof data.isActive === 'boolean') {
          setIsDoctorActive(data.isActive);
        }
      }).catch(() => {});
    }
  }, [isDoctor]);

  const toggleDoctorStatus = async () => {
    setToggleLoading(true);
    try {
      const { data } = await apiClient.patch<{ success: boolean; isActive: boolean }>('/doctors/status', { isActive: !isDoctorActive });
      if (data.success) {
        setIsDoctorActive(data.isActive);
      }
    } catch (err) {
      console.error('Failed to toggle status', err);
    } finally {
      setToggleLoading(false);
    }
  };

  return (
    <>
      <header className="dh-bar">
        {/* ── Left: Live Status + Page Title ── */}
        <div className="dh-left">
          <div className="dh-live-badge" style={{ 
            '--badge-bg': isDoctor && !isDoctorActive ? 'var(--pp-danger-bg)' : 'var(--pp-success-bg)',
            '--badge-border': isDoctor && !isDoctorActive ? 'var(--pp-danger-border)' : 'rgba(34, 197, 94, 0.15)',
          } as any}>
            <span className="dh-live-dot" style={{ 
              '--dot-color': isDoctor && !isDoctorActive ? 'var(--pp-danger-fg)' : 'var(--pp-success-fg)'
            } as any} />
            <span className="dh-live-text" style={{ 
              color: isDoctor && !isDoctorActive ? 'var(--pp-danger-fg)' : 'var(--pp-success-fg)' 
            }}>
              {isDoctor ? (isDoctorActive ? 'Live' : 'Offline') : 'Live'}
            </span>
          </div>

          <div className="dh-breadcrumb">
            <span className="dh-page-title">{pageTitle}</span>
            <ChevronRight size={12} className="dh-breadcrumb-sep" />
            <span className="dh-clinic-name">{clinicName}</span>
          </div>
        </div>

        {/* ── Right: Date, Command Palette trigger, Actions ── */}
        <div className="dh-right">
          <span className="dh-date">{formattedDate}</span>

          {/* Command Palette Trigger */}
          <button
            className="dh-search-wrap cp-trigger"
            onClick={onOpenPalette}
            aria-label="Open command palette"
          >
            <Search size={13} className="dh-search-icon" />
            <span className="dh-search-input" style={{ pointerEvents: 'none' }}>
              Search or jump to...
            </span>
            <kbd className="dh-kbd">⌘K</kbd>
          </button>

          {/* Primary CTA */}
          {isDoctor ? (
            <button
              className="dh-cta-btn"
              onClick={toggleDoctorStatus}
              disabled={toggleLoading}
              style={{
                backgroundColor: isDoctorActive ? 'var(--pp-danger-fg)' : 'var(--pp-success-fg)',
                color: 'white',
                border: 'none',
                minWidth: '100px',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <Power size={14} strokeWidth={2.5} style={{ marginRight: '4px' }} />
              <span className="hide-mobile">
                {toggleLoading ? 'Updating…' : (isDoctorActive ? 'Go Inactive' : 'Go Active')}
              </span>
            </button>
          ) : (
            <button
              className="dh-cta-btn"
              onClick={() => navigate('/appointments')}
              id="dh-new-appointment-btn"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span className="hide-mobile">New appointment</span>
            </button>
          )}
        </div>
      </header>
    </>
  );
}
