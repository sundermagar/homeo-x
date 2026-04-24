import { useAuthStore } from '@/shared/stores/auth-store';
import { Role } from '@mmc/types';
import { DoctorDashboard } from './doctor-dashboard';
import { AdminDashboard } from './admin-dashboard';
import { ClinicAdminDashboard } from './clinic-admin-dashboard';
import { ReceptionistDashboard } from './receptionist-dashboard';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  // Default to Doctor Dashboard if no user or role found (should not happen with protected routes)
  if (!user) return null;

  const role = user.type;

  switch (role) {
    case Role.Doctor:
      return <DoctorDashboard />;
    
    case Role.Admin:
    case Role.SuperAdmin:
      return <AdminDashboard />;
    
    case Role.Clinicadmin:
      return <ClinicAdminDashboard />;
    
    case Role.Receptionist:
      return <ReceptionistDashboard />;
    
    default:
      // Fallback to Admin Dashboard for other roles (Account, etc.)
      return <AdminDashboard />;
  }
}
