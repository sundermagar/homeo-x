import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSendOtp, useVerifyOtp } from '../hooks/use-public-api';

export default function OtpVerifyPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1); // 1: Send OTP, 2: Verify OTP
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const sendOtpMutation = useSendOtp();
  const verifyOtpMutation = useVerifyOtp();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await sendOtpMutation.mutateAsync(phone);
      setStep(2);
      setSuccessMsg('OTP sent! Please check your phone.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send OTP');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await verifyOtpMutation.mutateAsync({ phone, otp });
      navigate(`/public/clinical/${phone}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired OTP');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        
        <div className="auth-header">
          <h2>Patient Login</h2>
          <p>Securely access your medical records and digital prescriptions.</p>
        </div>

        {successMsg && <div className="alert alert-success">{successMsg}</div>}
        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

        {step === 1 ? (
          <form onSubmit={handleSend} className="auth-form">
            <div className="form-group">
              <label>Mobile Number</label>
              <div className="input-with-prefix">
                <span className="input-prefix">+91</span>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  required
                  className="form-input"
                />
              </div>
            </div>
            <button type="submit" disabled={sendOtpMutation.isPending} className="btn btn-primary auth-btn">
              {sendOtpMutation.isPending ? 'Sending code...' : 'Get Secure Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="auth-form align-center">
            <div className="form-group w-100">
              <label className="text-center">
                Enter 6-digit code sent to <br/>
                <span className="highlight-text">+91 {phone}</span>
              </label>
              <input 
                type="text" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="••••••"
                required
                maxLength={6}
                className="form-input otp-input"
              />
            </div>
            
            <button type="submit" disabled={verifyOtpMutation.isPending} className="btn btn-primary auth-btn w-100">
              {verifyOtpMutation.isPending ? 'Verifying...' : 'Verify Access'}
            </button>
            
            <button type="button" onClick={() => setStep(1)} className="btn-link">
              Change mobile number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
