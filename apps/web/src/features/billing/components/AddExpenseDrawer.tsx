import React, { useState, useEffect } from 'react';
import { Drawer } from '@/shared/components/drawer';
import { useCreateExpense, useExpenseHeads, useCreateExpenseHead } from '../hooks/use-accounts';
import '../styles/billing.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const EMPTY_FORM = {
  dateval: '',
  expDate: new Date().toISOString().split('T')[0],
  head: undefined as number | undefined,
  amount: 0,
  detail: '',
};

export function AddExpenseDrawer({ isOpen, onClose }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [customHeadName, setCustomHeadName] = useState('');

  const { data: heads = [] } = useExpenseHeads();
  const createExpense = useCreateExpense();
  const createExpenseHead = useCreateExpenseHead();

  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_FORM);
      setIsOtherSelected(false);
      setCustomHeadName('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let headId = form.head;

    if (isOtherSelected) {
      if (!customHeadName.trim()) {
        alert('Please enter a category name');
        return;
      }
      try {
        const newHead = await createExpenseHead.mutateAsync({ name: customHeadName, isActive: true });
        headId = newHead.id;
      } catch (err) {
        alert('Failed to create new category');
        return;
      }
    }

    if (!headId) {
      alert('Please select an expense head');
      return;
    }

    const payload = { ...form, head: headId };

    try {
      await createExpense.mutateAsync(payload as any);
      onClose();
    } catch (err) {
      alert('Failed to save expense');
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Add Expense Entry"
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit} className="bill-form">
        <div className="bill-form-group">
          <label className="bill-form-label">Expense Head <span className="bill-form-required" style={{ color: 'var(--pp-danger-fg)' }}>*</span></label>
          <select 
            className="bill-form-select" 
            value={isOtherSelected ? 'other' : (form.head ?? '')} 
            onChange={e => {
              if (e.target.value === 'other') {
                setIsOtherSelected(true);
                setForm(f => ({ ...f, head: undefined }));
              } else {
                setIsOtherSelected(false);
                setForm(f => ({ ...f, head: e.target.value ? parseInt(e.target.value) : undefined }));
              }
            }} 
            required
            style={{ height: 44, borderRadius: 12 }}
          >
            <option value="">Select category...</option>
            {heads.map((h: any) => <option key={h.id} value={h.id}>{h.name}</option>)}
            <option value="other" style={{ fontWeight: 700, color: 'var(--pp-blue)' }}>+ Other (Create New)</option>
          </select>
        </div>
        
        {isOtherSelected && (
          <div className="bill-form-group animate-fade-in">
            <label className="bill-form-label">New Category Name <span className="bill-form-required" style={{ color: 'var(--pp-danger-fg)' }}>*</span></label>
            <input 
              className="bill-form-input" 
              placeholder="Enter manual category name..." 
              value={customHeadName} 
              onChange={e => setCustomHeadName(e.target.value)}
              required 
              autoFocus
              style={{ borderRadius: 12 }}
            />
          </div>
        )}
        
        <div className="bill-form-row bill-form-row-2">
          <div className="bill-form-group">
            <label className="bill-form-label">Date</label>
            <input className="bill-form-input" type="date" value={form.expDate} onChange={e => setForm(f => ({ ...f, expDate: e.target.value }))} style={{ borderRadius: 12 }} />
          </div>
          <div className="bill-form-group">
            <label className="bill-form-label">Amount (₹) <span className="bill-form-required" style={{ color: 'var(--pp-danger-fg)' }}>*</span></label>
            <input className="bill-form-input" type="number" min={0} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} required style={{ borderRadius: 12, fontWeight: 800, fontSize: '1.1rem' }} />
          </div>
        </div>
        
        <div className="bill-form-group">
          <label className="bill-form-label">Description / Detail</label>
          <textarea className="bill-form-textarea" rows={4} value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} placeholder="e.g. Electricity bill for March 2026" style={{ borderRadius: 14 }} />
        </div>

        <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
          <button type="button" className="bill-btn" style={{ flex: 1, height: 48, borderRadius: 14 }} onClick={onClose}>Cancel</button>
          <button type="submit" className="bill-btn bill-btn-primary" style={{ flex: 2, height: 48, borderRadius: 14 }} disabled={createExpense.isPending}>
            Add Expense
          </button>
        </div>
      </form>
    </Drawer>
  );
}
