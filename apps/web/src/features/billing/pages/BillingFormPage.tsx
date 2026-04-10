import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus, Search, X, ChevronLeft } from 'lucide-react';
import { useCreateBill } from '../hooks/use-billing';
import { usePatients } from '@/features/patients/hooks/use-patients';
import { PaymentModeEnum } from '@mmc/validation';
import '../styles/billing.css';

export default function BillingFormPage() {
  const navigate = useNavigate();
  const createBill = useCreateBill();

  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<{ regid: number; name: string } | null>(null);

  const [formData, setFormData] = useState({
    charges:     0,
    received:    0,
    paymentMode: 'Cash' as const,
    treatment:   '',
    disease:     '',
    fromDate:    '',
    toDate:      '',
    notes:       '',
  });

  const patientsQuery = usePatients({ search: search || undefined, limit: 5 });

  const handlePatientSelect = (p: any) => {
    setSelectedPatient({ regid: p.regid, name: p.fullName });
    setSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return alert('Please select a patient');
    try {
      await createBill.mutateAsync({ regid: selectedPatient.regid, ...formData });
      navigate('/billing');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create bill');
    }
  };

  const balance = formData.charges - formData.received;
  const set = (key: string, val: any) => setFormData(prev => ({ ...prev, [key]: val }));

  return (
    <div className="bill-page fade-in" style={{ maxWidth: '860px' }}>

      {/* ─── Header ─── */}
      <div className="bill-header">
        <div>
          <h1 className="bill-header-title">
            <FilePlus size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Generate New Invoice
          </h1>
          <p className="bill-header-sub">Fill in treatment charges and payment details for official records.</p>
        </div>
        <div className="bill-header-actions">
          <button className="bill-btn" onClick={() => navigate('/billing')}>
            <ChevronLeft size={14} strokeWidth={2} />
            Back to Billing
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bill-card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ─── Section: Patient ─── */}
        <div className="bill-card-header">
          <div>
            <p className="bill-card-title">Patient Information</p>
            <p className="bill-card-sub">Search and select patient to bill</p>
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-main)' }}>
          {!selectedPatient ? (
            <div className="bill-search-wrap" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} strokeWidth={2} />
                <input
                  type="text"
                  className="bill-form-input"
                  style={{ paddingLeft: '32px' }}
                  placeholder="Search patient by name or ID…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {search && patientsQuery.data?.data && (
                <div className="bill-card" style={{ position: 'absolute', zIndex: 10, width: 'calc(100% - 40px)', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                  {patientsQuery.data.data.map(p => (
                    <button
                      key={p.regid}
                      type="button"
                      onClick={() => handlePatientSelect(p)}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', borderBottom: '1px solid var(--bg-surface-2)', background: 'none', cursor: 'pointer' }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>{p.fullName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        ID: #{p.regid} · {p.mobile1}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--primary-tint)', border: '1px solid var(--primary-border)', borderRadius: 'var(--radius-btn)' }}>
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '2px' }}>SELECTED PATIENT</p>
                <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>{selectedPatient.name}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: #{selectedPatient.regid}</p>
              </div>
              <button type="button" className="bill-btn bill-btn-sm" onClick={() => setSelectedPatient(null)}>
                <X size={12} strokeWidth={2} /> Change
              </button>
            </div>
          )}
        </div>

        {/* ─── Section: Financial + Treatment (2-col on desktop) ─── */}
        <div className="bill-form-row bill-form-row-2" style={{ padding: '20px', gap: '32px', alignItems: 'start' }}>

          {/* Financial Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p className="bill-section-title">Financial Details</p>

            <div className="bill-form-group">
              <label className="bill-form-label">Charges (₹) <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input className="bill-form-input" type="number" required
                style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700 }}
                value={formData.charges}
                onChange={e => set('charges', parseFloat(e.target.value) || 0)} />
            </div>

            <div className="bill-form-group">
              <label className="bill-form-label">Received (₹)</label>
              <input className="bill-form-input" type="number"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700 }}
                value={formData.received}
                onChange={e => set('received', parseFloat(e.target.value) || 0)} />
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-btn)', border: '1px solid var(--border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="bill-section-title">Balance Due</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                ₹{balance.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Service Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p className="bill-section-title">Service Details</p>

            <div className="bill-form-group">
              <label className="bill-form-label">Payment Mode</label>
              <select className="bill-form-select" value={formData.paymentMode} onChange={e => set('paymentMode', e.target.value)}>
                {PaymentModeEnum.options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div className="bill-form-group">
              <label className="bill-form-label">Treatment / Reason</label>
              <input className="bill-form-input" type="text"
                value={formData.treatment} onChange={e => set('treatment', e.target.value)}
                placeholder="Clinical reason…" />
            </div>

            <div className="bill-form-row bill-form-row-2" style={{ gap: '10px' }}>
              <div className="bill-form-group">
                <label className="bill-form-label">From Date</label>
                <input className="bill-form-input" type="date"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                  value={formData.fromDate} onChange={e => set('fromDate', e.target.value)} />
              </div>
              <div className="bill-form-group">
                <label className="bill-form-label">To Date</label>
                <input className="bill-form-input" type="date"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
                  value={formData.toDate} onChange={e => set('toDate', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Footer Actions ─── */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-main)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" className="bill-btn" onClick={() => navigate('/billing')}>
            Cancel
          </button>
          <button type="submit" className="bill-btn bill-btn-primary" disabled={createBill.isPending} style={{ minWidth: '160px' }}>
            {createBill.isPending ? 'Processing…' : 'Generate Invoice'}
          </button>
        </div>

      </form>
    </div>
  );
}
