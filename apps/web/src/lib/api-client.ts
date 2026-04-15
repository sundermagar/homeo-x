// @ts-nocheck
import { useAuthStore } from '../shared/stores/auth-store';
import { API } from './constants';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    correlationId: string;
    timestamp: string;
  };
}

interface PaginatedData<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ApiClient {
  private baseUrl = window.location.origin;

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    };
    const token = useAuthStore.getState().accessToken;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      const refreshed = await this.tryRefresh();
      if (!refreshed) {
        useAuthStore.getState().clearAuth();
        throw new Error('Session expired');
      }
      throw new Error('RETRY');
    }

    const body: ApiResponse<T> = await response.json();

    if (!response.ok || !body.success) {
      const error = body.error || { code: 'UNKNOWN', message: 'An error occurred' };
      const err = new Error(error.message) as Error & { code: string; details: unknown };
      err.code = error.code;
      err.details = error.details;
      throw err;
    }

    return body.data as T;
  }

  private refreshPromise: Promise<boolean> | null = null;

  private async tryRefresh(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const { refreshToken, setAuth, clearAuth } = useAuthStore.getState();
      if (!refreshToken) {
        this.refreshPromise = null;
        return false;
      }

      try {
        const response = await fetch(`${this.baseUrl}${API.AUTH.REFRESH}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          clearAuth();
          this.refreshPromise = null;
          return false;
        }

        const body: ApiResponse<{
          user: { id: string; email: string; firstName: string; lastName: string; roles: string[] };
          tenant: { id: string; name: string; slug: string };
          accessToken: string;
          refreshToken: string;
        }> = await response.json();
        
        if (body.success && body.data) {
          setAuth({
            user: body.data.user,
            tenant: body.data.tenant,
            accessToken: body.data.accessToken,
            refreshToken: body.data.refreshToken,
          });
          this.refreshPromise = null;
          return true;
        }
        clearAuth();
        this.refreshPromise = null;
        return false;
      } catch {
        clearAuth();
        this.refreshPromise = null;
        return false;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const headers = this.getHeaders();
    // Don't send Content-Type: application/json when there's no body —
    // NestJS body parser rejects empty payloads with that content type.
    if (body === undefined) {
      delete headers['Content-Type'];
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${url}`, options);

    try {
      return await this.handleResponse<T>(response);
    } catch (err) {
      if (err instanceof Error && err.message === 'RETRY') {
        const retryResponse = await fetch(`${this.baseUrl}${url}`, {
          ...options,
          headers: this.getHeaders(),
        });
        return this.handleResponse<T>(retryResponse);
      }
      throw err;
    }
  }

  async get<T>(url: string): Promise<T> {
    return this.request<T>('GET', url);
  }

  async post<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', url, body);
  }

  async patch<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', url, body);
  }

  async delete<T>(url: string): Promise<T> {
    return this.request<T>('DELETE', url);
  }

  async getPaginated<T>(url: string): Promise<PaginatedData<T>> {
    return this.request<PaginatedData<T>>('GET', url);
  }
}

export const api = new ApiClient();
