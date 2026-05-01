import React, { useState } from 'react';
import { Package, Plus, X, RefreshCw, Trash2, Edit2, Calendar, IndianRupee, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePackagePlans, useCreatePackagePlan, useUpdatePackagePlan, useDeletePackagePlan } from '../hooks/use-settings';
import { Drawer } from '@/shared/components/drawer';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';

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

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(filteredItems);

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
          <p className="plat-stat-label">Total Plans</p>
          <p className="plat-stat-value plat-stat-value-primary">{plans.length}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Active Bundles</p>
          <p className="plat-stat-value plat-stat-value-success">
            {plans.filter((p: any) => p.isActive).length}
          </p>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={14} className="plat-search-icon" />
          <input
            className="plat-form-input plat-search-input"
            placeholder="Search packages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : filteredItems.length === 0 ? (
          <div className="plat-empty">
            <Package size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No package plans found.</p>
          </div>
        ) : (
          <>
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
                {paginatedData.map((plan: any) => (
                  <tr key={plan.id} className="plat-table-row">
                    <td data-label="Theme" className="plat-table-cell">
                      <div className="flex md:justify-start justify-end">
                        <div style={{ backgroundColor: plan.colorCode, width: '32px', height: '10px', borderRadius: '4px', opacity: 0.8 }}></div>
                      </div>
                    </td>
                    <td data-label="Package" className="plat-table-cell">
                      <div className="font-semibold text-right md:text-left">{plan.name}</div>
                      <div className="text-xs color-muted line-clamp-1 text-right md:text-left">{plan.description || 'No description'}</div>
                    </td>
                    <td data-label="Price" className="plat-table-cell font-mono font-bold">
                      <div className="flex items-center gap-1 md:justify-start justify-end">
                        <IndianRupee size={12} className="color-primary" />
                        {plan.price}
                      </div>
                    </td>
                    <td data-label="Duration" className="plat-table-cell">
                      <div className="flex items-center gap-1 md:justify-start justify-end">
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
          <Pagination
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onLimitChange={setItemsPerPage}
          />
          </>
        )}
      </div>

      <Drawer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Package Plan' : 'Create Package Plan'}
        maxWidth="600px"
      >
        <form onSubmit={handleSubmit}>
          <div className="plat-modal-body" style={{ padding: 0 }}>
            <div className="plat-form-section" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
              <div className="plat-form-grid-multi" style={{ gridTemplateColumns: '1fr' }}>
                <div className="plat-form-group">
                  <label className="plat-form-label">Package Name *</label>
                  <input
                    className="plat-form-input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    placeholder="e.g. 1 Month Treatment, Annual Gold Plan"
                  />
                </div>
              </div>

              <div className="plat-form-grid-multi mt-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="plat-form-group">
                  <label className="plat-form-label">Price (₹) *</label>
                  <div className="plat-input-wrapper">
                    <IndianRupee size={16} className="plat-input-icon" />
                    <input
                      type="number"
                      className="plat-form-input"
                      value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
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
                      onChange={e => setForm(f => ({ ...f, durationDays: Number(e.target.value) }))}
                      required
                    />
                  </div>
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Theme Color</label>
                  <input
                    type="color"
                    className="plat-form-input p-1"
                    style={{ height: '42px' }}
                    value={form.colorCode}
                    onChange={e => setForm(f => ({ ...f, colorCode: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-2 pt-8">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary"
                    id="is_active_plan"
                    checked={form.isActive}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  />
                  <label htmlFor="is_active_plan" className="plat-form-label mb-0 cursor-pointer">Plan is Active</label>
                </div>
              </div>

              <div className="plat-form-group mt-4">
                <label className="plat-form-label">Package Description</label>
                <textarea
                  className="plat-form-input"
                  style={{ minHeight: '120px' }}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional details about this plan..."
                />
              </div>
            </div>
          </div>
          <div className="plat-modal-footer" style={{ padding: '24px 0 0 0', marginTop: '24px' }}>
            <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="plat-btn plat-btn-primary" disabled={createPlan.isPending || updatePlan.isPending}>
              {editingId ? 'Update Package' : 'Create Package'}
            </button>
          </div>
        </form>
      </Drawer>
      <style>{`
        @media (max-width: 1024px) {
          .plat-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
          .plat-header-actions { width: 100%; }
          .plat-header-actions .plat-btn { width: 100%; height: 44px; border-radius: 12px; justify-content: center; }
          
          .plat-stats-bar { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
          .plat-stat-card { padding: 12px !important; }
          .plat-stat-value { font-size: 18px !important; }
          
          .plat-filters { flex-direction: column; align-items: stretch; gap: 12px; }
          .plat-search-wrap { width: 100% !important; }
          .plat-search-input { width: 100% !important; height: 44px !important; border-radius: 12px !important; }
          
          .plat-card { border: none !important; box-shadow: none !important; background: transparent !important; padding: 0 !important; }
          .plat-table-container { border: none !important; background: transparent !important; overflow: visible !important; }
          .plat-table { display: block !important; width: 100% !important; }
          .plat-table thead { display: none !important; }
          .plat-table tbody { display: block !important; width: 100% !important; }
          .plat-table tr { 
            display: block !important; 
            margin-bottom: 20px !important; 
            background: var(--bg-card) !important; 
            border: 1px solid var(--border-main) !important; 
            border-radius: 16px !important; 
            padding: 8px 0 !important;
            box-shadow: var(--pp-shadow-sm) !important;
          }
          .plat-table td {
            display: grid !important;
            grid-template-columns: 110px 1fr !important;
            gap: 12px !important;
            align-items: center !important;
            padding: 12px 20px !important;
            border-bottom: 1px dashed var(--border-main) !important;
            min-height: 48px;
            text-align: right !important;
            width: 100% !important;
          }
          .plat-table td:last-child { border-bottom: none !important; background: var(--bg-surface-2) !important; padding-top: 16px !important; padding-bottom: 16px !important; border-bottom-left-radius: 15px; border-bottom-right-radius: 15px; }
          .plat-table td::before {
            content: attr(data-label);
            font-size: 10px !important;
            font-weight: 800 !important;
            color: var(--text-muted) !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
            text-align: left !important;
          }
        }
      `}</style>
    </div>
  );
}
