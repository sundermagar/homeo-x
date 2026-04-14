import React, { useState } from 'react';
import { Package, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2, Calendar, IndianRupee, Search } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = plans.filter((p: any) => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
    console.log('[PackagePlanForm] Submit', { editingId, form });
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
            <Package size={20} className="color-primary" />
            Treatment Packages
          </h1>
          <p className="plat-header-sub">Manage standard visit/care bundles and membership plans.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} />
            Create Package
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <span className="plat-stat-label">Total Plans</span>
          <span className="plat-stat-value">{plans.length}</span>
        </div>
        <div className="plat-stat-card">
          <span className="plat-stat-label">Active Bundles</span>
          <span className="plat-stat-value plat-stat-value-success">
            {plans.filter((p: any) => p.isActive).length}
          </span>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={16} className="plat-search-icon" />
          <input 
            className="plat-filter-input plat-search-input"
            placeholder="Search packages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty">
            <RefreshCw size={22} className="animate-spin opacity-30" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="plat-empty">
            <Package size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No package plans found.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Theme</th>
                  <th>Package Name</th>
                  <th>Pricing</th>
                  <th>Duration</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((plan: any) => (
                  <tr key={plan.id} className="plat-table-row">
                    <td data-label="Theme" className="plat-table-cell">
                      <div style={{ backgroundColor: plan.colorCode, width: '32px', height: '10px', borderRadius: '4px', opacity: 0.8 }}></div>
                    </td>
                    <td data-label="Package" className="plat-table-cell">
                      <div className="font-semibold">{plan.name}</div>
                      <div className="text-xs color-muted line-clamp-1">{plan.description || 'No description'}</div>
                    </td>
                    <td data-label="Price" className="plat-table-cell font-mono font-bold">
                      <div className="flex items-center gap-1">
                        <IndianRupee size={12} className="color-primary" />
                        {plan.price}
                      </div>
                    </td>
                    <td data-label="Duration" className="plat-table-cell">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} className="color-muted" />
                        {plan.durationDays} Days
                      </div>
                    </td>
                    <td data-label="Status" className="plat-table-cell">
                       <span className={`plat-badge ${plan.isActive ? 'plat-badge-staff' : 'plat-badge-default'}`}>
                         {plan.isActive ? 'Active' : 'Inactive'}
                       </span>
                    </td>
                    <td className="plat-table-cell">
                      <div className="flex justify-end gap-2">
                        <button className="plat-btn plat-btn-icon" onClick={() => handleOpenEdit(plan)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="plat-btn plat-btn-icon plat-btn-danger" onClick={() => handleDelete(plan.id, plan.name)}>
                          <Trash2 size={14} />
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
            <form onSubmit={handleSubmit} className="plat-modal-form">
              <div className="plat-modal-body">
                <div className="plat-form">
                  <div className="plat-form-group plat-form-full">
                    <label className="plat-form-label">Package Name *</label>
                    <input 
                      className="plat-form-input" 
                      value={form.name} 
                      onChange={e => setForm(f => ({...f, name: e.target.value}))}
                      required 
                      placeholder="e.g. 1 Month Treatment, Annual Gold Plan"
                    />
                  </div>
                  <div className="plat-form-group">
                    <label className="plat-form-label">Price (₹) *</label>
                    <div className="plat-input-wrapper">
                      <IndianRupee size={16} className="plat-input-icon" />
                      <input 
                        type="number"
                        className="plat-form-input" 
                        value={form.price} 
                        onChange={e => setForm(f => ({...f, price: Number(e.target.value)}))}
                        required 
                      />
                    </div>
                  </div>
                  <div className="plat-form-group">
                    <label className="plat-form-label">Duration (Days) *</label>
                    <div className="plat-input-wrapper">
                      <Calendar size={16} className="plat-input-icon" />
                      <input 
                        type="number"
                        className="plat-form-input" 
                        value={form.durationDays} 
                        onChange={e => setForm(f => ({...f, durationDays: Number(e.target.value)}))}
                        required 
                      />
                    </div>
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
                  <div className="plat-form-group plat-form-row">
                     <input 
                        type="checkbox" 
                        className="plat-form-input"
                        id="is_active"
                        checked={form.isActive} 
                        onChange={e => setForm(f => ({...f, isActive: e.target.checked}))}
                     />
                     <label htmlFor="is_active" className="plat-form-label mb-0 cursor-pointer">Plan is Active</label>
                  </div>
                  <div className="plat-form-group plat-form-full">
                    <label className="plat-form-label">Package Description</label>
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
                  {editingId ? 'Update Package' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
