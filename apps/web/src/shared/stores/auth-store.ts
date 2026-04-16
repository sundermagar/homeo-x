import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokenPayload } from '@mmc/types';

export interface Permissions {
  canAccessDashboard: boolean;
  canAccessQuickAccess: boolean;
  canViewPatientDetail: boolean;
  canCreatePatient: boolean;
  canEditPatient: boolean;
  canDeletePatient: boolean;
  canViewBilling: boolean;
  canViewExpenses: boolean;
  canViewAnalytics: boolean;
  canViewDoctors: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewPackageHistory: boolean;
  canNewPatientBtn: boolean;
  [key: string]: boolean;
}

interface AuthState {
  token: string | null;
  user: (AuthTokenPayload & { permissions?: Permissions }) | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: AuthTokenPayload & { permissions?: Permissions }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    { name: 'mmc-auth' },
  ),
);
