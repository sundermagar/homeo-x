import React, { useState } from 'react';
import { X, CheckCircle2, Package, Calendar, Info, Clock } from 'lucide-react';
import { usePackagePlans, useAssignPackage } from '../hooks/use-packages';
import '../styles/packages.css';

interface AssignPackageModalProps {
  regid: number;
  patientId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AssignPackageModal({ regid, patientId, onClose, onSuccess }: AssignPackageModalProps) {
  const { data: plans = [], isLoading: plansLoading } = usePackagePlans();
  const assignPackage = useAssignPackage();

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]!);
  const [notes, setNotes] = useState('');

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) return;

    try {
      await assignPackage.mutateAsync({
        regid,
        patientId,
        packageId: selectedPlanId,
        startDate,
        notes,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to assign package:', err);
    }
  };

  return (
    <div className="pkg-modal-overlay" onClick={onClose}>
      <div className="pkg-modal" onClick={e => e.stopPropagation()}>
        <div className="pkg-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={20} />
            </div>
            <div>
              <h2 className="pkg-modal-title">Assign Clinical Package</h2>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>RegID: PT-{regid}</p>
            </div>
          </div>
          <button className="pkg-btn pkg-btn-ghost pkg-btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="pkg-modal-body">
            {/* Plan Chips */}
            <div className="pkg-form-group">
              <label className="pkg-form-label">Select Membership Plan *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                {plansLoading ? (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Loading plans...</p>
                ) : plans.filter(p => p.isActive).length === 0 ? (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No active plans available.</p>
                ) : (
                  plans.filter(p => p.isActive).map(plan => (
                    <div 
                      key={plan.id}
                      className={`pkg-plan-chip ${selectedPlanId === plan.id ? 'active' : ''}`}
                      onClick={() => setSelectedPlanId(plan.id)}
                      style={{ 
                        padding: '12px 16px',
                        border: '1.5px solid var(--border-main)',
                        borderRadius: 'var(--radius-card)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 150ms',
                        ...(selectedPlanId === plan.id ? {
                          borderColor: 'var(--primary)',
                          background: 'var(--primary-tint)',
                          boxShadow: '0 4px 12px rgba(37,99,235,0.08)'
                        } : {})
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: selectedPlanId === plan.id ? 'var(--primary)' : 'var(--text-main)' }}>{plan.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Clock size={10} /> {plan.durationDays} days validity
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>₹{plan.price.toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pkg-form-row pkg-form-row-2">
              <div className="pkg-form-group">
                <label className="pkg-form-label">Activation Date *</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input 
                    type="date" 
                    className="pkg-form-input" 
                    style={{ paddingLeft: 36 }}
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)}
                    required 
                  />
                </div>
              </div>
              <div className="pkg-form-group">
                <label className="pkg-form-label">Expiry Date</label>
                <div 
                  className="pkg-form-input" 
                  style={{ background: 'var(--bg-surface-2)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                >
                  {selectedPlan ? (() => {
                    const start = new Date(startDate);
                    const expiry = new Date(start);
                    expiry.setDate(expiry.getDate() + selectedPlan.durationDays);
                    return expiry.toISOString().split('T')[0];
                  })() : '—'}
                </div>
              </div>
            </div>

            <div className="pkg-form-group">
              <label className="pkg-form-label">Notes / Instructions</label>
              <textarea 
                className="pkg-form-input" 
                rows={3} 
                style={{ resize: 'none' }}
                placeholder="Add any specific conditions or remarks for this membership…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {selectedPlan && (
              <div style={{ display: 'flex', gap: 10, padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <Info size={16} style={{ color: '#3B82F6', marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#475569', lineHeight: 1.4 }}>
                  Assigning this package will automatically generate a invoice of <strong>₹{selectedPlan.price.toLocaleString()}</strong> in the billing module.
                </p>
              </div>
            )}
          </div>

          <div className="pkg-modal-footer">
            <button type="button" className="pkg-btn" onClick={onClose}>Cancel</button>
            <button 
              type="submit" 
              className="pkg-btn pkg-btn-primary"
              disabled={!selectedPlanId || assignPackage.isPending}
            >
              <CheckCircle2 size={16} strokeWidth={2} />
              {assignPackage.isPending ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
