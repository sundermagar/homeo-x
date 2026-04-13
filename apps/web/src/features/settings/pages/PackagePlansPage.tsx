import React, { useState } from 'react';
import { Package, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2, Calendar, IndianRupee } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePackagePlans, useCreatePackagePlan, useUpdatePackagePlan, useDeletePackagePlan } from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

const EMPTY_FORM = { name: '', description: '', price: 0, durationDays: 30, colorCode: '#2563EB', isActive: true };

export default function PackagePlansPage() {
  const { data: plans = [], isLoading } = usePackagePlans();
  const createPlan = useCreatePackagePlan();
  const updatePlan = useUpdatePackagePlan();
  const deletePlan = useDeletePackagePlan();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: any) => {
    setEditingId(plan.id);
    setForm({ 
      name: plan.name, 
      description: plan.description || '', 
      price: Number(plan.price),
      durationDays: Number(plan.durationDays),
      colorCode: plan.colorCode || '#2563EB',
      isActive: plan.isActive ?? true 
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updatePlan.mutateAsync({ id: editingId, ...form });
    } else {
      await createPlan.mutateAsync(form);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete package plan "${name}"?`)) return;
    await deletePlan.mutateAsync(id);
  };

  return (
    <div className="plat-page fade-in">
      <Link to="/settings" className="settings-back-link">
        <ArrowLeft size={14} />
        Back to Settings
      </Link>

      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Package size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Treatment Packages
          </h1>
          <p className="plat-header-sub">Manage standard visit/care bundles and membership plans.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} strokeWidth={1.6} />
            Create Package
          </button>
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty">
            <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
          </div>
        ) : plans.length === 0 ? (
          <div className="plat-empty">
            <Package size={28} className="plat-empty-icon" />
            <p className="plat-empty-text">No package plans defined.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="plat-table">
              <thead>
                <tr>
                   <th style={{ width: '80px' }}>Color</th>
                  <th>Package Name</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan: any) => (
                  <tr key={plan.id}>
                    <td>
                      <div style={{ backgroundColor: plan.colorCode, width: '40px', height: '12px', borderRadius: '4px', opacity: 0.8 }}></div>
                    </td>
                    <td className="font-semibold">{plan.name}</td>
                    <td>
                      <div className="flex items-center gap-1 font-mono">
                        <IndianRupee size={12} className="color-primary" />
                        {plan.price}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="color-muted" />
                        {plan.durationDays} Days
                      </div>
                    </td>
                    <td>
                       <span className={`plat-badge ${plan.isActive ? 'plat-badge-staff' : 'plat-badge-default'}`}>
                         {plan.isActive ? 'Active' : 'Inactive'}
                       </span>
                    </td>
                    <td>
                      <div className="flex gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(plan)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(plan.id, plan.name)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="plat-modal-overlay fade-in" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="plat-modal" style={{ maxWidth: '500px' }}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">{editingId ? 'Edit Package Plan' : 'Create Package Plan'}</h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="plat-modal-body plat-form">
              <div className="grid grid-cols-2 gap-4">
                <div className="plat-form-group col-span-2">
                  <label className="plat-form-label">Package Name <span className="plat-form-required">*</span></label>
                  <input 
                    className="plat-form-input" 
                    value={form.name} 
                    onChange={e => setForm(f => ({...f, name: e.target.value}))}
                    required 
                    placeholder="e.g. 1 Month Treatment, Annual Gold Plan"
                  />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Price (₹) <span className="plat-form-required">*</span></label>
                  <input 
                    type="number"
                    className="plat-form-input" 
                    value={form.price} 
                    onChange={e => setForm(f => ({...f, price: Number(e.target.value)}))}
                    required 
                  />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Duration (Days) <span className="plat-form-required">*</span></label>
                  <input 
                    type="number"
                    className="plat-form-input" 
                    value={form.durationDays} 
                    onChange={e => setForm(f => ({...f, durationDays: Number(e.target.value)}))}
                    required 
                  />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Theme Color</label>
                  <input 
                    type="color"
                    className="plat-form-input" 
                    style={{ height: '42px', padding: '4px' }}
                    value={form.colorCode} 
                    onChange={e => setForm(f => ({...f, colorCode: e.target.value}))}
                  />
                </div>
                <div className="plat-form-group flex items-end pb-1 plat-form-row">
                   <input 
                      type="checkbox" 
                      className="plat-form-input"
                      id="is_active"
                      checked={form.isActive} 
                      onChange={e => setForm(f => ({...f, isActive: e.target.checked}))}
                   />
                   <label htmlFor="is_active" className="plat-form-label mb-0 cursor-pointer">Active Plan</label>
                </div>
                <div className="plat-form-group col-span-2">
                  <label className="plat-form-label">Description</label>
                  <textarea 
                    className="plat-form-input" 
                    style={{ minHeight: '80px' }}
                    value={form.description} 
                    onChange={e => setForm(f => ({...f, description: e.target.value}))}
                    placeholder="Optional details about this plan..."
                  />
                </div>
              </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createPlan.isPending || updatePlan.isPending}>
                  {editingId ? 'Save Changes' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
