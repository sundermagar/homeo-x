import React, { useMemo, useState } from 'react';
import { Pill, Plus, X, RefreshCw, Trash2, Edit2, Info, Package, IndianRupee, Search, AlertCircle, CheckCircle2, History, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMedicines, useCreateMedicine, useUpdateMedicine, useDeleteMedicine, usePotencies } from '../hooks/use-settings';
import { Drawer } from '@/shared/components/drawer';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';

interface Medicine {
  id: number;
  name: string;
  disease?: string;
  potencyId?: number | null;
  type?: string | null;
  category?: string | null;
  price?: number | null;
  stockLevel?: number | null;
}

const EMPTY_FORM = {
  name: '',
  disease: '',
  potencyId: '',
  type: '',
  category: '',
  price: 0,
  stockLevel: 0
};

export default function MedicinesPage() {
  const { data: medicines = [], isLoading } = useMedicines();
  const { data: potencies = [] } = usePotencies();

  const createMed = useCreateMedicine();
  const updateMed = useUpdateMedicine();
  const deleteMed = useDeleteMedicine();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => medicines.filter((m: Medicine) =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.disease?.toLowerCase().includes(search.toLowerCase()) ||
    m.category?.toLowerCase().includes(search.toLowerCase())
  ), [medicines, search]);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(filtered);

  const lowStockCount = useMemo(() => medicines.filter((m: Medicine) => (m.stockLevel || 0) > 0 && (m.stockLevel || 0) < 10).length, [medicines]);
  const outOfStockCount = useMemo(() => medicines.filter((m: Medicine) => (m.stockLevel || 0) === 0).length, [medicines]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (med: Medicine) => {
    setEditingId(med.id);
    setForm({
      name: med.name,
      disease: med.disease || '',
      potencyId: med.potencyId?.toString() || '',
      type: med.type || '',
      category: med.category || '',
      price: med.price || 0,
      stockLevel: med.stockLevel || 0
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        potencyId: form.potencyId ? parseInt(form.potencyId) : null,
        price: Number(form.price) || 0,
        stockLevel: Number(form.stockLevel) || 0
      };

      if (editingId) {
        await updateMed.mutateAsync({ id: editingId, ...payload });
      } else {
        await createMed.mutateAsync(payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('[MedicineForm] Submission Error', err);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Permanently remove "${name}"? This will affect prescription history.`)) return;
    await deleteMed.mutateAsync(id);
  };

  return (
    <div className="plat-page fade-in">


      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Pill size={20} className="color-primary" />
            Clinical Medicine Catalog
          </h1>
          <p className="plat-header-sub">Manage inventory thresholds, pricing tiers, and disease indications.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} /> Add Medicine
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <p className="plat-stat-label">Total Catalog</p>
          <p className="plat-stat-value plat-stat-value-primary">{medicines.length}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Low Stock Alerts</p>
          <p className={`plat-stat-value ${lowStockCount > 0 ? 'plat-stat-value-warning' : ''}`}>
            {lowStockCount}
          </p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Depleted Stock</p>
          <p className={`plat-stat-value ${outOfStockCount > 0 ? 'plat-stat-value-danger' : ''}`}>
            {outOfStockCount}
          </p>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={14} className="plat-search-icon" />
          <input
            className="plat-form-input plat-search-input"
            placeholder="Search by name, disease indication, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : filtered.length === 0 ? (
          <div className="plat-empty" style={{ minHeight: 200 }}>
            <Pill size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No medicines found matching your search.</p>
          </div>
        ) : (
          <>
          <div className="pp-card pp-table-scroll" style={{ padding: 0, overflow: 'visible' }}>
            <table className="pp-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Remedy & Indication</th>
                  <th style={{ width: '240px' }}>Categorization</th>
                  <th style={{ width: '160px' }}>Stock Status</th>
                  <th style={{ width: '120px' }}>Unit Price</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((med: Medicine, idx: number) => {
                  const potencyName = potencies.find((p: any) => p.id === Number(med.potencyId))?.name || '—';
                  const stock = med.stockLevel || 0;
                  const isOutOfStock = stock === 0;
                  const isLowStock = stock > 0 && stock < 10;

                  return (
                    <tr key={med.id} className="plat-table-row">
                      <td data-label="#" className="plat-table-cell color-muted font-mono text-xs">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                      <td data-label="REMEDY" className="plat-table-cell">
                        <div className="font-bold text-[14px]">{med.name}</div>
                        <div className="text-[11px] color-muted mt-0.5 flex items-center gap-1 italic">
                          <Info size={10} className="opacity-60" /> {med.disease || 'General Medical Remedy'}
                        </div>
                      </td>
                      <td data-label="CATEGORIES" className="plat-table-cell">
                        <div className="flex flex-wrap gap-1.5 md:justify-start justify-end">
                          {med.category && <span className="plat-badge plat-badge-primary text-[9px]">{med.category}</span>}
                          {med.type && <span className="plat-badge plat-badge-default text-[9px]">{med.type}</span>}
                          <span className="plat-badge bg-faded text-[9px] border border-main color-muted italic">{potencyName}</span>
                        </div>
                      </td>
                      <td data-label="STOCK" className="plat-table-cell">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold md:justify-start justify-end">
                          <Package size={12} className="color-muted" />
                          <span className={isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-500' : 'text-emerald-600'}>
                            {stock} Units
                          </span>
                        </div>
                        <div className="mt-1 flex md:justify-start justify-end">
                          {isOutOfStock ? (
                            <span className="text-[8px] font-black text-red-700 uppercase bg-red-50 px-1 border border-red-200 rounded">Depleted</span>
                          ) : isLowStock ? (
                            <span className="text-[8px] font-black text-orange-700 uppercase bg-orange-50 px-1 border border-orange-200 rounded">Critically Low</span>
                          ) : (
                            <span className="text-[8px] font-black text-emerald-700 uppercase bg-emerald-50 px-1 border border-orange-200 rounded">In Stock</span>
                          )}
                        </div>
                      </td>
                      <td data-label="PRICE" className="plat-table-cell">
                        <div className="flex items-center gap-1 font-mono font-bold text-primary md:justify-start justify-end">
                          <IndianRupee size={11} /> {med.price || '0.00'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="mc-table-actions">
                          {/* Desktop View Actions */}
                          <div className="mc-desktop-actions">
                            <button className="mc-action-btn" onClick={() => handleOpenEdit(med)} title="Edit"><Edit2 size={13} /></button>
                            <button className="mc-action-btn danger" onClick={() => handleDelete(med.id, med.name)} title="Remove"><Trash2 size={13} /></button>
                          </div>

                          {/* Mobile 3-Dots Menu */}
                          <div className="mc-mobile-actions">
                            <button className="mc-dots-btn"><MoreHorizontal size={18} /></button>
                            <div className="mc-dots-dropdown">
                              <button onClick={() => handleOpenEdit(med)}><Edit2 size={14} /> Edit</button>
                              <button onClick={() => handleDelete(med.id, med.name)} style={{ color: '#dc2626' }}><Trash2 size={14} /> Remove</button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
        title={editingId ? 'Update Medicine Catalog' : 'Register New Remedy'}
        maxWidth="500px"
      >
        <form onSubmit={handleSubmit}>
          <div className="plat-modal-body" style={{ padding: 0 }}>
            <div className="plat-form-section" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
              <div className="plat-form-grid-multi" style={{ gridTemplateColumns: '1fr' }}>
                <div className="plat-form-group">
                  <label className="plat-form-label">Remedy Name *</label>
                  <input
                    className="plat-form-input"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Aconite Napellus"
                  />
                </div>

                <div className="plat-form-group">
                  <label className="plat-form-label">Primary Indication (Disease)</label>
                  <input
                    className="plat-form-input"
                    value={form.disease}
                    onChange={e => setForm(f => ({ ...f, disease: e.target.value }))}
                    placeholder="e.g. Fever, Anxiety, Acute Pain..."
                  />
                </div>
              </div>

              <div className="plat-form-grid-multi mt-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <div className="plat-form-group">
                  <label className="plat-form-label">Potency</label>
                  <select
                    className="plat-form-input"
                    value={form.potencyId}
                    onChange={e => setForm(f => ({ ...f, potencyId: e.target.value }))}
                  >
                    <option value="">Select Potency</option>
                    {potencies.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Form/Type</label>
                  <input
                    className="plat-form-input"
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    placeholder="e.g. Globules"
                  />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Category</label>
                  <select
                    className="plat-form-input"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    <option value="">Select Category</option>
                    <option value="Dilution">Dilution</option>
                    <option value="Trituration">Trituration</option>
                    <option value="Bio-Chemic">Bio-Chemic</option>
                    <option value="Generic">Generic</option>
                    <option value="Speciality">Speciality</option>
                  </select>
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Unit Price (₹)</label>
                  <div className="plat-input-wrapper">
                    <IndianRupee size={14} className="plat-input-icon" />
                    <input
                      type="number"
                      className="plat-form-input"
                      value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              </div>

              <div className="plat-form-group mt-4">
                <label className="plat-form-label">Opening Stock Tier</label>
                <div className="plat-input-wrapper">
                  <Package size={14} className="plat-input-icon" />
                  <input
                    type="number"
                    className="plat-form-input"
                    value={form.stockLevel}
                    onChange={e => setForm(f => ({ ...f, stockLevel: Number(e.target.value) }))}
                  />
                </div>
                <p className="text-[10px] color-muted mt-2">Adjustments are captured in the stock audit trail.</p>
              </div>
            </div>
          </div>

          <div className="plat-modal-footer" style={{ padding: '24px 0 0 0', marginTop: '24px' }}>
            <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Discard</button>
            <button type="submit" className="plat-btn plat-btn-primary" disabled={createMed.isPending || updateMed.isPending}>
              {editingId ? 'Save Changes' : 'Register Medicine'}
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
