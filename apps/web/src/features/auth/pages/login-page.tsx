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
  const demoUsers = [
    { email: 'doctor@homeox.com', name: 'Dr. Demo', type: 'Doctor', id: 101, role: '🩺 Doctor', icon: '🩺' },
    { email: 'admin@homeox.com', name: 'Admin Demo', type: 'Admin', id: 102, role: '🛡 Admin', icon: '🛡' },
    { email: 'reception@homeox.com', name: 'Reception Demo', type: 'Receptionist', id: 103, role: '📋 Reception', icon: '📋' },
    { email: 'clinicadmin@homeox.com', name: 'Clinic Admin Demo', type: 'Clinicadmin', id: 104, role: '🏥 Clinic Admin', icon: '🏥' },
  ];

  const loginAsDemo = (demoEmail: string) => {
    const demo = demoUsers.find(d => d.email === demoEmail);
    setAuth('demo-token-123', {
      id: demo?.id ?? 101,
      email: demo?.email ?? demoEmail,
      name: demo?.name ?? 'Demo User',
      type: demo?.type ?? 'Doctor',
      roleId: demo?.id ?? 1,
      roleName: demo?.type ?? 'Doctor',
      contextId: 1,
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
    if (password === 'password123' && demoUsers.some(d => d.email === email)) {
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
            {demoUsers.map(demo => (
              <button
                key={demo.email}
                className="demo-btn"
                type="button"
                onClick={() => loginAsDemo(demo.email)}
              >
                <div className="demo-btn-info">
                  <span className="demo-btn-role">{demo.icon} {demo.role}</span>
                  <span className="demo-btn-email">{demo.email}</span>
                </div>
              </button>
            ))}
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
