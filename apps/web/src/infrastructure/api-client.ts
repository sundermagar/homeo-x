import axios, { type AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/shared/stores/auth-store';
import { toast } from '@/hooks/use-toast';

/** Per-request opt-out of the global error toast (e.g. for endpoints that handle errors inline). */
export interface AxiosRequestConfigWithFlags extends AxiosRequestConfig {
  /** When true, suppresses the global error toast for this request. */
  skipErrorToast?: boolean;
}

const getAxiosBaseUrl = () => {
  const envUrl = import.meta.env['VITE_API_URL'];
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  return '/api';
};

const apiClient = axios.create({
  baseURL: getAxiosBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Interceptor for host and debugging
apiClient.interceptors.request.use((config) => {
  // Multi-tenant: use current window host in local development if needed,
  // but preferably let the Vite proxy (changeOrigin: false) handle it.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    config.headers['x-forwarded-host'] = window.location.host;
  }
  return config;
});

/**
 * Pulls a user-friendly title + detail out of an axios error.
 * Backend convention: { success: false, error: 'message' } or { message: '...' }.
 */
function describeAxiosError(error: any): { title: string; description?: string } {
  const status = error?.response?.status as number | undefined;
  const data = error?.response?.data;
  const serverMsg: string | undefined =
    (typeof data === 'string' ? data : undefined) ||
    data?.error ||
    data?.message ||
    data?.detail;

  if (!error?.response) {
    if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
      return { title: '' }; // suppress
    }
    return {
      title: 'Network error',
      description: 'Could not reach the server. Check your connection and try again.',
    };
  }

  const titles: Record<number, string> = {
    400: 'Invalid request',
    403: 'Permission denied',
    404: 'Not found',
    409: 'Conflict',
    422: 'Validation failed',
    429: 'Too many requests',
    500: 'Server error',
    502: 'Bad gateway',
    503: 'Service unavailable',
    504: 'Gateway timeout',
  };

  const title = titles[status ?? 0] ?? `Request failed${status ? ` (${status})` : ''}`;
  return { title, description: serverMsg };
}

// Handle Response errors
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status as number | undefined;
    const config = (error?.config ?? {}) as AxiosRequestConfigWithFlags;

    // 401 Unauthorized → token expired or invalid → force logout (no toast, redirect tells the story).
    if (status === 401) {
      const { logout } = useAuthStore.getState();
      logout();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Skip the global toast when:
    // - caller opted out via { skipErrorToast: true }
    // - request was cancelled (component unmount, etc.)
    // - 422 validation: callers usually surface field-level errors inline
    const skipped =
      config.skipErrorToast === true ||
      error?.code === 'ERR_CANCELED' ||
      error?.name === 'CanceledError' ||
      status === 422;

    if (!skipped) {
      const { title, description } = describeAxiosError(error);
      if (title) toast({ title, description, variant: 'error' });
    }

    return Promise.reject(error);
  },
);

export { apiClient };
