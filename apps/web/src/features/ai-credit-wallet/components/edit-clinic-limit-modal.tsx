import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Building2, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ClinicWallet } from '../hooks/use-routing-data';

interface EditClinicLimitModalProps {
  wallet: ClinicWallet;
  onClose: () => void;
  onSave: (id: string, newLimit: number) => void;
}

export function EditClinicLimitModal({ wallet, onClose, onSave }: EditClinicLimitModalProps) {
  const [limit, setLimit] = useState(wallet.monthlyLimit);

  const handleSave = () => {
    onSave(wallet.id, limit);
    toast({
      title: 'Limit Updated',
      description: `${wallet.name}'s monthly limit is now ₹${limit.toLocaleString()}.`,
    });
    onClose();
  };

  return createPortal(
    <>
      <div className="cw-slide-overlay animate-fade-in" onClick={onClose} />
      <div className="cw-slide-panel animate-slide-in" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="cw-slide-header">
          <div className="cw-slide-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} style={{ color: '#2563EB' }} />
            Edit Clinic Limit
          </div>
          <button className="cw-slide-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="cw-slide-content" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>{wallet.name}</h4>
            <p style={{ fontSize: '13px', color: '#6B7280' }}>ID: {wallet.id}</p>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
              Monthly Spending Limit (₹)
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '9px', color: '#6B7280', fontSize: '14px', fontWeight: 500 }}>₹</span>
              <input 
                type="number" 
                className="cw-form-input" 
                style={{ paddingLeft: '28px', fontSize: '15px', fontWeight: 600 }}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              />
            </div>
            <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>
              Currently spent this month: <strong>₹{wallet.spentThisMonth.toLocaleString()}</strong>
            </p>
          </div>

          <button 
            className="plat-btn plat-btn-primary" 
            style={{ width: '100%', padding: '10px', fontSize: '14px', display: 'flex', justifyContent: 'center', gap: '8px' }}
            onClick={handleSave}
          >
            <Save size={16} /> Save Limit
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
