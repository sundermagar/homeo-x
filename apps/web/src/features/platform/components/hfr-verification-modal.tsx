import React, { useState } from 'react';
import { ShieldCheck, Activity } from 'lucide-react';
import { Drawer } from '@/shared/components/drawer';
import { useVerifyHfr } from '../hooks/use-organizations';

interface HfrVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicId: number;
  clinicName: string;
}

export function HfrVerificationModal({ isOpen, onClose, clinicId, clinicName }: HfrVerificationModalProps) {
  const [hfrId, setHfrId] = useState('');
  const [error, setError] = useState('');
  const verifyMutation = useVerifyHfr();

  if (!isOpen) return null;

  const handleVerify = async () => {
    if (!hfrId.trim() || hfrId.length < 5) {
      setError('Please enter a valid Health Facility Registry ID (HFR ID)');
      return;
    }
    setError('');

    try {
      await verifyMutation.mutateAsync({ clinicId, hfrId });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="ABDM Health Facility Registry">
      <div style={{ padding: '24px' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)', 
          borderRadius: '12px', 
          padding: '24px',
          color: 'white',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <ShieldCheck size={48} style={{ marginBottom: '16px', opacity: 0.9 }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>Verify Facility: {clinicName}</h3>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.8, lineHeight: 1.5 }}>
            Enter the Health Facility Registry ID (HFR ID) to register this clinic's digital signature with the National Health Authority.
          </p>
        </div>

        <div className="plat-form-group" style={{ marginBottom: '24px' }}>
          <label className="plat-form-label">Health Facility ID (HFR ID)</label>
          <input
            type="text"
            className="plat-form-input"
            placeholder="e.g. IN012345"
            value={hfrId}
            onChange={(e) => {
              setHfrId(e.target.value);
              setError('');
            }}
            disabled={verifyMutation.isPending}
            style={{ fontSize: '16px', padding: '12px', textAlign: 'center', letterSpacing: '0.05em' }}
          />
          {error && <span className="plat-form-error" style={{ textAlign: 'center', display: 'block', marginTop: '8px' }}>{error}</span>}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          <button 
            type="button" 
            className="plat-btn plat-btn-ghost" 
            onClick={onClose}
            style={{ flex: 1 }}
            disabled={verifyMutation.isPending}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="plat-btn plat-btn-primary" 
            onClick={handleVerify}
            style={{ flex: 2, display: 'flex', justifyContent: 'center', gap: '8px', background: '#10b981', border: '1px solid #10b981' }}
            disabled={verifyMutation.isPending || !hfrId}
          >
            {verifyMutation.isPending ? (
              <>
                <Activity size={16} className="animate-spin" />
                Verifying Facility...
              </>
            ) : (
              'Verify via ABDM'
            )}
          </button>
        </div>
      </div>
    </Drawer>
  );
}
