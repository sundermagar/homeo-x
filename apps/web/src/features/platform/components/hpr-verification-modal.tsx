import React, { useState } from 'react';
import { ShieldCheck, X, Activity } from 'lucide-react';
import { Drawer } from '@/shared/components/drawer';
import { useVerifyHpr } from '@/features/staff/hooks/use-staff';
import { useQueryClient } from '@tanstack/react-query';

interface HprVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: number;
  doctorName: string;
}

export function HprVerificationModal({ isOpen, onClose, doctorId, doctorName }: HprVerificationModalProps) {
  const [hpid, setHpid] = useState('');
  const [error, setError] = useState('');
  const verifyMutation = useVerifyHpr();
  const queryClient = useQueryClient();

  if (!isOpen) return null;

  const handleVerify = async () => {
    if (!hpid.trim() || hpid.length < 5) {
      setError('Please enter a valid Healthcare Professional ID (HPID)');
      return;
    }
    setError('');

    try {
      await verifyMutation.mutateAsync({ doctorId, hpid });
      // Invalidate queries so the doctor profile re-fetches and shows the green badge
      queryClient.invalidateQueries({ queryKey: ['staff', 'doctor', doctorId] });
      queryClient.invalidateQueries({ queryKey: ['staff', 'doctor'] });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="ABDM Digital Credential Access">
      <div style={{ padding: '24px' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, var(--pp-blue) 0%, #1e1b4b 100%)', 
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
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>Verify {doctorName}</h3>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.8, lineHeight: 1.5 }}>
            Enter the Healthcare Professional ID (HPID) to link this clinical profile with the National Health Authority's Registry.
          </p>
        </div>

        <div className="plat-form-group" style={{ marginBottom: '24px' }}>
          <label className="plat-form-label">Healthcare Professional ID (HPID)</label>
          <input
            type="text"
            className="plat-form-input"
            placeholder="e.g. user@hpr"
            value={hpid}
            onChange={(e) => {
              setHpid(e.target.value);
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
            style={{ flex: 2, display: 'flex', justifyContent: 'center', gap: '8px' }}
            disabled={verifyMutation.isPending || !hpid}
          >
            {verifyMutation.isPending ? (
              <>
                <Activity size={16} className="animate-spin" />
                Verifying via Sandbox...
              </>
            ) : (
              'Simulate ABDM Verification'
            )}
          </button>
        </div>
      </div>
    </Drawer>
  );
}
