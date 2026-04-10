import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { apiClient } from '@/infrastructure/api-client';
import { useAuthStore } from '@/shared/stores/auth-store';
import { LoginRequestSchema } from '@mmc/validation';
import '../styles/login-page.css';

type LoginFields = z.infer<typeof LoginRequestSchema>;

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginFields, string>>>({});

  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // ─── Instant 1-click demo login ───────────────────────────────────────────
  const loginAsDemo = (demoEmail: string) => {
    const isDoctor = demoEmail === 'doctor@homeox.com';
    setAuth('demo-token-123', {
      id: isDoctor ? 101 : 102,
      email: demoEmail,
      name: isDoctor ? 'Dr. Demo' : 'Admin Demo',
      type: isDoctor ? 'Doctor' : 'Admin',
      clinicId: 1,
    } as any);
    navigate('/', { replace: true });
  };

  // ─── Normal form submit ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    // Zod validation
    const validation = LoginRequestSchema.safeParse({ email, password });
    if (!validation.success) {
      const formatted = validation.error.flatten().fieldErrors;
      setFieldErrors({
        email: formatted.email?.[0],
        password: formatted.password?.[0],
      });
      setIsLoading(false);
      return;
    }

    // Demo bypass
    if (
      password === 'password123' &&
      (email === 'doctor@homeox.com' || email === 'admin@homeox.com')
    ) {
      loginAsDemo(email);
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      if (data.success && data.token) {
        setAuth(data.token, data.user);
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card fade-in">
        <div className="login-header">
          <div className="login-logo-container">
            <ShieldCheck size={32} strokeWidth={1.6} />
          </div>
          <h1 className="login-title">
            Homeo<span style={{ color: 'var(--primary)' }}>X</span>
          </h1>
          <p className="login-subtitle">Secure clinical portal access</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} strokeWidth={1.6} />
            <span>{error}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" strokeWidth={1.6} />
              <input
                type="email"
                className={`login-input ${fieldErrors['email'] ? 'error' : ''}`}
                placeholder="doctor@homeox.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            {fieldErrors['email'] && (
              <span className="error-message">{fieldErrors['email']}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" strokeWidth={1.6} />
              <input
                type={showPassword ? 'text' : 'password'}
                className={`login-input ${fieldErrors['password'] ? 'error' : ''}`}
                placeholder="••••••••"
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
                {showPassword ? (
                  <EyeOff size={18} strokeWidth={1.6} />
                ) : (
                  <Eye size={18} strokeWidth={1.6} />
                )}
              </button>
            </div>
            {fieldErrors['password'] && (
              <span className="error-message">{fieldErrors['password']}</span>
            )}
          </div>

          <button type="submit" className="login-submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* ─── Demo Quick Access ─────────────────────────────────────────── */}
        <div className="demo-credentials">
          <div className="demo-header">
            <span className="demo-badge">⚡ 1-Click Demo Access</span>
          </div>
          <div className="demo-options">
            <button
              className="demo-btn"
              type="button"
              onClick={() => loginAsDemo('doctor@homeox.com')}
            >
              <div className="demo-btn-info">
                <span className="demo-btn-role">🩺 Doctor</span>
                <span className="demo-btn-email">doctor@homeox.com</span>
              </div>
            </button>
            <button
              className="demo-btn"
              type="button"
              onClick={() => loginAsDemo('admin@homeox.com')}
            >
              <div className="demo-btn-info">
                <span className="demo-btn-role">🛡 Admin</span>
                <span className="demo-btn-email">admin@homeox.com</span>
              </div>
            </button>
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Click a role above to log in instantly — no password required.
          </p>
        </div>

        <div className="login-footer">
          <p>Protected by enterprise-grade encryption</p>
        </div>
      </div>
    </div>
  );
}
