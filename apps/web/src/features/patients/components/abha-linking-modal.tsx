import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, ShieldCheck, Fingerprint, Smartphone, ArrowRight, CheckCircle2, Loader2, AlertCircle, Link2, Unlink, Copy } from 'lucide-react';
import { useAbhaSearch, useAbhaVerify, useAbhaLink, type AbhaProfile } from '../hooks/use-abha';
import { toast } from '@/hooks/use-toast';
import '../styles/patients.css';

interface AbhaLinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  regid: number;
  patientName: string;
}

type Step = 'identify' | 'otp' | 'profile' | 'success';
type IdentifierType = 'aadhaar' | 'mobile';

export function AbhaLinkingModal({ isOpen, onClose, regid, patientName }: AbhaLinkingModalProps) {
  const [step, setStep] = useState<Step>('identify');
  const [identifierType, setIdentifierType] = useState<IdentifierType>('aadhaar');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [txnId, setTxnId] = useState('');
  const [profile, setProfile] = useState<AbhaProfile | null>(null);
  const [sandboxHint, setSandboxHint] = useState('');

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const searchMutation = useAbhaSearch();
  const verifyMutation = useAbhaVerify(regid);
  const linkMutation = useAbhaLink(regid);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('identify');
      setIdentifier('');
      setOtp(['', '', '', '', '', '']);
      setTxnId('');
      setProfile(null);
      setSandboxHint('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ─── Step 1: Identify ─────────────────────────────────────────────────────

  const handleSearch = async () => {
    if (!identifier.trim()) return;

    try {
      const result = await searchMutation.mutateAsync({
        identifier: identifier.trim(),
        type: identifierType,
      });
      setTxnId(result.txnId);
      if (result._sandbox?.otp) {
        setSandboxHint(result._sandbox.otp);
      }
      setStep('otp');
      // Focus first OTP input after animation
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
    } catch (err: any) {
      toast({ title: 'Search Failed', description: err?.response?.data?.message || err.message, variant: 'error' });
    }
  };

  // ─── Step 2: OTP ──────────────────────────────────────────────────────────

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtp(newOtp);
    const nextIndex = Math.min(pasted.length, 5);
    otpRefs.current[nextIndex]?.focus();
  };

  const handleVerify = async () => {
    const otpStr = otp.join('');
    if (otpStr.length !== 6) return;

    try {
      const result = await verifyMutation.mutateAsync({ txnId, otp: otpStr });
      setProfile(result.profile);
      setStep('profile');
    } catch (err: any) {
      toast({ title: 'Verification Failed', description: err?.response?.data?.message || err.message, variant: 'error' });
    }
  };

  // ─── Step 3: Link ─────────────────────────────────────────────────────────

  const handleLink = async () => {
    if (!profile) return;

    try {
      await linkMutation.mutateAsync({
        abhaNumber: profile.healthIdNumber,
        abhaAddress: profile.healthId,
      });
      setStep('success');
      toast({ title: 'ABHA Linked', description: `ABHA ${profile.healthIdNumber} linked to ${patientName}`, variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Linking Failed', description: err?.response?.data?.message || err.message, variant: 'error' });
    }
  };

  // ─── Formatters ───────────────────────────────────────────────────────────

  const formatAadhaar = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, '$1-');
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return createPortal(
    <div className="abha-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="abha-modal-container">

        {/* Header */}
        <div className="abha-modal-header">
          <div className="abha-modal-header-left">
            <div className="abha-modal-icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="abha-modal-title">Link ABHA Health ID</h2>
              <p className="abha-modal-subtitle">{patientName} · RegID {regid}</p>
            </div>
          </div>
          <button className="abha-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="abha-progress">
          {(['identify', 'otp', 'profile', 'success'] as Step[]).map((s, i) => (
            <div key={s} className={`abha-progress-step ${step === s ? 'active' : ''} ${
              ['identify', 'otp', 'profile', 'success'].indexOf(step) > i ? 'completed' : ''
            }`}>
              <div className="abha-progress-dot">
                {['identify', 'otp', 'profile', 'success'].indexOf(step) > i ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span className="abha-progress-label">
                {['Identify', 'Verify', 'Confirm', 'Done'][i]}
              </span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="abha-modal-body">

          {/* ─── STEP 1: Identify ───────────────────────────────────── */}
          {step === 'identify' && (
            <div className="abha-step-content pp-fade-in">
              <p className="abha-step-desc">
                Enter the patient's Aadhaar number or registered mobile to search their ABHA Health ID.
              </p>

              {/* Type Selector */}
              <div className="abha-type-selector">
                <button
                  className={`abha-type-btn ${identifierType === 'aadhaar' ? 'active' : ''}`}
                  onClick={() => { setIdentifierType('aadhaar'); setIdentifier(''); }}
                >
                  <Fingerprint size={16} />
                  Aadhaar
                </button>
                <button
                  className={`abha-type-btn ${identifierType === 'mobile' ? 'active' : ''}`}
                  onClick={() => { setIdentifierType('mobile'); setIdentifier(''); }}
                >
                  <Smartphone size={16} />
                  Mobile
                </button>
              </div>

              {/* Input */}
              <div className="abha-input-group">
                <label className="abha-input-label">
                  {identifierType === 'aadhaar' ? 'Aadhaar Number' : 'Mobile Number'}
                </label>
                <div className="abha-input-wrap">
                  {identifierType === 'mobile' && <span className="abha-input-prefix">+91</span>}
                  <input
                    className="abha-input"
                    value={identifierType === 'aadhaar' ? formatAadhaar(identifier) : identifier}
                    onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, ''))}
                    placeholder={identifierType === 'aadhaar' ? '1234-5678-9012' : '9876543210'}
                    maxLength={identifierType === 'aadhaar' ? 14 : 10}
                    style={{ paddingLeft: identifierType === 'mobile' ? '48px' : undefined }}
                  />
                </div>
              </div>

              <button
                className="abha-btn-primary"
                onClick={handleSearch}
                disabled={searchMutation.isPending || (identifierType === 'aadhaar' ? identifier.length !== 12 : identifier.length !== 10)}
              >
                {searchMutation.isPending ? (
                  <><Loader2 size={16} className="abha-spinner" /> Searching...</>
                ) : (
                  <><Search size={16} /> Search ABHA</>
                )}
              </button>
            </div>
          )}

          {/* ─── STEP 2: OTP Verification ───────────────────────────── */}
          {step === 'otp' && (
            <div className="abha-step-content pp-fade-in">
              <p className="abha-step-desc">
                Enter the 6-digit OTP sent to the registered mobile number.
              </p>

              {sandboxHint && (
                <div className="abha-sandbox-hint">
                  <AlertCircle size={14} />
                  <span>Sandbox Mode — Use OTP: <strong>{sandboxHint}</strong></span>
                </div>
              )}

              <div className="abha-otp-container" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    className="abha-otp-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  />
                ))}
              </div>

              <div className="abha-step-actions">
                <button className="abha-btn-secondary" onClick={() => setStep('identify')}>
                  ← Back
                </button>
                <button
                  className="abha-btn-primary"
                  onClick={handleVerify}
                  disabled={verifyMutation.isPending || otp.join('').length !== 6}
                >
                  {verifyMutation.isPending ? (
                    <><Loader2 size={16} className="abha-spinner" /> Verifying...</>
                  ) : (
                    <><CheckCircle2 size={16} /> Verify OTP</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Profile Confirmation ───────────────────────── */}
          {step === 'profile' && profile && (
            <div className="abha-step-content pp-fade-in">
              <p className="abha-step-desc">
                ABHA profile verified. Review and confirm to link this Health ID to the patient.
              </p>

              {/* ABHA Card */}
              <div className="abha-card">
                <div className="abha-card-header">
                  <div className="abha-card-logo">
                    <ShieldCheck size={20} />
                    <span>ABHA</span>
                  </div>
                  <span className="abha-card-badge">
                    {profile.kycVerified ? '✓ KYC Verified' : 'Pending'}
                  </span>
                </div>
                <div className="abha-card-body">
                  <div className="abha-card-name">{profile.name}</div>
                  <div className="abha-card-row">
                    <span className="abha-card-label">ABHA Number</span>
                    <span className="abha-card-value">{profile.healthIdNumber}</span>
                  </div>
                  <div className="abha-card-row">
                    <span className="abha-card-label">ABHA Address</span>
                    <span className="abha-card-value">{profile.healthId}</span>
                  </div>
                  <div className="abha-card-row-group">
                    <div className="abha-card-row">
                      <span className="abha-card-label">Gender</span>
                      <span className="abha-card-value">{profile.gender || '—'}</span>
                    </div>
                    <div className="abha-card-row">
                      <span className="abha-card-label">DOB</span>
                      <span className="abha-card-value">
                        {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-GB') : '—'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="abha-card-footer">
                  Ayushman Bharat Digital Mission (ABDM) · Sandbox
                </div>
              </div>

              <div className="abha-step-actions">
                <button className="abha-btn-secondary" onClick={() => setStep('identify')}>
                  ← Start Over
                </button>
                <button
                  className="abha-btn-primary"
                  onClick={handleLink}
                  disabled={linkMutation.isPending}
                >
                  {linkMutation.isPending ? (
                    <><Loader2 size={16} className="abha-spinner" /> Linking...</>
                  ) : (
                    <><Link2 size={16} /> Link to Patient</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 4: Success ─────────────────────────────────────── */}
          {step === 'success' && (
            <div className="abha-step-content abha-success pp-fade-in">
              <div className="abha-success-icon">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="abha-success-title">ABHA Linked Successfully</h3>
              <p className="abha-success-desc">
                {profile?.healthIdNumber} has been linked to {patientName}'s profile.
              </p>
              <button className="abha-btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
