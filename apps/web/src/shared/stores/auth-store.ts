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
  user: (AuthTokenPayload & { permissions?: Permissions }) | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: AuthTokenPayload & { permissions?: Permissions }) => void;
  logout: () => void;
  finishLoading: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setAuth: (user) => set({ user, isAuthenticated: true, isLoading: false }),
  logout: () => set({ user: null, isAuthenticated: false, isLoading: false }),
  finishLoading: () => set({ isLoading: false }),
}));
