import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Stethoscope, ShieldCheck, Clipboard, Building2 } from 'lucide-react';
import { z } from 'zod';
import { apiClient } from '@/infrastructure/api-client';
import { useAuthStore } from '@/shared/stores/auth-store';
import { LoginRequestSchema } from '@mmc/validation';
import { prefetchDashboard } from '@/features/dashboard/hooks/use-dashboard';
import '../styles/login-page.css';

type LoginFields = z.infer<typeof LoginRequestSchema>;

export default function LoginPage() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [fieldErrors, setFieldErrors]   = useState<Partial<Record<keyof LoginFields, string>>>({});

  const navigate        = useNavigate();
  const queryClient     = useQueryClient();
  const setAuth         = useAuthStore((s) => s.setAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Redirect immediately if already authenticated (mirrors MMC's localStorage check)
  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  // Warm up the dashboard chunk and the dashboard query while the user is reading
  // the login form. Hides ~500-1500ms of perceived wait on first navigation to "/".
  useEffect(() => {
    const warmup = () => {
      void import('@/features/dashboard/pages/dashboard-page');
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = (window as any).requestIdleCallback(warmup, { timeout: 1500 });
      return () => (window as any).cancelIdleCallback?.(id);
    }
    const timer = setTimeout(warmup, 800);
    return () => clearTimeout(timer);
  }, []);

  // ─── Real login — POST /api/auth/login ───────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    // Client-side Zod validation
    const validation = LoginRequestSchema.safeParse({ email, password });
    if (!validation.success) {
      const formatted = validation.error.flatten().fieldErrors;
      setFieldErrors({
        email:    formatted.email?.[0],
        password: formatted.password?.[0],
      });
      setIsLoading(false);
      return;
    }

    try {
      // POST /api/auth/login → { success: true, token, user: { ...payload, permissions } }
      const { data } = await apiClient.post('/auth/login', { email, password });

      if (data.success && data.data?.token) {
        // Store token + user (with permissions) in Zustand persisted store
        setAuth(data.data.token, data.data.user);
        // Fire ONE dashboard request matching this user's role so it's in flight by
        // the time React mounts the dashboard route. Firing both 'month' and 'day'
        // at once doubles connection-pool pressure on the remote DB and makes the
        // first load slower, not faster.
        const role = String(data.data.user?.type || '').toLowerCase();
        const period = role === 'doctor' ? 'day' : 'month';
        prefetchDashboard(queryClient, period);
        navigate('/', { replace: true });
      } else {
        setError(data.error || 'Invalid credentials. Please try again.');
      }
    } catch (err: any) {
      // Handle rate-limit (mirrors MMC's authLimiter 429 response)
      if (err.response?.status === 429) {
        setError('Too many login attempts. Please wait 15 minutes and try again.');
      } else {
        const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card fade-in">

        {/* ─── Brand Header ─────────────────────────────────────────────── */}
        <div className="login-header">
          <div className="login-logo-container">
            <Stethoscope size={28} strokeWidth={1.8} />
          </div>
          <h1 className="login-title">
            Kreed<span className="login-title-brand">.health</span>
          </h1>
          <p className="login-subtitle">Secure clinical portal · Sign in to continue</p>
        </div>

        {/* ─── Error Banner ─────────────────────────────────────────────── */}
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} strokeWidth={1.8} />
            <span>{error}</span>
          </div>
        )}

        {/* ─── Login Form ───────────────────────────────────────────────── */}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={16} strokeWidth={1.8} />
              <input
                id="login-email"
                type="email"
                className={`login-input${fieldErrors.email ? ' error' : ''}`}
                placeholder="admin@kreed.health"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            {fieldErrors.email && <span className="error-message">{fieldErrors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={16} strokeWidth={1.8} />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className={`login-input${fieldErrors.password ? ' error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword
                  ? <EyeOff size={16} strokeWidth={1.8} />
                  : <Eye    size={16} strokeWidth={1.8} />}
              </button>
            </div>
            {fieldErrors.password && (
              <span className="error-message">{fieldErrors.password}</span>
            )}
          </div>

          <button id="login-submit-btn" type="submit" className="login-submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Protected by enterprise-grade encryption · Kreed.health Clinical Portal</p>
        </div>

      </div>
    </div>
  );
}
