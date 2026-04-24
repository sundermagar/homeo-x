import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/auth-store';

/**
 * Normalizes a raw role string from the auth store to the canonical form.
 * Handles uppercase, camelCase, and legacy role names used in demo tokens.
 */
function normalizeRole(raw: string | null | undefined): string {
  if (!raw) return '';
  const r = raw.toLowerCase().replace(/\s/g, '');
  if (r === 'superadmin') return 'SuperAdmin';
  if (r === 'admin' || r === 'hmis_admin') return 'Admin';
  if (r === 'clinicadmin') return 'Clinicadmin';
  if (r === 'doctor' || r === 'hmis_doctor') return 'Doctor';
  if (r === 'receptionist') return 'Receptionist';
  return raw; // pass through for unknown roles
}

/**
 * RoleGuard — redirects to dashboard if the current user's role
 * is not in the `allowed` list. Role comparison is case-insensitive
 * and handles legacy role name variants.
 */
export function RoleGuard({
  allowed,
  children,
}: {
  allowed: string[];
  children: React.ReactNode;
}) {
  const rawType = useAuthStore((s) => (s.user as any)?.type || (s.user as any)?.role);
  const userRole = normalizeRole(rawType);

  if (!userRole || !allowed.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
