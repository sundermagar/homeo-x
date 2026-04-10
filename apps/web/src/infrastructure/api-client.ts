import axios from 'axios';
import { useAuthStore } from '@/shared/stores/auth-store';

const apiClient = axios.create({
  baseURL: (import.meta as any).env['VITE_API_URL'] || '/api',
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
  (res) => {
    // Automatically unwrap high-level "data" key if it exists
    if (res.data && res.data.success && res.data.data !== undefined) {
      // Keep the original properties like message or total if they exist alongside data
      return {
        ...res,
        data: res.data.data,
        _original: res.data // For cases where we might need success/message etc.
      };
    }
    return res;
  },
  (error) => {
    // We've removed the /login redirect to bypass auth pages as requested.
    return Promise.reject(error);
  },
);

export { apiClient };
