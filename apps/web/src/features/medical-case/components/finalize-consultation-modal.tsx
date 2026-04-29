import React, { useState } from 'react';
import { CheckCircle, CreditCard, DollarSign, X, Package } from 'lucide-react';
import { useManageClinicalRecords } from '../hooks/use-medical-cases';
import { useRemedyLookups } from '../hooks/use-remedy-chart';
import { useNavigate } from 'react-router-dom';

interface FinalizeConsultationModalProps {
  regid: number;
  visitId: number;
  prescriptions: any[];
  onClose: () => void;
}

export function FinalizeConsultationModal({ regid, visitId, prescriptions, onClose }: FinalizeConsultationModalProps) {
  const navigate = useNavigate();
  const { finalizeConsultation } = useManageClinicalRecords();
  const { data: lookups } = useRemedyLookups();
  
  const [fee, setFee] = useState(500);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [isProcessing, setIsProcessing] = useState(false);

  // Map today's prescriptions to IDs for inventory deduction
  const todayStr = new Date().toISOString().split('T')[0];
  const itemsToBill = prescriptions?.filter(p => p.created_at?.startsWith(todayStr)) || [];

  const handleFinalize = async () => {
    setIsProcessing(true);
    try {
      // Map remedy names to medicine IDs for the backend
      const mappedPrescriptions = itemsToBill.map(p => {
        const medicine = lookups?.medicines?.find(m => m.name.toLowerCase() === p.remedy_name?.toLowerCase());
        return {
          medicineId: medicine?.id || 0,
          amount: 1 // Default 1 unit per prescription for now
        };
      }).filter(p => p.medicineId > 0);

      await finalizeConsultation.mutateAsync({
        regid,
        visitId,
        consultationFee: fee,
        paymentMode,
        prescriptions: mappedPrescriptions
      });

      onClose();
      navigate('/medical-cases');
    } catch (err) {
      console.error(err);
      alert('Failed to finalize consultation');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mc-modal-overlay">
      <div className="mc-modal" style={{ maxWidth: '480px' }}>
        <div className="mc-modal-header">
          <div className="mc-modal-title-group">
            <div className="mc-modal-icon-bg" style={{ background: 'var(--pp-blue-tint)', color: 'var(--pp-blue)' }}>
              <CheckCircle size={24} />
            </div>
            <div>
              <h2 className="mc-modal-title">Finalize Consultation</h2>
              <p className="mc-modal-sub">Confirm charges and complete session</p>
            </div>
          </div>
          <button className="mc-modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="mc-modal-body">
          {/* Summary */}
          <div style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Session Summary</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.9rem', color: '#475569' }}>Prescriptions Today:</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{itemsToBill.length}</span>
            </div>
            {itemsToBill.length > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {itemsToBill.map((p, i) => (
                  <span key={i} className="mc-condition-chip indigo" style={{ fontSize: '0.65rem' }}>{p.remedy_name}</span>
                ))}
              </div>
            )}
          </div>

          <div className="mc-form-section">
            <div className="mc-input-group" style={{ marginBottom: '20px' }}>
              <label>Consultation Fee (₹)</label>
              <div className="mc-input-wrap">
                <DollarSign size={16} className="mc-input-icon" />
                <input 
                  type="number" 
                  value={fee} 
                  onChange={e => setFee(Number(e.target.value))}
                  style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--pp-blue)' }}
                />
              </div>
            </div>

            <div className="mc-input-group">
              <label>Payment Status</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button 
                  className={`mc-investigation-tab ${paymentMode === 'Cash' ? 'active' : ''}`}
                  onClick={() => setPaymentMode('Cash')}
                  style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <DollarSign size={14} /> Cash
                </button>
                <button 
                  className={`mc-investigation-tab ${paymentMode === 'Online' ? 'active' : ''}`}
                  onClick={() => setPaymentMode('Online')}
                  style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <CreditCard size={14} /> Online
                </button>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '8px', fontStyle: 'italic' }}>
                Note: This will initiate an automatic bill for the front-office staff.
              </p>
            </div>
          </div>
        </div>

        <div className="mc-modal-footer">
          <button className="mc-btn-secondary" onClick={onClose}>Discard</button>
          <button 
            className="mc-legacy-btn-primary" 
            onClick={handleFinalize}
            disabled={isProcessing}
            style={{ minWidth: '140px' }}
          >
            {isProcessing ? 'Processing...' : 'Confirm & Finalize'}
          </button>
        </div>
      </div>
    </div>
  );
}
