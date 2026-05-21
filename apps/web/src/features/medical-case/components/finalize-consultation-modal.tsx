import React, { useState } from 'react';
import { CheckCircle, CreditCard, DollarSign, X, Package, Loader2 } from 'lucide-react';
import { useManageClinicalRecords } from '../hooks/use-medical-cases';
import { useRemedyLookups } from '../hooks/use-remedy-chart';
import { useNavigate } from 'react-router-dom';

interface FinalizeConsultationModalProps {
  regid: number;
  visitId: number;
  prescriptions: any[];
  defaultConsultationFee?: number;
  defaultMedicineDaysCharge?: number;
  activePackageName?: string;
  onClose: () => void;
}

export function FinalizeConsultationModal({ 
  regid, 
  visitId, 
  prescriptions, 
  defaultConsultationFee = 500,
  defaultMedicineDaysCharge = 0,
  activePackageName,
  onClose 
}: FinalizeConsultationModalProps) {
  const navigate = useNavigate();
  const { finalizeConsultation } = useManageClinicalRecords();
  const { data: lookups } = useRemedyLookups();
  
  const [fee, setFee] = useState(defaultConsultationFee);
  const [medicineCharge, setMedicineCharge] = useState(defaultMedicineDaysCharge);
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
        consultationFee: fee + medicineCharge,
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
    <>
      <div className="mc-drawer-backdrop" onClick={onClose} />
      <div className="mc-drawer">
        <div className="mc-drawer-header">
          <div className="mc-drawer-header-title">
            <CheckCircle size={18} /> Finalize Consultation
          </div>
          <button className="mc-drawer-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ padding: '16px 20px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>SESSION END</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Confirm charges & complete session</div>
        </div>

        <div className="mc-drawer-body" style={{ flex: 1, padding: '24px' }}>
          {activePackageName && (
            <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>💎</span>
              <p style={{ fontSize: '0.75rem', color: '#065f46', margin: 0, fontWeight: 500, lineHeight: 1.4 }}>
                <strong>Medicine charges</strong> are automatically waived due to active <strong>{activePackageName}</strong> plan.
              </p>
            </div>
          )}

          {/* Summary */}
          <div style={{ marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '12px' }}>Session Summary</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.9rem', color: '#475569' }}>Prescriptions Today:</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{itemsToBill.length}</span>
            </div>
            {itemsToBill.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {itemsToBill.map((p, i) => (
                  <span key={i} style={{ padding: '4px 10px', background: '#e0e7ff', color: '#4338ca', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600 }}>{p.remedy_name}</span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div className="mc-legacy-input-group">
              <label>Base Consultation Fee (₹)</label>
              <input 
                type="number" 
                value={fee} 
                onChange={e => setFee(Number(e.target.value))}
                className="mc-legacy-input"
                style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2563eb' }}
              />
            </div>
            
            <div className="mc-legacy-input-group">
              <label>Medicine Charges (₹)</label>
              <input 
                type="number" 
                value={medicineCharge} 
                onChange={e => setMedicineCharge(Number(e.target.value))}
                className="mc-legacy-input"
                style={{ fontSize: '1.2rem', fontWeight: 700, color: '#475569' }}
              />
            </div>
          </div>
          
          <div style={{ padding: '16px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e40af' }}>Total Session Charge</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1d4ed8' }}>₹{fee + medicineCharge}</span>
          </div>

          <div className="mc-legacy-input-group">
            <label>Payment Mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button 
                className={`mc-investigation-tab ${paymentMode === 'Cash' ? 'active' : ''}`}
                onClick={() => setPaymentMode('Cash')}
                style={{ width: '100%', justifyContent: 'center', height: '44px' }}
              >
                <DollarSign size={14} /> Cash
              </button>
              <button 
                className={`mc-investigation-tab ${paymentMode === 'Online' ? 'active' : ''}`}
                onClick={() => setPaymentMode('Online')}
                style={{ width: '100%', justifyContent: 'center', height: '44px' }}
              >
                <CreditCard size={14} /> Online
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '12px', fontStyle: 'italic', lineHeight: 1.4 }}>
              Note: This will automatically generate a bill for the front-office team and mark this visit as completed.
            </p>
          </div>
        </div>

        <div style={{ padding: '20px', background: 'white', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px' }}>
          <button className="mc-legacy-btn-secondary" style={{ flex: 1 }} onClick={onClose}>Discard</button>
          <button 
            className="mc-legacy-btn-primary" 
            onClick={handleFinalize}
            disabled={isProcessing}
            style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            Confirm & Finalize
          </button>
        </div>
      </div>
    </>
  );
}
