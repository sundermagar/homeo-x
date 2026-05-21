import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus, Search, X, ChevronLeft } from 'lucide-react';
import { useCreateCustomBill } from '../hooks/use-billing';
import { usePatients } from '@/features/patients/hooks/use-patients';
import { PaymentModeEnum } from '@mmc/validation';
import '../styles/billing.css';

export function CustomBillForm({ onSuccess, onCancel }: { onSuccess?: () => void; onCancel?: () => void }) {
  const navigate = useNavigate();
  const createCustomBill = useCreateCustomBill();

  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<{ regid: number; name: string } | null>(null);

  const [formData, setFormData] = useState({
    customTitle:   '',
    charges:      0,
    received:     0,
    paymentMode:  'Cash' as const,
    notes:        '',
  });

  const patientsQuery = usePatients({ search: search || undefined, limit: 5 });

  const handlePatientSelect = (p: any) => {
    setSelectedPatient({ regid: p.regid, name: p.fullName });
    setSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return alert('Please select a patient');
    if (!formData.customTitle.trim()) return alert('Please enter a bill title');
    try {
      await createCustomBill.mutateAsync({ regid: selectedPatient.regid, ...formData });
      if (onSuccess) onSuccess();
      else navigate('/billing');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create custom bill');
    }
  };

  const balance = formData.charges - formData.received;
  const set = (key: string, val: any) => setFormData(prev => ({ ...prev, [key]: val }));

  return (
    <form onSubmit={handleSubmit} className="bill-card bill-form-card" style={{ boxShadow: 'none', border: 'none', padding: 0 }}>

        {/* ─── Section: Patient ─── */}
        <div className="bill-card-header">
          <div>
            <p className="bill-card-title">Patient Information</p>
            <p className="bill-card-sub">Search and select patient to bill</p>
          </div>
        </div>

        <div className="bill-form-section">
          {!selectedPatient ? (
            <div className="bill-search-relative">
              <div className="bill-search-wrap">
                <Search size={14} className="bill-search-icon" strokeWidth={2} />
                <input
                  type="text"
                  className="bill-form-input bill-search-input"
                  placeholder="Search patient by name or ID…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {search && patientsQuery.data?.data && (
                <div className="bill-card bill-dropdown-overlay">
                  {patientsQuery.data.data.map((p: any) => (
                    <button
                      key={p.regid}
                      type="button"
                      onClick={() => handlePatientSelect(p)}
                      className="bill-dropdown-item"
                    >
                      <div className="bill-dropdown-item-name">{p.fullName}</div>
                      <div className="bill-dropdown-item-meta">ID: #{p.regid} · {p.mobile1}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bill-patient-chip">
              <div>
                <p className="bill-patient-chip-label">Selected Patient</p>
                <p className="bill-patient-chip-name">{selectedPatient.name}</p>
                <p className="bill-patient-chip-id">ID: #{selectedPatient.regid}</p>
              </div>
              <button type="button" className="bill-btn bill-btn-sm" onClick={() => setSelectedPatient(null)}>
                <X size={12} strokeWidth={2} /> Change
              </button>
            </div>
          )}
        </div>

        {/* ─── Section: Custom Bill Details (Stacked for Drawer) ─── */}
        <div className="bill-form-section" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Billing Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p className="bill-section-title">Billing Details</p>

              <div className="bill-form-group">
                <label className="bill-form-label">Bill Title <span style={{ color: 'var(--pp-danger-fg)' }}>*</span></label>
                <input className="bill-form-input" type="text" required
                  placeholder="e.g., Equipment Rental, Miscellaneous Charges"
                  value={formData.customTitle}
                  onChange={e => set('customTitle', e.target.value)} />
              </div>

              <div className="bill-form-group">
                <label className="bill-form-label">Charges (₹) <span style={{ color: 'var(--pp-danger-fg)' }}>*</span></label>
                <input className="bill-form-input" type="number" required
                  style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '1.1rem', fontWeight: 700 }}
                  value={formData.charges}
                  onChange={e => set('charges', parseFloat(e.target.value) || 0)} />
              </div>

              <div className="bill-form-group">
                <label className="bill-form-label">Received (₹)</label>
                <input className="bill-form-input" type="number"
                  style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '1.1rem', fontWeight: 700 }}
                  value={formData.received}
                  onChange={e => set('received', parseFloat(e.target.value) || 0)} />
              </div>

              <div className="bill-balance-row">
                <span className="bill-balance-label">Balance Due</span>
                <span className="bill-balance-value" style={{ color: balance > 0 ? 'var(--pp-danger-fg)' : 'var(--pp-success-fg)' }}>
                  ₹{balance.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment & Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p className="bill-section-title">Payment & Notes</p>

              <div className="bill-form-group">
                <label className="bill-form-label">Payment Mode</label>
                <select className="bill-form-select" value={formData.paymentMode} onChange={e => set('paymentMode', e.target.value)}>
                  {PaymentModeEnum.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="bill-form-group">
                <label className="bill-form-label">Notes / Description</label>
                <textarea className="bill-form-input"
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  placeholder="Additional details about this charge…"
                  value={formData.notes} onChange={e => set('notes', e.target.value)} />
              </div>
            </div>
        </div>

        {/* ─── Footer Actions ─── */}
        <div className="bill-form-section" style={{ display: 'flex', gap: 'var(--pp-space-3)', justifyContent: 'flex-end' }}>
          <button type="button" className="bill-btn" onClick={() => onCancel ? onCancel() : navigate('/billing')}>
            Cancel
          </button>
          <button type="submit" className="bill-btn bill-btn-primary" disabled={createCustomBill.isPending} style={{ minWidth: '160px' }}>
            {createCustomBill.isPending ? 'Processing…' : 'Create Custom Bill'}
          </button>
        </div>

      </form>
  );
}

export default function CustomBillPage() {
  const navigate = useNavigate();
  return (
    <div className="bill-page fade-in" style={{ maxWidth: '860px' }}>
      <div className="bill-header">
        <div>
          <h1 className="bill-header-title">
            <FilePlus size={20} strokeWidth={1.6} style={{ color: 'var(--pp-blue)' }} />
            Custom Bill
          </h1>
          <p className="bill-header-sub">Create a manual invoice for miscellaneous charges.</p>
        </div>
        <div className="bill-header-actions">
          <button className="bill-btn" onClick={() => navigate('/billing')}>
            <ChevronLeft size={14} strokeWidth={2} />
            Back to Billing
          </button>
        </div>
      </div>
      <div className="bill-card bill-form-card">
        <CustomBillForm onSuccess={() => navigate('/billing')} onCancel={() => navigate('/billing')} />
      </div>
    </div>
  );
}
