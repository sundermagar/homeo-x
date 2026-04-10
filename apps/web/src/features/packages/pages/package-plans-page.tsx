import React, { useState } from 'react';
import {
  Package, Plus, Edit2, Trash2, X, CheckCircle2, Zap, DollarSign, Clock
} from 'lucide-react';
import {
  usePackagePlans, useCreatePackagePlan, useUpdatePackagePlan, useDeletePackagePlan, usePackageRevenueStats
} from '../hooks/use-packages';
import '../styles/packages.css';

const COLORS = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#E11D48', '#0891B2', '#EA580C', '#6366F1'];

function PlanFormModal({
  initial, onClose, onSave,
}: {
  initial?: any;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [form, setForm] = useState({
    name:         initial?.name         ?? '',
    description:  initial?.description  ?? '',
    price:        initial?.price        ?? '',
    durationDays: initial?.durationDays ?? 30,
    colorCode:    initial?.colorCode    ?? '#2563EB',
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e: React.FormEvent) => { e.preventDefault(); onSave(form); };

  return (
    <div className="pkg-modal-overlay" onClick={onClose}>
      <div className="pkg-modal" onClick={e => e.stopPropagation()}>
        <div className="pkg-modal-header">
          <h2 className="pkg-modal-title">{initial ? 'Edit Plan' : 'New Package Plan'}</h2>
          <button className="pkg-btn pkg-btn-ghost pkg-btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="pkg-modal-body">
            <div className="pkg-form-group">
              <label className="pkg-form-label">Plan Name *</label>
              <input className="pkg-form-input" placeholder="e.g. Monthly Bronze" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="pkg-form-group">
              <label className="pkg-form-label">Description</label>
              <input className="pkg-form-input" placeholder="Short description of the plan…" value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div className="pkg-form-row pkg-form-row-2">
              <div className="pkg-form-group">
                <label className="pkg-form-label">Price (₹) *</label>
                <input className="pkg-form-input" type="number" min="0" placeholder="e.g. 2500" value={form.price} onChange={e => set('price', Number(e.target.value))} required />
              </div>
              <div className="pkg-form-group">
                <label className="pkg-form-label">Duration (days) *</label>
                <input className="pkg-form-input" type="number" min="1" placeholder="e.g. 30" value={form.durationDays} onChange={e => set('durationDays', Number(e.target.value))} required />
              </div>
            </div>
            <div className="pkg-form-group">
              <label className="pkg-form-label">Color Tag</label>
              <div className="pkg-color-row">
                {COLORS.map(c => (
                  <button type="button" key={c} className={`pkg-color-swatch ${form.colorCode === c ? 'selected' : ''}`} style={{ background: c }} onClick={() => set('colorCode', c)} />
                ))}
              </div>
            </div>
          </div>
          <div className="pkg-modal-footer">
            <button type="button" className="pkg-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="pkg-btn pkg-btn-primary">
              <CheckCircle2 size={15} strokeWidth={1.6} /> {initial ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PackagePlansPage() {
  const { data: plans = [], isLoading } = usePackagePlans();
  const { data: stats } = usePackageRevenueStats();
  const createPlan = useCreatePackagePlan();
  const updatePlan = useUpdatePackagePlan();
  const deletePlan = useDeletePackagePlan();

  const [modal, setModal] = useState<null | 'create' | { plan: any }>(null);

  const handleSave = async (data: any) => {
    if (typeof modal === 'object' && modal?.plan) {
      await updatePlan.mutateAsync({ id: modal.plan.id, data });
    } else {
      await createPlan.mutateAsync(data);
    }
    setModal(null);
  };

  return (
    <div className="pkg-page">
      {/* Header */}
      <header className="pkg-header">
        <div>
          <h1 className="pkg-title">
            <Package size={20} strokeWidth={1.6} style={{ color: '#7C3AED' }} />
            Package Plans
          </h1>
          <p className="pkg-subtitle">Define membership blueprints · Assign to patients</p>
        </div>
        <button className="pkg-btn pkg-btn-primary" onClick={() => setModal('create')}>
          <Plus size={15} strokeWidth={1.6} /> New Package Plan
        </button>
      </header>

      {/* Stats */}
      <div className="pkg-stats">
        {[
          { label: 'Active Subscriptions', value: stats?.activeCount ?? 0,   color: '#059669', bg: '#F0FDF4', icon: <CheckCircle2 size={20} strokeWidth={1.6} /> },
          { label: 'Expired',              value: stats?.expiredCount ?? 0,  color: '#D97706', bg: '#FFFBEB', icon: <Clock size={20} strokeWidth={1.6} /> },
          { label: 'Total Revenue',        value: `₹${(stats?.totalRevenue ?? 0).toLocaleString()}`, color: '#7C3AED', bg: '#F5F3FF', icon: <DollarSign size={20} strokeWidth={1.6} /> },
        ].map(s => (
          <div key={s.label} className="pkg-stat-card">
            <div className="pkg-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <div className="pkg-stat-label">{s.label}</div>
              <div className="pkg-stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Plans Grid */}
      <div className="pkg-grid">
        {isLoading ? (
          <div className="pkg-empty" style={{ gridColumn: '1/-1' }}>
            <Zap size={28} className="pkg-empty-icon" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : plans.length === 0 ? (
          <div className="pkg-empty" style={{ gridColumn: '1/-1' }}>
            <Package size={32} className="pkg-empty-icon" />
            <p className="pkg-empty-text">No plans yet. Create your first membership package.</p>
          </div>
        ) : (
          plans.map(plan => (
            <div key={plan.id} className={`pkg-plan-card ${!plan.isActive ? 'inactive' : ''}`}>
              <div className="pkg-plan-accent" style={{ background: plan.colorCode }} />
              <div className="pkg-plan-body">
                <div className="pkg-plan-name">{plan.name}</div>
                <p className="pkg-plan-desc">{plan.description || 'No description provided.'}</p>
                <div className="pkg-plan-price">
                  ₹{plan.price.toLocaleString()}<span> / plan</span>
                </div>
                <div className="pkg-plan-duration">
                  <Clock size={11} strokeWidth={1.6} style={{ display:'inline', marginRight:4 }} />
                  {plan.durationDays} days
                </div>
              </div>
              <div className="pkg-plan-footer">
                <span className={`pkg-plan-badge ${plan.isActive ? 'active' : 'inactive'}`}>
                  {plan.isActive ? 'Active' : 'Inactive'}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="pkg-btn pkg-btn-ghost pkg-btn-sm" onClick={() => setModal({ plan })}>
                    <Edit2 size={13} strokeWidth={1.6} />
                  </button>
                  <button
                    className="pkg-btn pkg-btn-danger pkg-btn-sm"
                    onClick={() => { if (confirm(`Delete "${plan.name}"?`)) deletePlan.mutate(plan.id); }}
                  >
                    <Trash2 size={13} strokeWidth={1.6} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Add Card */}
        <div className="pkg-add-card" onClick={() => setModal('create')}>
          <Plus size={28} strokeWidth={1.5} />
          Add New Plan
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <PlanFormModal
          initial={typeof modal === 'object' ? modal.plan : undefined}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
