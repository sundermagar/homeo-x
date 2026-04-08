import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '@/shared/stores/auth-store';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Could validate token on mount, refresh if needed
  }, [isAuthenticated]);

  return <>{children}</>;
}
