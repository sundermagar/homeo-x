import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Heart, ShieldCheck, Calendar, Pill } from 'lucide-react';
import { apiClient } from '@/infrastructure/api-client';
import { usePatientAuthStore } from '@/shared/stores/patient-auth-store';
import './patient-login.css';

export default function PatientLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const setAuth = usePatientAuthStore((s) => s.setAuth);
  const isAuthenticated = usePatientAuthStore((s) => s.isAuthenticated);
  const patient = usePatientAuthStore((s) => s.patient);

  useEffect(() => {
    if (isAuthenticated && patient) {
      navigate(`/patient/${patient.phone}`, { replace: true });
    }
  }, [isAuthenticated, patient, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      setIsLoading(false);
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await apiClient.post('/public/auth/login', { email, password });
      if (data.success && data.data?.token) {
        setAuth(data.data.token, data.data.patient);
        navigate(`/patient/${data.data.patient.phone}`, { replace: true });
      } else {
        setError(data.message || 'Invalid credentials. Please try again.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="patient-login-screen">
      <div className="patient-login-container">

        {/* Left: Branding */}
        <div className="patient-login-hero">
          <div className="patient-login-hero-shapes">
            <div className="hero-circle-1" />
            <div className="hero-circle-2" />
            <div className="hero-circle-3" />
          </div>
          <div className="patient-login-hero-content">
            <div className="patient-login-hero-icon">
              <Heart size={48} strokeWidth={2} />
            </div>
            <h1>Your Health,<br />Your Hands</h1>
            <p>Access prescriptions, book appointments, and track your treatment — all in one place.</p>
            <div className="patient-login-features">
              <div className="patient-login-feature">
                <Calendar size={18} />
                <span>Book Appointments</span>
              </div>
              <div className="patient-login-feature">
                <Pill size={18} />
                <span>View Prescriptions</span>
              </div>
              <div className="patient-login-feature">
                <ShieldCheck size={18} />
                <span>Secure Records</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Login Form */}
        <div className="patient-login-form-side">
          <div className="patient-login-card">
            <div className="patient-login-card-header">
              <div className="patient-login-badge">
                <ShieldCheck size={14} />
                Patient Portal
              </div>
            </div>
            <h2 className="patient-login-title">Welcome Back</h2>
            <p className="patient-login-subtitle">
              Sign in to access your medical dashboard, prescriptions, and appointment history.
            </p>

            <form className="patient-login-form" onSubmit={handleSubmit} noValidate>
              <div className="patient-input-group">
                <div className="patient-input-icon">
                  <Mail size={18} />
                </div>
                <input
                  id="patient-login-email"
                  type="email"
                  className="patient-input"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="patient-input-group">
                <div className="patient-input-icon">
                  <Lock size={18} />
                </div>
                <input
                  id="patient-login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="patient-input"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="patient-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && (
                <div className="patient-login-error">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="patient-login-btn" disabled={isLoading}>
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
              </button>
            </form>

            <div className="patient-login-divider">
              <span>Need help?</span>
            </div>
            <p className="patient-login-help">
              Contact your clinic reception to get your patient portal credentials.
            </p>

            <div className="patient-login-footer">
              <Link to="/login" className="patient-login-staff-link">
                Staff / Doctor Login →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
