import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  rememberMe: boolean;
  setAuth: (
    token: string,
    user: AuthTokenPayload & { permissions?: Permissions },
    rememberMe?: boolean,
  ) => void;
  logout: () => void;
  clearAuth: () => void;
}

/**
 * Custom storage that delegates to localStorage or sessionStorage
 * based on the `rememberMe` flag stored in localStorage.
 */
const mmcStorage = {
  getItem: (name: string): string | null => {
    // Check localStorage first (persistent sessions)
    const persisted = localStorage.getItem(name);
    if (persisted) return persisted;
    // Fall back to sessionStorage (session-only)
    return sessionStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    try {
      const parsed = JSON.parse(value);
      const remember = parsed?.state?.rememberMe ?? false;
      if (remember) {
        localStorage.setItem(name, value);
        sessionStorage.removeItem(name);
      } else {
        sessionStorage.setItem(name, value);
        localStorage.removeItem(name);
      }
    } catch {
      sessionStorage.setItem(name, value);
    }
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      rememberMe: false,
      setAuth: (token, user, rememberMe = false) =>
        set({ token, user, isAuthenticated: true, rememberMe }),
      logout: () => set({ token: null, user: null, isAuthenticated: false, rememberMe: false }),
      clearAuth: () => set({ token: null, user: null, isAuthenticated: false, rememberMe: false }),
    }),
    {
      name: 'mmc-auth',
      storage: createJSONStorage(() => mmcStorage),
    },
  ),
);
