import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity, Heart, Thermometer, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/infrastructure/api-client';

export default function PublicVitalsForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [patientName, setPatientName] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [gender, setGender] = useState<string | null>(null);

  // Form State
  const [vitals, setVitals] = useState({
    height: '',
    weight: '',
    bpSystolic: '',
    bpDiastolic: '',
    pulse: '',
    temperature: '',
    spo2: '',
    lmp: ''
  });

  // Decode/verify token on load
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await apiClient.get(`/portal/vitals/verify?token=${token}`);
        const payload = (res.data as any)?.data;
        setPatientName(payload?.patientName || 'Patient');
        if (payload?.gender) setGender(payload.gender);
        setIsValid(true);
      } catch (err) {
        setIsValid(false);
      } finally {
        setIsLoading(false);
      }
    }
    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/portal/vitals/submit', {
        token,
        ...vitals
      });
      setIsSuccess(true);
    } catch (err) {
      alert('Failed to submit vitals. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Only allow numbers and max 3 chars (or 5 for decimals)
    if (/^\d*\.?\d*$/.test(value) && value.length <= 5) {
      setVitals(prev => ({ ...prev, [name]: value }));
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!isValid && !isSuccess) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '24px' }}>
        <div style={{ background: '#fff', padding: '32px', borderRadius: '24px', textAlign: 'center', maxWidth: '400px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <AlertCircle size={32} />
          </div>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Invalid Link</h2>
          <p style={{ margin: 0, fontSize: '15px', color: '#64748b', lineHeight: 1.6 }}>
            This link is expired or invalid. Please check the WhatsApp message again or contact the clinic.
          </p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '24px' }}>
        <div style={{ background: '#fff', padding: '40px 32px', borderRadius: '24px', textAlign: 'center', maxWidth: '400px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={40} />
          </div>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>Thank You!</h2>
          <p style={{ margin: 0, fontSize: '15px', color: '#64748b', lineHeight: 1.6 }}>
            Your vitals have been successfully recorded for your upcoming consultation. You can now close this window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#fff', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px' }}>
            MMC
          </div>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Pre-visit Vitals</h1>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto', paddingBottom: '100px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
            Hello, {patientName} 👋
          </h2>
          <p style={{ margin: 0, fontSize: '15px', color: '#64748b', lineHeight: 1.5 }}>
            Please fill out your current vital signs before your consultation. This helps our doctors provide the best care.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
          
          {/* Height & Weight */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '12px' }}>
                <Activity size={16} color="#2563eb" />
                Height
              </label>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  name="height"
                  value={vitals.height}
                  onChange={handleChange}
                  placeholder="0"
                  style={{ width: '100%', fontSize: '24px', fontWeight: 800, color: '#0f172a', border: 'none', borderBottom: '2px solid #e2e8f0', outline: 'none', padding: '0 0 4px 0', background: 'transparent' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', paddingBottom: '4px' }}>cm</span>
              </div>
            </div>

            <div style={{ background: '#fff', padding: '16px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '12px' }}>
                <Activity size={16} color="#7c3aed" />
                Weight
              </label>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  name="weight"
                  value={vitals.weight}
                  onChange={handleChange}
                  placeholder="0"
                  style={{ width: '100%', fontSize: '24px', fontWeight: 800, color: '#0f172a', border: 'none', borderBottom: '2px solid #e2e8f0', outline: 'none', padding: '0 0 4px 0', background: 'transparent' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', paddingBottom: '4px' }}>kg</span>
              </div>
            </div>
          </div>

          {/* Blood Pressure */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '16px' }}>
              <Heart size={16} color="#e11d48" />
              Blood Pressure
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    name="bpSystolic"
                    value={vitals.bpSystolic}
                    onChange={handleChange}
                    placeholder="120"
                    style={{ width: '100%', fontSize: '24px', fontWeight: 800, color: '#0f172a', border: 'none', borderBottom: '2px solid #e2e8f0', outline: 'none', padding: '0 0 4px 0', background: 'transparent', textAlign: 'center' }}
                  />
                </div>
                <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '8px', fontWeight: 600 }}>SYS</div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 300, color: '#cbd5e1', paddingBottom: '20px' }}>/</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    name="bpDiastolic"
                    value={vitals.bpDiastolic}
                    onChange={handleChange}
                    placeholder="80"
                    style={{ width: '100%', fontSize: '24px', fontWeight: 800, color: '#0f172a', border: 'none', borderBottom: '2px solid #e2e8f0', outline: 'none', padding: '0 0 4px 0', background: 'transparent', textAlign: 'center' }}
                  />
                </div>
                <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '8px', fontWeight: 600 }}>DIA</div>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', paddingBottom: '24px' }}>mmHg</span>
            </div>
          </div>

          {/* Pulse & Temp */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '12px' }}>
                <Heart size={16} color="#059669" />
                Pulse
              </label>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  name="pulse"
                  value={vitals.pulse}
                  onChange={handleChange}
                  placeholder="72"
                  style={{ width: '100%', fontSize: '24px', fontWeight: 800, color: '#0f172a', border: 'none', borderBottom: '2px solid #e2e8f0', outline: 'none', padding: '0 0 4px 0', background: 'transparent' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', paddingBottom: '4px' }}>bpm</span>
              </div>
            </div>

            <div style={{ background: '#fff', padding: '16px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '12px' }}>
                <Thermometer size={16} color="#ea580c" />
                Temp
              </label>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  name="temperature"
                  value={vitals.temperature}
                  onChange={handleChange}
                  placeholder="98.6"
                  style={{ width: '100%', fontSize: '24px', fontWeight: 800, color: '#0f172a', border: 'none', borderBottom: '2px solid #e2e8f0', outline: 'none', padding: '0 0 4px 0', background: 'transparent' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', paddingBottom: '4px' }}>°F</span>
              </div>
            </div>
          </div>

          {/* SpO2 & Conditionally LMP */}
          <div style={{ display: 'grid', gridTemplateColumns: gender === 'Female' ? '1fr 1fr' : '1fr', gap: '16px' }}>
            <div style={{ background: '#fff', padding: '16px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '12px' }}>
                <Activity size={16} color="#0284c7" />
                SpO2 (Oxygen)
              </label>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  name="spo2"
                  value={vitals.spo2}
                  onChange={handleChange}
                  placeholder="98"
                  style={{ width: '100%', fontSize: '24px', fontWeight: 800, color: '#0f172a', border: 'none', borderBottom: '2px solid #e2e8f0', outline: 'none', padding: '0 0 4px 0', background: 'transparent' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#94a3b8', paddingBottom: '4px' }}>%</span>
              </div>
            </div>

            {gender === 'Female' && (
              <div style={{ background: '#fff', padding: '16px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '12px' }}>
                  <Activity size={16} color="#db2777" />
                  Last Menstrual Period
                </label>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                  <input
                    type="date"
                    name="lmp"
                    value={vitals.lmp}
                    onChange={(e) => setVitals(prev => ({ ...prev, lmp: e.target.value }))}
                    style={{ width: '100%', fontSize: '16px', fontWeight: 700, color: '#0f172a', border: 'none', borderBottom: '2px solid #e2e8f0', outline: 'none', padding: '4px 0', background: 'transparent' }}
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '20px 24px', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderTop: '1px solid #e2e8f0', zIndex: 20 }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%', maxWidth: '600px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '16px', borderRadius: '16px', background: '#0f172a', color: '#fff', fontSize: '16px', fontWeight: 700,
                border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.8 : 1,
                boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)'
              }}
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : (
                <>Submit Vitals <ArrowRight size={20} /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
