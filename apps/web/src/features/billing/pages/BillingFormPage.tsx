import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus, Search, X, ChevronLeft } from 'lucide-react';
import { useCreateBill } from '../hooks/use-billing';
import { usePatients } from '@/features/patients/hooks/use-patients';
import { PaymentModeEnum } from '@mmc/validation';
import { CodeAutocomplete } from '@/shared/components/code-autocomplete';
import type { IcdCodeResult, ProcedureCodeResult } from '@/shared/hooks/use-terminology';
import '../styles/billing.css';

export function BillingForm({ onSuccess, onCancel }: { onSuccess?: () => void; onCancel?: () => void }) {
  const navigate = useNavigate();
  const createBill = useCreateBill();

  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<{ regid: number; name: string } | null>(null);
  const [selectedIcd, setSelectedIcd] = useState<IcdCodeResult | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<ProcedureCodeResult | null>(null);

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
      await createBill.mutateAsync({
        regid: selectedPatient.regid,
        ...formData,
        treatment: selectedProcedure ? `[${selectedProcedure.code}] ${selectedProcedure.name}` : formData.treatment,
        disease: selectedIcd ? `[${selectedIcd.code}] ${selectedIcd.description}` : formData.disease,
      });
      if (onSuccess) onSuccess();
      else navigate('/billing');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create bill');
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

        {/* ─── Section: Financial + Treatment (Stacked for Drawer) ─── */}
        <div className="bill-form-section" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Financial Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p className="bill-section-title">Financial Details</p>

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
                <label className="bill-form-label">Treatment / Procedure Code</label>
                <CodeAutocomplete
                  type="procedure"
                  placeholder="Search procedure code or type free text..."
                  value={selectedProcedure}
                  onSelect={(code) => {
                    setSelectedProcedure(code as ProcedureCodeResult | null);
                    if (code) set('treatment', `[${(code as ProcedureCodeResult).code}] ${(code as ProcedureCodeResult).name}`);
                  }}
                />
                {!selectedProcedure && (
                  <input className="bill-form-input" type="text" style={{ marginTop: '8px' }}
                    value={formData.treatment} onChange={e => set('treatment', e.target.value)}
                    placeholder="Or type treatment reason manually…" />
                )}
              </div>

              <div className="bill-form-group">
                <label className="bill-form-label">Disease / Diagnosis (ICD)</label>
                <CodeAutocomplete
                  type="icd"
                  placeholder="Search ICD diagnosis code..."
                  value={selectedIcd}
                  onSelect={(code) => {
                    setSelectedIcd(code as IcdCodeResult | null);
                    if (code) set('disease', `[${(code as IcdCodeResult).code}] ${(code as IcdCodeResult).description}`);
                  }}
                />
                {!selectedIcd && (
                  <input className="bill-form-input" type="text" style={{ marginTop: '8px' }}
                    value={formData.disease} onChange={e => set('disease', e.target.value)}
                    placeholder="Or type disease manually…" />
                )}
              </div>

              <div className="bill-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="bill-form-group">
                  <label className="bill-form-label">From Date</label>
                  <input className="bill-form-input" type="date"
                    style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.82rem' }}
                    value={formData.fromDate} onChange={e => set('fromDate', e.target.value)} />
                </div>
                <div className="bill-form-group">
                  <label className="bill-form-label">To Date</label>
                  <input className="bill-form-input" type="date"
                    style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.82rem' }}
                    value={formData.toDate} onChange={e => set('toDate', e.target.value)} />
                </div>
              </div>
            </div>
        </div>

        {/* ─── Footer Actions ─── */}
        <div className="bill-form-section" style={{ display: 'flex', gap: 'var(--pp-space-3)', justifyContent: 'flex-end' }}>
          <button type="button" className="bill-btn" onClick={() => onCancel ? onCancel() : navigate('/billing')}>
            Cancel
          </button>
          <button type="submit" className="bill-btn bill-btn-primary" disabled={createBill.isPending} style={{ minWidth: '160px' }}>
            {createBill.isPending ? 'Processing…' : 'Generate Invoice'}
          </button>
        </div>

      </form>
  );
}

export default function BillingFormPage() {
  const navigate = useNavigate();
  return (
    <div className="bill-page fade-in" style={{ maxWidth: '860px' }}>
      <div className="bill-header">
        <div>
          <h1 className="bill-header-title">
            <FilePlus size={20} strokeWidth={1.6} style={{ color: 'var(--pp-blue)' }} />
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
      <div className="bill-card bill-form-card">
        <BillingForm onSuccess={() => navigate('/billing')} onCancel={() => navigate('/billing')} />
      </div>
    </div>
  );
}
