import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Wallet, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiClient } from '@/infrastructure/api-client';
import { useQueryClient } from '@tanstack/react-query';
import '../styles/ai-models.css';

interface AddCreditsModalProps {
  onClose: () => void;
}

const QUICK_AMOUNTS = [5000, 10000, 25000];
const RATE_PER_INR = 10; // 1 INR = 10 Credits

export function AddCreditsModal({ onClose }: AddCreditsModalProps) {
  const [amount, setAmount] = useState<number | ''>(5000);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const creditsGained = (typeof amount === 'number' ? amount : 0) * RATE_PER_INR;

  const queryClient = useQueryClient();

  const handleDeposit = async () => {
    if (!amount || amount <= 0) return;
    
    setIsProcessing(true);
    try {
      await apiClient.post('/ai-ops/wallet/deposit', {
        amount_inr: amount,
        reference,
        notes
      });
      
      toast({
        title: 'Deposit Successful',
        description: `₹${amount.toLocaleString()} deposited. ${creditsGained.toLocaleString()} credits added to wallet.`,
      });
      
      // Invalidate dashboard queries to reflect new balance
      queryClient.invalidateQueries({ queryKey: ['aiOpsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['aiOpsTransactions'] });
      
      onClose();
    } catch (error: any) {
      toast({
        title: 'Deposit Failed',
        description: error.response?.data?.error || 'Failed to process deposit.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return createPortal(
    <>
      <div className="cw-slide-overlay animate-fade-in" onClick={onClose} />
      <div className="cw-slide-panel animate-slide-in" style={{ maxWidth: '480px', width: '100%' }}>
        <div className="cw-slide-header">
          <div className="cw-slide-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={18} style={{ color: '#2563EB' }} />
            Deposit Funds
          </div>
          <button className="cw-slide-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="cw-slide-content" style={{ padding: '24px', overflowY: 'auto' }}>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
              Deposit Amount (₹)
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {QUICK_AMOUNTS.map(amt => (
                <button 
                  key={amt}
                  onClick={() => setAmount(amt)}
                  style={{ 
                    flex: 1, 
                    padding: '8px 0', 
                    background: amount === amt ? '#EFF6FF' : 'white',
                    border: `1px solid ${amount === amt ? '#2563EB' : '#D1D5DB'}`,
                    color: amount === amt ? '#1E3A8A' : '#4B5563',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  ₹{amt.toLocaleString()}
                </button>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '9px', color: '#6B7280', fontSize: '14px', fontWeight: 500 }}>₹</span>
              <input 
                type="number" 
                className="cw-form-input" 
                style={{ paddingLeft: '28px', fontSize: '16px', fontWeight: 600 }}
                placeholder="Custom Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
          </div>

          <div style={{ background: '#F9FAFB', border: '1px dashed #D1D5DB', borderRadius: '8px', padding: '16px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Conversion Rate</div>
              <div style={{ fontSize: '14px', color: '#374151', fontWeight: 600 }}>₹1 = {RATE_PER_INR} Credits</div>
            </div>
            <ArrowRight size={16} color="#9CA3AF" />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>Credits to Add</div>
              <div style={{ fontSize: '18px', color: '#10B981', fontWeight: 700 }}>+{creditsGained.toLocaleString()}</div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
              Payment Reference (Optional)
            </label>
            <input 
              type="text" 
              className="cw-form-input" 
              placeholder="e.g. INV-2026-05"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
              Notes (Optional)
            </label>
            <textarea 
              className="cw-form-input" 
              placeholder="Internal notes about this deposit..."
              rows={3}
              style={{ resize: 'none' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button 
            className="plat-btn plat-btn-primary" 
            style={{ width: '100%', padding: '12px', fontSize: '15px' }}
            disabled={!amount || amount <= 0 || isProcessing}
            onClick={handleDeposit}
          >
            {isProcessing ? 'Processing Deposit...' : 'Confirm Deposit'}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
