import { useState, useEffect, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Mail, Lock, Eye, EyeOff, Loader2, AlertCircle,
  Video, Activity, ShieldCheck, Building2, KeyRound, ArrowLeft, CheckCircle2, User
} from 'lucide-react';
import { z } from 'zod';
import { apiClient } from '@/infrastructure/api-client';
import { useAuthStore } from '@/shared/stores/auth-store';
import { LoginRequestSchema } from '@mmc/validation';
import hospitalHero from '@/assets/hospital-hero.jpg';
import { prefetchDashboard } from '@/features/dashboard/hooks/use-dashboard';
import '../styles/login-page.css';

type LoginFields = z.infer<typeof LoginRequestSchema>;
type ViewState = 'LOGIN' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD';

// ─── Hero Side Component (Memoized) ──────────────────────────────────────────
const HeroSide = memo(() => (
  <div className="login-hero-side">
    <div className="hero-background-shapes">
      <div className="hero-shape-diag" />
      <div className="hero-shape-hex" />
    </div>
    <div className="hospital-image-container">
      <img src={hospitalHero} alt="Hospital Facility" className="hospital-image" />
    </div>
  </div>
));

HeroSide.displayName = 'HeroSide';

// ─── Auth Flow Component ─────────────────────────────────────────────────────
function AuthFlow() {
  const [view, setView] = useState<ViewState>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginFields, string>>>({});


  // Reset Password specific states
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Find Account state
  const [isAccountFound, setIsAccountFound] = useState(false);
  const [foundUserName, setFoundUserName] = useState<string | null>(null);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  // Check for reset token in URL on mount
  useEffect(() => {
    const tokenParam = searchParams.get('token');
    const emailParam = searchParams.get('email');
    if (tokenParam && emailParam) {
      setResetEmail(emailParam);
      setOtp(tokenParam);
      setView('RESET_PASSWORD');
    }
  }, [searchParams]);

  // Auto-clear messages after 5 seconds
  useEffect(() => {
    if (successMessage || error) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, error]);

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
    setFieldErrors({});
  };

  const handleBackToLogin = () => {
    clearMessages();
    setView('LOGIN');
    setResetEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setIsAccountFound(false);
    setFoundUserName(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearMessages();

    const validation = LoginRequestSchema.safeParse({ email, password });
    if (!validation.success) {
      const formatted = validation.error.flatten().fieldErrors;
      setFieldErrors({ email: formatted.email?.[0], password: formatted.password?.[0] });
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      if (data.success && data.data?.user) {
        setAuth(data.data.user);
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

  const handleFindAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setError('Please enter your email address.');
      return;
    }
    setIsLoading(true);
    clearMessages();

    try {
      const { data } = await apiClient.post('/auth/find-account', { email: resetEmail });
      if (data.success) {
        setIsAccountFound(true);
        setFoundUserName(data.data.name);
        setSuccessMessage(`Account found for ${data.data.name}.`);
      } else {
        setError(data.error || 'No account found with this email.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'No account found with this email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearMessages();

    try {
      const { data } = await apiClient.post('/auth/forgot-password', { email: resetEmail });
      if (data.success) {
        setSuccessMessage(data.message || 'Reset link sent successfully to your email.');
        setView('LOGIN');
        setIsAccountFound(false);
        setFoundUserName(null);
      } else {
        setError(data.error || 'Failed to send reset link.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    clearMessages();

    try {
      const { data } = await apiClient.post('/auth/reset-password', { email: resetEmail, otp, newPassword });
      if (data.success) {
        setSuccessMessage('Password updated successfully. You can now log in.');
        setView('LOGIN');
        setResetEmail('');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        
        searchParams.delete('token');
        searchParams.delete('email');
        setSearchParams(searchParams);
      } else {
        setError(data.error || 'Failed to reset password.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again or request a new link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
      
      {view === 'LOGIN' && (
        <>
          <h1 className="login-form-title">Hospital Portal</h1>
          <p className="login-form-subtitle">
            Access your clinical dashboard, patient records, and hospital management tools.
          </p>

          <form className="login-form" onSubmit={handleLoginSubmit} noValidate>
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

              <button 
                type="button" 
                className="forgot-pass" 
                onClick={(e) => { e.preventDefault(); clearMessages(); setView('FORGOT_PASSWORD'); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Reset Password?
              </button>
            </div>

            {error && (
              <div className="login-error-alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="login-success-alert" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', fontWeight: 500 }}>
                <CheckCircle2 size={16} />
                <span>{successMessage}</span>
              </div>
            )}

            <button type="submit" className="login-btn-primary" disabled={isLoading}>
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Enter Portal'}
            </button>
          </form>
        </>
      )}

      {view === 'FORGOT_PASSWORD' && (
        <>
          <button type="button" className="back-btn" onClick={handleBackToLogin} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, marginBottom: '16px', fontSize: '14px', fontWeight: 500 }}>
            <ArrowLeft size={16} /> Back to Login
          </button>
          <h1 className="login-form-title">{isAccountFound ? 'Account Verified' : 'Find Account'}</h1>
          <p className="login-form-subtitle">
            {isAccountFound 
              ? `We found an account for ${foundUserName}. Click below to send a reset link to ${resetEmail}.`
              : 'Enter your registered email address and we\'ll find your account.'}
          </p>

          <form className="login-form" onSubmit={isAccountFound ? handleSendResetLink : handleFindAccount} noValidate>
            <div className="form-group input-wrapper has-input-icon">
              <div className="input-icon-bg">
                {isAccountFound ? <User size={18} className="input-icon" /> : <Mail size={18} className="input-icon" />}
              </div>
              <input
                type="email"
                className="login-input"
                placeholder="Registered Email"
                value={resetEmail}
                onChange={(e) => { setResetEmail(e.target.value); setIsAccountFound(false); }}
                readOnly={isAccountFound}
                required
              />
              {isAccountFound && (
                <button 
                  type="button" 
                  className="password-toggle" 
                  onClick={() => setIsAccountFound(false)}
                  style={{ color: 'var(--hospital-blue)', fontSize: '12px', fontWeight: 600 }}
                >
                  Change
                </button>
              )}
            </div>

            {error && (
              <div className="login-error-alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            {successMessage && !error && (
              <div className="login-success-alert" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', fontWeight: 500 }}>
                <CheckCircle2 size={16} />
                <span>{successMessage}</span>
              </div>
            )}

            <button type="submit" className="login-btn-primary" disabled={isLoading}>
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : (isAccountFound ? 'Send Reset Link' : 'Find Account')}
            </button>
          </form>
        </>
      )}

      {view === 'RESET_PASSWORD' && (
        <>
          <button type="button" className="back-btn" onClick={handleBackToLogin} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, marginBottom: '16px', fontSize: '14px', fontWeight: 500 }}>
            <ArrowLeft size={16} /> Cancel
          </button>
          <h1 className="login-form-title">Create New Password</h1>
          <p className="login-form-subtitle">
            Please enter your new password below. Make sure it\'s secure.
          </p>

          <form className="login-form" onSubmit={handleResetPasswordSubmit} noValidate>
            <div className="form-group input-wrapper has-input-icon">
              <div className="input-icon-bg">
                <Lock size={18} className="input-icon" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
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

            <div className="form-group input-wrapper has-input-icon">
              <div className="input-icon-bg">
                <Lock size={18} className="input-icon" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="login-error-alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="login-success-alert" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', fontWeight: 500 }}>
                <CheckCircle2 size={16} />
                <span>{successMessage}</span>
              </div>
            )}

            <button type="submit" className="login-btn-primary" disabled={isLoading}>
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Update Password'}
            </button>
          </form>
        </>
      )}

      {/* ─── Platform Features ─────────────────────────────────────── */}
      {view === 'LOGIN' && (
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
      )}
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────
export default function LoginPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect to dashboard if authenticated AND NOT trying to reset password
    if (isAuthenticated && !searchParams.has('token')) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate, searchParams]);

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

  return (
    <div className="login-screen">
      <div className="login-container fade-in">
        <div className="login-header">
          <div className="login-logo">
            <div className="login-logo-icon">
              <Building2 size={32} color="white" strokeWidth={2.5} />
            </div>
            <span className="login-logo-text">Kreed<span>.health</span></span>
          </div>
        </div>

        <div className="login-content-grid">
          <HeroSide />

          <div className="login-form-side">
            <AuthFlow />

            <div className="login-mini-footer">
              <span>© 2026 HomeoX Platform</span>
              <div className="footer-dot" />
              <Link to="/p/privacy-policy">Privacy</Link>
              <div className="footer-dot" />
              <Link to="/p/terms-of-service">Terms</Link>
              <div className="footer-dot" />
              <a href="#">Status</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}