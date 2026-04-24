import { useState } from 'react';
import { useRegisterPatient } from '../hooks/use-public-api';

export default function SelfJoinForm() {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
  });
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const registerMutation = useRegisterPatient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      // By default, this hits lead creation
      await registerMutation.mutateAsync({
        ...formData,
        source: 'Self-Join Portal',
      });
      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card text-center">
          
          <div style={{ width: 80, height: 80, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 24px' }}>
            ✓
          </div>
          <div className="auth-header">
            <h2>Registration Pending</h2>
            <p>Thank you for joining HomeoX. Our team will verify your details and contact you shortly.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        
        <div className="auth-header">
          <h2>Welcome to HomeoX</h2>
          <p>Please provide your basic details to create a new patient profile.</p>
        </div>

        {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Full Name <span style={{color: '#ef4444'}}>*</span></label>
            <input 
              type="text" 
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              required
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label>Mobile Number <span style={{color: '#ef4444'}}>*</span></label>
            <input 
              type="tel" 
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="e.g. 9876543210"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Email Address <span style={{color: '#94a3b8', fontSize: '0.75rem', textTransform: 'none'}}>(Optional)</span></label>
            <input 
              type="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              className="form-input"
            />
          </div>

          <button type="submit" disabled={registerMutation.isPending} className="btn btn-primary auth-btn" style={{marginTop: '0.5rem'}}>
            {registerMutation.isPending ? 'Registering...' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
}

