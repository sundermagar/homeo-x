import React, { useState } from 'react';
import {
  Package, Plus, Edit2, Trash2, X, CheckCircle2, Zap, DollarSign, Clock
} from 'lucide-react';
import {
  usePackagePlans, useCreatePackagePlan, useUpdatePackagePlan, useDeletePackagePlan, usePackageRevenueStats
} from '../hooks/use-packages';
import { Drawer } from '@/shared/components/drawer';
import { Pagination } from '@/components/shared/pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import { AssignPackageModal } from '../components/assign-package-modal';
import { EmptyState } from '@/components/shared/empty-state';
import '../styles/packages.css';

const COLORS = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#E11D48', '#0891B2', '#EA580C', '#6366F1'];

function PlanDrawer({
  initial, onClose, onSave, isOpen
}: {
  initial?: any;
  onClose: () => void;
  onSave: (data: any) => void;
  isOpen: boolean;
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
    <Drawer 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initial ? 'Edit Plan' : 'New Package Plan'}
      maxWidth="540px"
    >
      <div className="pkg-form-group">
        <label className="pkg-form-label">Plan Name *</label>
        <input className="pkg-form-input" placeholder="e.g. Monthly Bronze" value={form.name} onChange={e => set('name', e.target.value)} required />
      </div>
      <div className="pkg-form-group">
        <label className="pkg-form-label">Description</label>
        <textarea className="pkg-form-input" style={{ minHeight: '80px', resize: 'vertical' }}
          placeholder="Short description of the plan…" value={form.description} onChange={e => set('description', e.target.value)} />
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
      <div className="pkg-form-group" style={{ marginTop: '16px' }}>
        <label className="pkg-form-label">Color Tag</label>
        <div className="pkg-color-row">
          {COLORS.map(c => (
            <button type="button" key={c} className={`pkg-color-swatch ${form.colorCode === c ? 'selected' : ''}`} style={{ background: c }} onClick={() => set('colorCode', c)} />
          ))}
        </div>
      </div>
      <div className="plat-modal-footer" style={{ padding: '24px 0 0 0', marginTop: '24px', borderTop: '1px solid var(--pp-warm-4)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button type="button" className="pp-btn pp-btn-secondary" onClick={onClose}>Cancel</button>
        <button className="pp-btn pp-btn-primary" onClick={submit}>
          <CheckCircle2 size={15} strokeWidth={1.6} /> {initial ? 'Save Changes' : 'Create Plan'}
        </button>
      </div>
    </Drawer>
  );
}

function PlanSkeleton() {
  return (
    <div className="pkg-plan-card">
      <div className="pp-skeleton" style={{ height: '5px', width: '100%' }} />
      <div className="pkg-plan-body">
        <div className="pp-skeleton pp-skeleton-title" style={{ width: '60%' }} />
        <div className="pp-skeleton pp-skeleton-text" style={{ height: '32px' }} />
        <div className="pp-skeleton pp-skeleton-text" style={{ width: '40%', height: '24px', marginTop: '12px' }} />
      </div>
      <div className="pkg-plan-footer">
        <div className="pp-skeleton" style={{ width: '60px', height: '20px', borderRadius: '20px' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="pp-skeleton" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
          <div className="pp-skeleton" style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
        </div>
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
  const [assignPlan, setAssignPlan] = useState<any | null>(null);
  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(plans, 10);

  const handleSave = async (data: any) => {
    if (typeof modal === 'object' && modal?.plan) {
      await updatePlan.mutateAsync({ id: modal.plan.id, data });
    } else {
      await createPlan.mutateAsync(data);
    }
    setModal(null);
  };

  return (
    <div className="pp-page-container pkg-page animate-fade-in">
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
          { label: 'Active Subscriptions', value: stats?.activeCount ?? 0,   color: 'var(--pp-success-fg)', bg: 'var(--pp-success-bg)', icon: <CheckCircle2 size={18} strokeWidth={2.5} /> },
          { label: 'Expired',              value: stats?.expiredCount ?? 0,  color: 'var(--pp-warning-fg)', bg: 'var(--pp-warning-bg)', icon: <Clock size={18} strokeWidth={2.5} /> },
          { label: 'Total Revenue',        value: `₹${(stats?.totalRevenue ?? 0).toLocaleString()}`, color: 'var(--pp-blue)', bg: 'var(--pp-blue-tint)', icon: <DollarSign size={18} strokeWidth={2.5} /> },
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
          [1, 2, 3].map(i => <PlanSkeleton key={i} />)
        ) : plans.length === 0 ? (
          <EmptyState 
            icon={Package}
            title="No membership plans"
            description="You haven't defined any membership blueprints yet. Create your first plan to start assigning packages to patients."
            actionLabel="Create Plan"
            onAction={() => setModal('create')}
            variant="card"
            className="my-8"
            style={{ gridColumn: '1/-1' }}
          />
        ) : (
          paginatedData.map(plan => (
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
                  <button
                    className="pkg-btn pkg-btn-primary pkg-btn-sm"
                    onClick={() => setAssignPlan(plan)}
                    title="Assign to Patient"
                    style={{ marginLeft: '4px', background: 'var(--pp-blue)', borderColor: 'var(--pp-blue)' }}
                  >
                    <Zap size={13} strokeWidth={1.6} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Add Card */}
        {!isLoading && (
          <div className="pkg-add-card" onClick={() => setModal('create')}>
            <Plus size={28} strokeWidth={1.5} />
            Add New Plan
          </div>
        )}
      </div>

      {!isLoading && totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalItems / itemsPerPage)}
          pageSize={itemsPerPage}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={setItemsPerPage}
        />
      )}

      {/* Modal */}
      <PlanDrawer
        isOpen={!!modal}
        initial={(modal && typeof modal === 'object') ? modal.plan : undefined}
        onClose={() => setModal(null)}
        onSave={handleSave}
      />

      {assignPlan && (
        <AssignPackageModal
          isOpen={!!assignPlan}
          onClose={() => setAssignPlan(null)}
          preselectedPlanId={assignPlan.id}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
