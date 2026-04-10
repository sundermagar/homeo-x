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
      token: 'dev-token',
      user: { id: '1', email: 'admin@dev.local', name: 'Dr. Sunder Magar', role: 'ADMIN', clinicId: 1 } as any,
      isAuthenticated: true,
      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    { name: 'mmc-auth' },
  ),
);
