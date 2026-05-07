import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Mail, Lock, Eye, EyeOff, Loader2, AlertCircle,
  Video, Activity, ShieldCheck, Building2, Stethoscope, Clipboard
} from 'lucide-react';
import { z } from 'zod';
import { apiClient } from '@/infrastructure/api-client';
import { useAuthStore } from '@/shared/stores/auth-store';
import { LoginRequestSchema } from '@mmc/validation';
import hospitalHero from '@/assets/hospital-hero.jpg';
import { prefetchDashboard } from '@/features/dashboard/hooks/use-dashboard';
import '../styles/login-page.css';

type LoginFields = z.infer<typeof LoginRequestSchema>;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginFields, string>>>({});
  const [rememberMe, setRememberMe] = useState(false);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    const validation = LoginRequestSchema.safeParse({ email, password });
    if (!validation.success) {
      const formatted = validation.error.flatten().fieldErrors;
      setFieldErrors({ email: formatted.email?.[0], password: formatted.password?.[0] });
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      if (data.success && data.data?.token) {
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
      if (err.response?.status === 429) {
        setError('Too many login attempts. Please wait 15 minutes and try again.');
      } else {
        setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-container fade-in">

        {/* ─── Header area ─────────────────────────────────── */}
        <div className="login-header">
          <div className="login-logo">
            <div className="login-logo-icon">
              <Building2 size={32} color="white" strokeWidth={2.5} />
            </div>
            <span className="login-logo-text">Kreed<span>.health</span></span>
          </div>
        </div>

        {/* ─── Main Content Area ─────────────────────────────────────────────── */}
        <div className="login-content-grid">

          {/* Left Side: Hospital Hero Illustration */}
          <div className="login-hero-side">
            <div className="hero-background-shapes">
              <div className="hero-shape-diag" />
              <div className="hero-shape-hex" />
            </div>

            <div className="hospital-image-container">
              <img src={hospitalHero} alt="Hospital Facility" className="hospital-image" />
            </div>

          </div>

          {/* Right Side: Form */}
          <div className="login-form-side">
            <div className="login-form-card">
              <div className="login-form-header-row">
                <div className="login-form-header-badge">
                  <ShieldCheck size={14} />
                  Secure Hospital Access
                </div>
                <div className="system-status-badge">
                  <div className="status-dot pulse" />
                  <span>System Online</span>
                </div>
              </div>
              <h1 className="login-form-title">Hospital Portal</h1>
              <p className="login-form-subtitle">
                Access your clinical dashboard, patient records, and hospital management tools.
              </p>

              <form className="login-form" onSubmit={handleSubmit} noValidate>
                <div className="form-group input-wrapper has-input-icon">
                  <div className="input-icon-bg">
                    <Mail size={18} className="input-icon" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    className={`login-input${fieldErrors.email ? ' error' : ''}`}
                    placeholder="Staff Email / ID"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div className="form-group input-wrapper has-input-icon">
                  <div className="input-icon-bg">
                    <Lock size={18} className="input-icon" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className={`login-input${fieldErrors.password ? ' error' : ''}`}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="login-form-options">
                  <label className="remember-me">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Keep me logged in</span>
                  </label>
                  <a href="#" className="forgot-pass">Reset Password?</a>
                </div>

                {error && (
                  <div className="login-error-alert">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" className="login-btn-primary" disabled={isLoading}>
                  {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Enter Portal'}
                </button>

              </form>

              {/* ─── Platform Features ─────────────────────────────────────── */}
              <div className="login-platform-features">
                <div className="feature-item">
                  <div className="feature-icon"><Activity size={18} /></div>
                  <div className="feature-text">
                    <strong>AI Consultation</strong>
                    <span>Smart clinical assistance</span>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon"><Video size={18} /></div>
                  <div className="feature-text">
                    <strong>Telehealth Ready</strong>
                    <span>Integrated video care</span>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon"><ShieldCheck size={18} /></div>
                  <div className="feature-text">
                    <strong>Secure Data</strong>
                    <span>Enterprise protection</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Minimal Footer ────────────────────────────────────────── */}
            <div className="login-mini-footer">
              <span>© 2026 HomeoX Platform</span>
              <div className="footer-dot" />
              <a href="#">Privacy</a>
              <div className="footer-dot" />
              <a href="#">Terms</a>
              <div className="footer-dot" />
              <a href="#">Status</a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}