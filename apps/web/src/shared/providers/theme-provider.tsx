import { useEffect, type ReactNode } from 'react';
import { useUiStore } from '@/shared/stores/ui-store';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const darkMode = useUiStore((s) => s.darkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return <>{children}</>;
}
