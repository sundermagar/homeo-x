import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, Search, Loader2, ArrowRight, Stethoscope,
  ShieldCheck, Heart, Sparkles, AlertCircle
} from 'lucide-react';
import { apiClient } from '@/infrastructure/api-client';
import { useAuthStore } from '@/shared/stores/auth-store';
import './patient-portal-entry.css';

export default function PatientPortalEntry() {
  const [phone, setPhone] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    inputRef.current?.focus();
    document.body.classList.add('portal-body-active');
    return () => {
      document.body.classList.remove('portal-body-active');
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsSearching(true);
    try {
      const { data } = await apiClient.post('/portal/lookup', { phone: cleaned });

      if (data.success && data.data?.found) {
        // Patient FOUND → Store JWT and redirect to Track Selection
        setAuth(data.data.token, data.data.user, true);
        navigate('/portal/select-track', { replace: true });
      } else {
        // Patient NOT FOUND → Redirect to New Case flow
        navigate('/portal/new-case', {
          replace: true,
          state: { phone: cleaned },
        });
      }
    } catch (err: any) {
      console.error('[Portal] Lookup error:', err);
      setError(
        err.response?.data?.message ||
        'Unable to search. Please try again.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d\s\-+]/g, '');
    setPhone(val);
    setError(null);
  };

  return (
    <div className="portal-entry-screen">
      {/* Animated background elements */}
      <div className="portal-bg-shapes">
        <div className="portal-bg-circle portal-bg-circle-1" />
        <div className="portal-bg-circle portal-bg-circle-2" />
        <div className="portal-bg-circle portal-bg-circle-3" />
      </div>

      <div className="portal-entry-container">
        {/* Left Side — Branding & Features */}
        <div className="portal-hero-panel">
          <div className="portal-hero-content">
            <div className="portal-hero-badge">
              <Sparkles size={14} className="portal-badge-icon" />
              <span>Patient Portal</span>
            </div>

            <h1 className="portal-hero-title">
              Your Health,
              <br />
              <span className="portal-hero-accent">One Tap Away</span>
            </h1>

            <p className="portal-hero-subtitle">
              Book clinic visits, request medicine refills, track vitals, and
              consult with your doctor — all from your phone.
            </p>

            <div className="portal-features-grid">
              <div className="portal-feature-card">
                <div className="portal-feature-icon portal-feature-icon--blue">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <h4>Clinic Visits</h4>
                  <p>Schedule in-person consultations</p>
                </div>
              </div>

              <div className="portal-feature-card">
                <div className="portal-feature-icon portal-feature-icon--emerald">
                  <Heart size={20} />
                </div>
                <div>
                  <h4>Health Tracking</h4>
                  <p>Submit vitals &amp; upload reports</p>
                </div>
              </div>

              <div className="portal-feature-card">
                <div className="portal-feature-icon portal-feature-icon--purple">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4>Medicine Refills</h4>
                  <p>Follow-up &amp; repeat prescriptions</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side — Phone Input Form */}
        <div className="portal-form-panel">
          <div className="portal-form-card">
            <div className="portal-form-header">
              <div className="portal-phone-icon-wrapper">
                <Phone size={28} />
              </div>
              <h2 className="portal-form-title">Enter Mobile Number</h2>
              <p className="portal-form-desc">
                We'll search your records in our system to get you started.
              </p>
            </div>

            <form onSubmit={handleSearch} className="portal-phone-form" noValidate>
              <div className="portal-input-group">
                <div className="portal-country-code">
                  <span className="portal-flag">🇮🇳</span>
                  <span className="portal-code">+91</span>
                </div>
                <input
                  ref={inputRef}
                  id="portal-phone"
                  type="tel"
                  className={`portal-phone-input ${error ? 'portal-input-error' : ''}`}
                  placeholder="Enter your mobile number"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength={15}
                  autoComplete="tel"
                  inputMode="numeric"
                  disabled={isSearching}
                />
              </div>

              {error && (
                <div className="portal-error-msg">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="portal-search-btn"
                disabled={isSearching || phone.replace(/\D/g, '').length < 10}
              >
                {isSearching ? (
                  <>
                    <Loader2 size={20} className="portal-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    <span>Search &amp; Continue</span>
                    <ArrowRight size={16} className="portal-btn-arrow" />
                  </>
                )}
              </button>
            </form>

            <div className="portal-form-footer">
              <p>
                Your data is secured with enterprise-grade encryption.
                <br />
                By continuing, you agree to our privacy policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
