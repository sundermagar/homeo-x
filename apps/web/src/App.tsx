import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { AppRouter } from './infrastructure/router';
import { AuthProvider } from './shared/providers/auth-provider';
import { ThemeProvider } from './shared/providers/theme-provider';
import { ErrorBoundary } from './components/shared/error-boundary';
import { Toaster } from './components/ui/toaster';
import { toast } from './hooks/use-toast';
import { useAuthStore } from './shared/stores/auth-store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60_000, // 2 minutes — reduces refetch storms
      gcTime: 10 * 60_000, // 10 minutes — frees memory for unused queries
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRouterWrapper() {
  const user = useAuthStore((s) => s.user);
  const userType = (user as any)?.type || (user as any)?.role || '';
  const role = typeof userType === 'string' ? userType.toLowerCase().replace(/\s/g, '') : '';
  
  // Use role as basename if authenticated, otherwise use root '/'
  // IMPORTANT: Portal pages (/portal/*) must ALWAYS use basename='/' 
  // because changing the basename causes BrowserRouter to re-mount (key={basename}),
  // destroying all wizard state and losing location.state data.
  const isPortalPage = window.location.pathname.startsWith('/portal');
  const basename = (role && !isPortalPage) ? `/${role}` : '/';

  let pathname = window.location.pathname;
  let isValidPath = basename === '/' || pathname === basename || pathname.startsWith(`${basename}/`);

  // If the URL doesn't match the required basename (e.g., after login or direct navigation),
  // we synchronously correct the URL before React Router mounts to prevent it from rendering nothing.
  if (!isValidPath && !isPortalPage) {
    const targetPath = pathname === '/' ? '' : pathname;
    const newPath = `${basename}${targetPath}${window.location.search}${window.location.hash}`;
    window.history.replaceState(null, '', newPath);
  }

  return (
    <BrowserRouter basename={basename} key={basename}>
      <ThemeProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export function App() {
  // ── Global error catchers ──
  // These surface errors that React's ErrorBoundary cannot see (async, fetch, etc.)
  // as flash-message toasts, similar to the red banner in ClickUp / Slack.

  useEffect(() => {
    // 1) Unhandled promise rejections (fire-and-forget promises, setTimeout, etc.)
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason: any = event.reason;
      // axios errors are already toasted by the interceptor — skip duplicates.
      if (reason?.isAxiosError) return;
      const message = reason?.message || (typeof reason === 'string' ? reason : '');
      if (!message) return;
      toast({
        title: 'Unexpected error',
        description: message,
        variant: 'error',
      });
    };

    // 2) Global window.onerror — catches truly unexpected runtime errors
    const onGlobalError = (event: ErrorEvent) => {
      // Ignore ResizeObserver loop warnings — benign browser noise
      if (event.message?.includes('ResizeObserver')) return;
      toast({
        title: 'Runtime error',
        description: event.message || 'An unexpected error occurred.',
        variant: 'error',
      });
    };

    // 3) Intercept native fetch so ALL network errors show a flash toast,
    //    even calls that don't go through our axios apiClient.
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          const url = typeof args[0] === 'string' ? args[0] : ((args[0] as Request)?.url ?? '');
          const statusTitles: Record<number, string> = {
            400: 'Bad request',
            401: 'Unauthorized',
            403: 'Permission denied',
            404: 'Not found',
            500: 'Server error',
          };
          toast({
            title: statusTitles[response.status] ?? `Request failed (${response.status})`,
            description: `${response.status} ${response.statusText}${url ? ` — ${url}` : ''}`,
            variant: 'error',
          });
        }
        return response;
      } catch (err: any) {
        // Network failure (offline, DNS, CORS, etc.)
        toast({
          title: 'Network error',
          description: err?.message || 'Could not reach the server.',
          variant: 'error',
        });
        throw err;
      }
    };

    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('error', onGlobalError);

    return () => {
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('error', onGlobalError);
      window.fetch = originalFetch; // restore original fetch
    };
  }, []);

  return (
    <>
      <ErrorBoundary
        onError={(error) => {
          toast({
            title: 'Something went wrong',
            description: error.message,
            variant: 'error',
          });
        }}
      >
        <QueryClientProvider client={queryClient}>
          <AppRouterWrapper />
        </QueryClientProvider>
      </ErrorBoundary>
      <Toaster />
    </>
  );
}
