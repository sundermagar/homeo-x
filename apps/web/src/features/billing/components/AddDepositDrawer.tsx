import React, { useState, useEffect } from 'react';
import { Drawer } from '@/shared/components/drawer';
import { Building, Banknote } from 'lucide-react';
import { useCreateBankDeposit, useCreateCashDeposit } from '../hooks/use-accounts';
import '../styles/billing.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'bank' | 'cash';
}

export function AddDepositDrawer({ isOpen, onClose, initialTab = 'bank' }: Props) {
  const [activeTab, setActiveTab] = useState<'bank' | 'cash'>(initialTab);
  const [submissionError, setSubmissionError] = useState('');

  const createBank = useCreateBankDeposit();
  const createCash = useCreateCashDeposit();

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSubmissionError('');
    }
  }, [isOpen, initialTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError('');
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const depositDate = (data.get('depositDate') as string)?.trim();
    const amount = (data.get('amount') as string)?.trim();

    if (!depositDate || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(depositDate)) {
      setSubmissionError('Deposit date is required and must be YYYY-MM-DD.');
      return;
    }
    if (!amount) {
      setSubmissionError('Amount is required.');
      return;
    }
    if (!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(amount)) {
      setSubmissionError('Amount must be a valid number.');
      return;
    }

    const payload = {
      depositDate,
      amount,
      remark: (data.get('remark') as string) || undefined,
      bankdeposit: (data.get('bankdeposit') as string) || undefined,
      comments: (data.get('comments') as string) || undefined,
      submitted: (data.get('submitted') as 'Yes' | 'No') ?? 'No',
    };

    try {
      if (activeTab === 'bank') {
        await createBank.mutateAsync(payload);
      } else {
        await createCash.mutateAsync(payload);
      }
      onClose();
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.message || 'Unable to save deposit.';
      setSubmissionError(String(msg));
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Add ${activeTab === 'bank' ? 'Bank' : 'Cash'} Deposit`}
      maxWidth="480px"
    >
      <div className="bill-view-toggle-group" style={{ width: '100%', marginBottom: 24 }}>
        <button 
          type="button" 
          className={`bill-view-toggle-btn${activeTab === 'bank' ? ' is-active' : ''}`} 
          onClick={() => setActiveTab('bank')}
          style={{ flex: 1, padding: '10px' }}
        >
          <Building size={14} /> Bank
        </button>
        <button 
          type="button" 
          className={`bill-view-toggle-btn${activeTab === 'cash' ? ' is-active' : ''}`} 
          onClick={() => setActiveTab('cash')}
          style={{ flex: 1, padding: '10px' }}
        >
          <Banknote size={14} /> Cash
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bill-form">
        {submissionError && (
          <div style={{ color: 'var(--pp-danger-fg)', marginBottom: 16, fontWeight: 600 }}>{submissionError}</div>
        )}
        <div className="bill-form-group">
          <label className="bill-form-label">Deposit Date <span style={{ color: 'var(--pp-danger-fg)' }}>*</span></label>
          <input className="bill-form-input" name="depositDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
        </div>
        <div className="bill-form-group">
          <label className="bill-form-label">Amount <span style={{ color: 'var(--pp-danger-fg)' }}>*</span></label>
          <input className="bill-form-input" name="amount" type="text" required placeholder="e.g. 5000" />
        </div>
        <div className="bill-form-group">
          <label className="bill-form-label">{activeTab === 'bank' ? 'Bank/Account' : 'Source/Category'}</label>
          <input 
            className="bill-form-input" 
            name="bankdeposit" 
            placeholder={activeTab === 'bank' ? "e.g. HDFC Bank - Acc ****1234" : "e.g. Cash in Hand, Counter Cash"} 
          />
        </div>
        <div className="bill-form-group">
          <label className="bill-form-label">Remark</label>
          <textarea className="bill-form-input" name="remark" rows={2} placeholder="Optional notes..." />
        </div>
        <div className="bill-form-group">
          <label className="bill-form-label">Comments</label>
          <textarea className="bill-form-input" name="comments" rows={2} />
        </div>
        <div className="bill-form-group">
          <label className="bill-form-label">Status</label>
          <select className="bill-form-input" name="submitted" defaultValue="No">
            <option value="No">Pending</option>
            <option value="Yes">Submitted</option>
          </select>
        </div>
        <button type="submit" className="bill-btn bill-btn-primary" style={{ marginTop: 24, width: '100%', height: 44 }} disabled={createBank.isPending || createCash.isPending}>
          Record Deposit
        </button>
      </form>
    </Drawer>
  );
}
