import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokenPayload } from '@mmc/types';

interface AuthState {
  token: string | null;
  user: AuthTokenPayload | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: AuthTokenPayload) => void;
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
