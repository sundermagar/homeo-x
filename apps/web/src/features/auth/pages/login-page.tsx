import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Mail, Lock, Eye, EyeOff, Loader2, AlertCircle,
  Video, Activity, ShieldCheck, Building2, X
} from 'lucide-react';
import { z } from 'zod';
import { apiClient } from '@/infrastructure/api-client';
import { useAuthStore } from '@/shared/stores/auth-store';
import { LoginRequestSchema } from '@mmc/validation';
import hospitalHero from '@/assets/Gemini_Generated_Image_3dl6iv3dl6iv3dl6.png';
import mmcIconOrange from '@/assets/mmc-icon-orange-transparent.png';
import { prefetchDashboard } from '@/features/dashboard/hooks/use-dashboard';
import { toast } from '@/hooks/use-toast';
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
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);
  const [showForgotForm, setShowForgotForm] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token');
  const resetEmail = searchParams.get('email');

  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // If in reset mode, pre-fill email
  useEffect(() => {
    if (resetEmail && !email) {
      setEmail(resetEmail);
    }
  }, [resetEmail]);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    if (!forgotEmail) {
      setForgotError('Please enter your email address.');
      return;
    }

    setIsForgotPasswordLoading(true);
    try {
      const { data } = await apiClient.post('/auth/forgot-password', { email: forgotEmail });
      if (data.success && data.data?.success) {
        setForgotSuccess('Reset link sent! Check your email inbox.');
        setForgotError(null);
      } else {
        setForgotError(data.data?.message || 'Could not send reset link. Please try again.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || '';
      if (msg.toLowerCase().includes('not found') || err.response?.status === 404) {
        setForgotError('No account found with this email address.');
      } else {
        setForgotError(msg || 'Failed to send reset link. Please try again.');
      }
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsResetting(true);
    setError(null);
    try {
      const { data } = await apiClient.post('/auth/reset-password', {
        email: resetEmail || email,
        token: resetToken,
        newPassword
      });
      if (data.success) {
        toast({ title: 'Success', description: 'Password reset successfully. Please login.' });
        navigate('/login', { replace: true });
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setIsResetting(false);
    }
  };

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
        setAuth(data.data.token, data.data.user, rememberMe);
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
              {/* ─── Integrated Logo ─── */}
              <div className="login-form-logo" style={{ alignItems: 'center', justifyContent: 'center', marginTop: '-32px', marginBottom: '36px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '16px' }}>
                  <img src={mmcIconOrange} alt="MMC Icon" style={{ height: '48px', width: '48px', objectFit: 'contain', transform: 'scale(1.4)' }} />
                  <span style={{ fontSize: '36px', fontWeight: '800', color: '#1e3a8a', letterSpacing: '-0.5px' }}>MMC</span>
                </div>
              </div>

              <div className="login-form-header-row">
                <div className="login-form-header-badge">
                  <ShieldCheck size={14} />
                  Secure Clinic Access
                </div>
                <div className="system-status-badge">
                  <div className="status-dot pulse" />
                  <span>System Online</span>
                </div>
              </div>
              <h1 className="login-form-title">
                {resetToken ? 'Reset Password' : showForgotForm ? 'Forgot Password' : 'Clinic Portal'}
              </h1>
              <div className="login-subtitle-container">
                <p className={`login-form-subtitle ${activeFeature ? 'is-insight' : ''}`}>
                  {activeFeature === 'ai' && (
                    <>
                      <Activity size={12} className="insight-inline-icon" />
                      <strong>AI Intelligence:</strong> Our proprietary engine assists with clinical analysis and remedy suggestions using 15+ years of data.
                    </>
                  )}
                  {activeFeature === 'tele' && (
                    <>
                      <Video size={12} className="insight-inline-icon" />
                      <strong>Telehealth:</strong> Integrated HD video suite designed for remote diagnostics with built-in vitals tracking.
                    </>
                  )}
                  {activeFeature === 'data' && (
                    <>
                      <ShieldCheck size={12} className="insight-inline-icon" />
                      <strong>Security:</strong> Enterprise-grade HIPAA-compliant 256-bit encryption with dedicated clinical tenant isolation.
                    </>
                  )}
                  {!activeFeature && "Access your clinical dashboard, patient records, and clinic management tools."}
                </p>
                {activeFeature && (
                  <button className="insight-close-pill" onClick={() => setActiveFeature(null)}>
                    <X size={10} />
                    <span>Back</span>
                  </button>
                )}
              </div>

              {resetToken ? (
                <form className="login-form" onSubmit={handleResetPassword} noValidate>
                  <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px', textAlign: 'center' }}>
                    Set a new password for <br /><strong style={{ color: '#1e3a8a' }}>{resetEmail}</strong>
                  </p>
                  
                  <div className="form-group input-wrapper has-input-icon">
                    <div className="input-icon-bg">
                      <Lock size={18} className="input-icon" />
                    </div>
                    <input
                      id="reset-password"
                      type={showPassword ? 'text' : 'password'}
                      className="login-input"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
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
                      <ShieldCheck size={18} className="input-icon" />
                    </div>
                    <input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      className="login-input"
                      placeholder="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>

                  {error && (
                    <div className="login-error-alert">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  <button type="submit" className="login-btn-primary" disabled={isResetting}>
                    {isResetting ? <Loader2 size={20} className="animate-spin" /> : 'Set New Password'}
                  </button>

                  <div className="login-form-options" style={{ justifyContent: 'center', marginTop: '16px' }}>
                    <Link to="/login" className="forgot-pass">
                      Back to Login
                    </Link>
                  </div>
                </form>
              ) : showForgotForm ? (
                <form className="login-form" onSubmit={handleForgotPassword} noValidate>
                  <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px', textAlign: 'center' }}>
                    Enter your registered email address. We'll search your account and send a reset link.
                  </p>

                  <div className="form-group input-wrapper has-input-icon">
                    <div className="input-icon-bg">
                      <Mail size={18} className="input-icon" />
                    </div>
                    <input
                      id="forgot-email"
                      type="email"
                      className={`login-input${forgotError ? ' error' : ''}`}
                      placeholder="Enter your email address"
                      value={forgotEmail}
                      onChange={(e) => { setForgotEmail(e.target.value); setForgotError(null); setForgotSuccess(null); }}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>

                  {forgotError && (
                    <div className="login-error-alert">
                      <AlertCircle size={16} />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  {forgotSuccess && (
                    <div className="login-error-alert" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
                      <ShieldCheck size={16} />
                      <span>{forgotSuccess}</span>
                    </div>
                  )}

                  <button type="submit" className="login-btn-primary" disabled={isForgotPasswordLoading}>
                    {isForgotPasswordLoading ? <Loader2 size={20} className="animate-spin" /> : 'Search & Send Reset Link'}
                  </button>

                  <div className="login-form-options" style={{ justifyContent: 'center', marginTop: '16px' }}>
                    <a
                      href="#"
                      className="forgot-pass"
                      onClick={(e) => { e.preventDefault(); setShowForgotForm(false); setForgotError(null); setForgotSuccess(null); }}
                    >
                      Back to Login
                    </a>
                  </div>
                </form>
              ) : (
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
                    <a
                      href="#"
                      className="forgot-pass"
                      onClick={(e) => { e.preventDefault(); setShowForgotForm(true); setForgotEmail(''); setForgotError(null); setForgotSuccess(null); }}
                    >
                      Reset Password?
                    </a>
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
              )}

              {/* ─── Platform Features ─────────────────────────────────────── */}
              <div className="login-platform-features">
                <div
                  className={`feature-item ${activeFeature === 'ai' ? 'is-active' : ''}`}
                  onClick={() => setActiveFeature('ai')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="feature-icon"><Activity size={18} /></div>
                  <div className="feature-text">
                    <strong>AI Consultation</strong>
                    <span>Smart clinical assistance</span>
                  </div>
                </div>
                <div
                  className={`feature-item ${activeFeature === 'tele' ? 'is-active' : ''}`}
                  onClick={() => setActiveFeature('tele')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="feature-icon"><Video size={18} /></div>
                  <div className="feature-text">
                    <strong>Telehealth Ready</strong>
                    <span>Integrated video care</span>
                  </div>
                </div>
                <div
                  className={`feature-item ${activeFeature === 'data' ? 'is-active' : ''}`}
                  onClick={() => setActiveFeature('data')}
                  role="button"
                  tabIndex={0}
                >
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
              <span>© 2026 MMC Clinical Systems</span>
              <div className="footer-dot" />
              <Link to="/privacy-policy" className="footer-highlight">Privacy Policy</Link>
              <div className="footer-dot" />
              <Link to="/terms-of-service" className="footer-highlight">Terms of Service</Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}