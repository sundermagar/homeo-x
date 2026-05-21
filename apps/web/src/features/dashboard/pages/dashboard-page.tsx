import { lazy, Suspense } from 'react';
import { useAuthStore } from '@/shared/stores/auth-store';
import { Role } from '@mmc/types';

// ── Lazy-loaded dashboard variants ──────────────────────────────────────────
// Each dashboard is code-split into its own chunk so only the active role's
// code is downloaded. This reduces the initial bundle by ~40-80 KB per
// unused dashboard (charts, tables, role-specific components).
const DoctorDashboard = lazy(() =>
  import('./doctor-dashboard').then((m) => ({ default: m.DoctorDashboard }))
);
const AdminDashboard = lazy(() =>
  import('./admin-dashboard').then((m) => ({ default: m.AdminDashboard }))
);
const ClinicAdminDashboard = lazy(() =>
  import('./clinic-admin-dashboard').then((m) => ({ default: m.ClinicAdminDashboard }))
);
const ReceptionistDashboard = lazy(() =>
  import('./receptionist-dashboard').then((m) => ({ default: m.ReceptionistDashboard }))
);

/** Minimal loading skeleton shown while dashboard chunk downloads. */
function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', opacity: 0.5 }}>
      <div style={{ textAlign: 'center' }}>
        <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 12px' }} />
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Loading dashboard…</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  // Default to Doctor Dashboard if no user or role found (should not happen with protected routes)
  if (!user) return null;

  const role = user.type;

  let DashboardComponent: React.LazyExoticComponent<React.ComponentType>;

  switch (role) {
    case Role.Doctor:
      DashboardComponent = DoctorDashboard;
      break;
    case Role.Admin:
    case Role.SuperAdmin:
      DashboardComponent = AdminDashboard;
      break;
    case Role.Clinicadmin:
      DashboardComponent = ClinicAdminDashboard;
      break;
    case Role.Receptionist:
      DashboardComponent = ReceptionistDashboard;
      break;
    default:
      // Fallback to Admin Dashboard for other roles (Account, etc.)
      DashboardComponent = AdminDashboard;
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardComponent />
    </Suspense>
  );
}
