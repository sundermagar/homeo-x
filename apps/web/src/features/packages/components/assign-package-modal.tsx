import React, { useState } from 'react';
import { CheckCircle2, Calendar, Info, Clock } from 'lucide-react';
import { Drawer } from '@/shared/components/drawer';
import { usePackagePlans, useAssignPackage } from '../hooks/use-packages';
import '../styles/packages.css';

interface AssignPackageModalProps {
  patientId: number;
  patientName?: string;
  preselectedPlanId?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AssignPackageModal({ 
  patientId, 
  patientName, 
  preselectedPlanId,
  isOpen, 
  onClose, 
  onSuccess 
}: AssignPackageModalProps) {
  const { data: plans = [], isLoading: plansLoading } = usePackagePlans();
  const assignPackage = useAssignPackage();

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(preselectedPlanId ?? null);
  const [startDate, setStartDate] = useState(new Date().toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).split(',')[0]);
  const [startFrom, setStartFrom] = useState<'today' | 'expiry'>('today');
  const [notes, setNotes] = useState('');

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) return;

    try {
      await assignPackage.mutateAsync({
        regid: patientId,
        patientId,
        packageId: selectedPlanId,
        startDate,
        startFrom,
        notes,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to assign package:', err);
    }
  };


  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="540px"
      title="Assign Clinical Package"
    >
      <div className="pkg-drawer-header-meta">
        <div className="pkg-drawer-patient">
          <div className="pkg-drawer-avatar">{(patientName?.[0] || 'P').toUpperCase()}</div>
          <div>
            <div className="pkg-drawer-patient-name">{patientName || 'Loading Patient...'}</div>
            <div className="pkg-drawer-regid">RegID: #{patientId}</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="pkg-drawer-form">
        <div className="pkg-form-group">
          <label className="pkg-form-label">Select Membership Plan *</label>
          <div className="pkg-plan-selection-grid">
            {plansLoading ? (
              [1, 2, 3].map(i => <div key={i} className="pp-skeleton" style={{ height: '72px', borderRadius: '12px' }} />)
            ) : plans.filter(p => p.isActive).map(plan => (
              <div 
                key={plan.id}
                className={`pkg-plan-card-mini ${selectedPlanId === plan.id ? 'selected' : ''}`}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <div className="pkg-plan-card-mini-check">
                  <CheckCircle2 size={16} fill={selectedPlanId === plan.id ? 'var(--pp-blue)' : 'transparent'} stroke={selectedPlanId === plan.id ? 'white' : 'var(--pp-warm-5)'} />
                </div>
                <div className="pkg-plan-card-mini-info">
                  <div className="pkg-plan-card-mini-name">{plan.name}</div>
                  <div className="pkg-plan-card-mini-meta">
                    <Clock size={11} /> {plan.durationDays} Days Validity
                  </div>
                </div>
                <div className="pkg-plan-card-mini-price">₹{plan.price.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="pkg-form-group">
          <label className="pkg-form-label">Activation Policy</label>
          <div className="pkg-policy-toggle">
            <button 
              type="button" 
              className={startFrom === 'today' ? 'active' : ''} 
              onClick={() => { setStartFrom('today'); setStartDate(new Date().toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).split(',')[0]); }}
            >
              Start From Today
            </button>
            <button 
              type="button" 
              className={startFrom === 'expiry' ? 'active' : ''} 
              onClick={() => setStartFrom('expiry')}
            >
              After Current Expiry
            </button>
          </div>
        </div>

        <div className="pkg-form-row">
          <div className="pkg-form-group">
            <label className="pkg-form-label">Start Date</label>
            <div className="pkg-input-icon-wrapper">
              <Calendar size={14} className="pkg-input-icon" />
              <input 
                type="date" 
                className="pkg-form-input" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                disabled={startFrom === 'expiry'}
                required 
              />
            </div>
          </div>
          <div className="pkg-form-group">
            <label className="pkg-form-label">Calculated Expiry</label>
            <div className="pkg-computed-expiry-box">
              {selectedPlan ? (startFrom === 'expiry' ? 'Auto-extended' : (() => {
                const start = new Date(startDate);
                const expiry = new Date(start);
                expiry.setDate(expiry.getDate() + selectedPlan.durationDays);
                return expiry.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
              })()) : '—'}
            </div>
          </div>
        </div>

        <div className="pkg-form-group">
          <label className="pkg-form-label">Internal Remarks</label>
          <textarea 
            className="pkg-form-input pkg-textarea" 
            placeholder="Add any specific conditions or instructions..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {selectedPlan && (
          <div className="pkg-billing-notice animate-slide-up">
            <Info size={16} />
            <p>Assigning this package will automatically generate a bill for <strong>₹{selectedPlan.price.toLocaleString()}</strong>.</p>
          </div>
        )}

        <div className="pkg-drawer-footer">
          <button type="button" className="pp-btn pp-btn-secondary" onClick={onClose}>Cancel</button>
          <button 
            type="submit" 
            className="pp-btn pp-btn-primary" 
            disabled={!selectedPlanId || assignPackage.isPending}
          >
            {assignPackage.isPending ? 'Processing...' : 'Confirm Assignment'}
          </button>
        </div>
      </form>
    </Drawer>
  );
}
