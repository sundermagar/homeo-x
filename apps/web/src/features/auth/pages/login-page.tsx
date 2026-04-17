import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Stethoscope } from 'lucide-react';
import { z } from 'zod';
import { apiClient } from '@/infrastructure/api-client';
import { useAuthStore } from '@/shared/stores/auth-store';
import { LoginRequestSchema } from '@mmc/validation';
import '../styles/login-page.css';

type LoginFields = z.infer<typeof LoginRequestSchema>;

const DEMO_USERS = [
  { email: 'doctor@homeox.com',      name: 'Dr. Demo',       type: 'Doctor',       role: '🩺 Doctor',       id: 101 },
  { email: 'admin@homeox.com',       name: 'Admin Demo',     type: 'Admin',        role: '🛡 Admin',        id: 102 },
  { email: 'reception@homeox.com',   name: 'Reception Demo', type: 'Receptionist', role: '📋 Reception',    id: 103 },
  { email: 'clinicadmin@homeox.com', name: 'Clinic Admin',   type: 'Clinicadmin',  role: '🏥 Clinic Admin', id: 104 },
];

export default function LoginPage() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [fieldErrors, setFieldErrors]   = useState<Partial<Record<keyof LoginFields, string>>>({});

  const navigate        = useNavigate();
  const setAuth         = useAuthStore((s) => s.setAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Redirect immediately if already authenticated (mirrors MMC's localStorage check)
  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  // ─── Demo bypass (no network needed) ──────────────────────────────────────
  const loginAsDemo = (demoEmail: string) => {
    const demo = DEMO_USERS.find(d => d.email === demoEmail);
    if (!demo) return;
    setAuth('demo-token-' + demo.id, {
      id:        demo.id,
      email:     demo.email,
      name:      demo.name,
      type:      demo.type,
      contextId: 1,
      roleId:    demo.id,
      roleName:  demo.type,
      permissions: {
        canAccessDashboard:    true,
        canAccessQuickAccess:  true,
        canViewPatientDetail:  ['Admin', 'Clinicadmin', 'Doctor'].includes(demo.type),
        canCreatePatient:      true,
        canEditPatient:        true,
        canDeletePatient:      ['Admin', 'Clinicadmin'].includes(demo.type),
        canViewBilling:        ['Admin', 'Clinicadmin', 'Receptionist'].includes(demo.type),
        canViewExpenses:       ['Admin', 'Clinicadmin'].includes(demo.type),
        canViewAnalytics:      ['Admin', 'Clinicadmin'].includes(demo.type),
        canViewDoctors:        ['Admin', 'Clinicadmin'].includes(demo.type),
        canManageUsers:        demo.type === 'Admin',
        canManageSettings:     ['Admin', 'Clinicadmin'].includes(demo.type),
        canViewPackageHistory: true,
        canNewPatientBtn:      ['Admin', 'Clinicadmin', 'Receptionist'].includes(demo.type),
      },
    } as any);
    navigate('/', { replace: true });
  };

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

      if (data.success && data.token) {
        // Store token + user (with permissions) in Zustand persisted store
        setAuth(data.token, data.user);
        navigate('/', { replace: true });
      } else {
        setError('Invalid credentials. Please try again.');
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
            Homeo<span className="login-title-brand">X</span>
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
                placeholder="doctor@homeox.com"
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

        {/* ─── Demo Quick Access ─────────────────────────────────────────── */}
        <div className="demo-credentials">
          <div className="demo-header">
            <span className="demo-badge">⚡ Demo Access</span>
          </div>
          <div className="demo-options">
            {DEMO_USERS.map(demo => (
              <button
                key={demo.email}
                className="demo-btn"
                type="button"
                onClick={() => loginAsDemo(demo.email)}
              >
                <div className="demo-btn-info">
                  <span className="demo-btn-role">{demo.role}</span>
                  <span className="demo-btn-email">{demo.email}</span>
                </div>
              </button>
            ))}
          </div>
          <p className="demo-credentials-footer">
            Click a role above to explore without credentials.
          </p>
        </div>

        <div className="login-footer">
          <p>Protected by enterprise-grade encryption · HomeoX Clinical Portal</p>
        </div>

      </div>
    </div>
  );
}
