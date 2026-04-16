import axios from 'axios';
import { useAuthStore } from '@/shared/stores/auth-store';

const apiClient = axios.create({
  baseURL: import.meta.env['VITE_API_URL'] || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Multi-tenant: spoof host header for local development
  if (import.meta.env.DEV) {
    config.headers['x-forwarded-host'] = 'demo.managemyclinic.in';
  }
  return config;
});

// Handle Response errors
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    // 401 Unauthorized → token expired or invalid → force logout
    if (error.response?.status === 401) {
      const { logout } = useAuthStore.getState();
      logout();
      // Redirect to login (avoid circular import by using window.location)
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export { apiClient };
