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
import { EmptyState } from '@/components/shared/empty-state';
import { CodeAutocomplete } from '@/shared/components/code-autocomplete';
import type { SnomedConceptResult } from '@/shared/hooks/use-terminology';

interface Medicine {
  id: number;
  name: string;
  disease?: string;
  potencyId?: number | null;
  type?: string | null;
  category?: string | null;
  price?: number | null;
  stockLevel?: number | null;
  snomedCodeId?: number | null;
  snomedLabel?: string | null;
}

const EMPTY_FORM = {
  name: '',
  disease: '',
  potencyId: '',
  type: '',
  category: '',
  price: 0,
  stockLevel: 0,
  snomedCodeId: null as number | null,
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
    m.category?.toLowerCase().includes(search.toLowerCase()) ||
    m.snomedLabel?.toLowerCase().includes(search.toLowerCase())
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
      stockLevel: med.stockLevel || 0,
      snomedCodeId: med.snomedCodeId || null,
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
    <div className="pp-page-container animate-fade-in">

      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            <Pill size={22} strokeWidth={1.8} />
            Clinical Medicine Catalog
          </h1>
          <p className="pp-page-hero-sub">Manage clinical inventory, pricing strategies, and standardized disease indications.</p>
        </div>
        <div className="pp-page-hero-actions">
          <button className="btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} strokeWidth={1.6} /> Add Medicine
          </button>
        </div>
      </div>

      <div className="pp-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="appt-stat-card">
          <div className="appt-stat-icon-wrap" style={{ background: 'var(--pp-blue-tint)', color: 'var(--pp-blue)' }}><Package size={18} /></div>
          <div>
            <div className="appt-stat-label">Total Catalog</div>
            <div className="appt-stat-value">{medicines.length}</div>
          </div>
        </div>
        <div className="appt-stat-card">
          <div className="appt-stat-icon-wrap" style={{ background: 'var(--pp-warning-bg)', color: 'var(--pp-warning-fg)' }}><AlertCircle size={18} /></div>
          <div>
            <div className="appt-stat-label">Low Stock Alerts</div>
            <div className="appt-stat-value">{lowStockCount}</div>
          </div>
        </div>
        <div className="appt-stat-card">
          <div className="appt-stat-icon-wrap" style={{ background: 'var(--pp-danger-bg)', color: 'var(--pp-danger-fg)' }}><Trash2 size={18} /></div>
          <div>
            <div className="appt-stat-label">Depleted Stock</div>
            <div className="appt-stat-value">{outOfStockCount}</div>
          </div>
        </div>
      </div>

      <div className="pp-filter-card" style={{ marginBottom: '24px' }}>
        <div className="pp-filter-search-wrap">
          <Search size={14} strokeWidth={1.6} />
          <input
            className="pp-filter-search-input"
            placeholder="Search by name, disease indication, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="btn-secondary">Reset</button>
        )}
      </div>

      <div className="appt-card">
        {isLoading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState 
            icon={Pill}
            title={search ? "No medicine matches your search" : "Medicine catalog is empty"}
            description={search ? `No remedies matching "${search}" were found in your dispensary.` : "Start building your clinical pharmacy by adding your first medicine."}
            actionLabel={search ? "Clear Search" : "Register Remedy"}
            onAction={search ? () => setSearch('') : handleOpenCreate}
            variant="card"
            className="my-8"
          />
        ) : (
          <>
          <div className="pp-table-scroll">
            <table className="pp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Remedy &amp; Indication</th>
                  <th>Categorization</th>
                  <th>Stock Status</th>
                  <th>Unit Price</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((med: Medicine, idx: number) => {
                  const potencyName = potencies.find((p: any) => p.id === Number(med.potencyId))?.name || '—';
                  const stock = med.stockLevel || 0;
                  const isOutOfStock = stock === 0;
                  const isLowStock = stock > 0 && stock < 10;

                  return (
                    <tr key={med.id}>
                      <td data-label="#"><span className="appt-cell-id">{(currentPage - 1) * itemsPerPage + idx + 1}</span></td>
                      <td data-label="Remedy & Indication">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="pat-avatar pat-avatar--sm">
                            {med.name?.[0]?.toUpperCase() || 'M'}
                          </div>
                          <div>
                            <div className="appt-cell-name">{med.name}</div>
                            <div className="appt-cell-phone flex items-center gap-1.5 font-medium">
                              <Info size={10} className="opacity-50" /> {med.disease || 'General Medical Remedy'}
                            </div>
                            {med.snomedLabel && (
                              <div className="med-snomed-tag">
                                {med.snomedLabel}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td data-label="Categorization">
                        <div className="flex flex-wrap gap-1">
                          {med.category && <span className="appt-badge appt-badge-confirmed">{med.category}</span>}
                          {med.type && <span className="appt-badge appt-badge-consultation">{med.type}</span>}
                          <span className="appt-badge appt-badge-absent">{potencyName}</span>
                        </div>
                      </td>
                      <td data-label="Stock Status">
                        <div className={`med-stock-wrap ${isOutOfStock ? 'depleted' : isLowStock ? 'low' : 'ok'}`} style={{ fontSize: '12px' }}>
                          <Package size={12} strokeWidth={1.6} />
                          <span>{stock} Units</span>
                        </div>
                        <div className="mt-1">
                          {isOutOfStock ? (
                            <span className="appt-badge appt-badge-cancelled">Depleted</span>
                          ) : isLowStock ? (
                            <span className="appt-badge appt-badge-pending">Low Inventory</span>
                          ) : (
                            <span className="appt-badge appt-badge-done">Optimal</span>
                          )}
                        </div>
                      </td>
                      <td data-label="Unit Price">
                        <div className="med-price-tag" style={{ fontSize: '13px' }}>
                          <IndianRupee size={11} strokeWidth={2} /> {med.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                        </div>
                      </td>
                      <td data-label="Action">
                        <div className="flex gap-2">
                          <button className="btn-ghost" onClick={() => handleOpenEdit(med)} title="Edit Medicine" style={{ padding: '6px' }}>
                            <Edit2 size={14} strokeWidth={1.6} />
                          </button>
                          <button className="btn-ghost" onClick={() => handleDelete(med.id, med.name)} title="Remove from Catalog" style={{ padding: '6px', color: 'var(--pp-danger-fg)' }}>
                            <Trash2 size={14} strokeWidth={1.6} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '20px' }}>
            <Pagination
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onLimitChange={setItemsPerPage}
            />
          </div>
          </>
        )}
      </div>
      
      <Drawer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Update Medicine Catalog' : 'Register New Remedy'}
        maxWidth="520px"
      >
        <form onSubmit={handleSubmit} className="med-drawer-form">
          <div className="plat-modal-body" style={{ padding: '4px' }}>
            <div className="med-form-card">
              <div className="med-form-group">
                <label className="med-label">Clinical Remedy Name <span className="required-dot"></span></label>
                <div className="med-input-wrap">
                  <Pill size={16} className="med-input-icon-left" />
                  <input
                    className="med-input"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Arsenicum Album"
                  />
                </div>
              </div>

              <div className="med-form-group">
                <label className="med-label">SNOMED Terminology Mapping</label>
                <CodeAutocomplete
                  type="snomed"
                  placeholder="Search standard clinical codes..."
                  value={form.snomedCodeId ? { id: form.snomedCodeId, term: medicines.find(m => m.snomedCodeId === form.snomedCodeId)?.snomedLabel || '' } as any : null}
                  onSelect={(code) => {
                    const snomed = code as SnomedConceptResult;
                    setForm(f => ({ 
                      ...f, 
                      snomedCodeId: snomed ? Number(snomed.id) : null,
                      name: f.name || (snomed ? snomed.term : '')
                    }));
                  }}
                />
                <p className="med-input-hint">Ensures data interoperability for AI-driven clinical research.</p>
              </div>

              <div className="med-form-group">
                <label className="med-label">Disease Indication</label>
                <div className="med-input-wrap">
                  <Info size={16} className="med-input-icon-left" />
                  <input
                    className="med-input"
                    value={form.disease}
                    onChange={e => setForm(f => ({ ...f, disease: e.target.value }))}
                    placeholder="e.g. Chronic Cough, Anxiety"
                  />
                </div>
              </div>
            </div>

            <div className="med-form-grid">
              <div className="med-form-group">
                <label className="med-label">Potency</label>
                <select
                  className="med-select"
                  value={form.potencyId}
                  onChange={e => setForm(f => ({ ...f, potencyId: e.target.value }))}
                >
                  <option value="">Select</option>
                  {potencies.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="med-form-group">
                <label className="med-label">Category</label>
                <select
                  className="med-select"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  <option value="">Select</option>
                  <option value="Dilution">Dilution</option>
                  <option value="Trituration">Trituration</option>
                  <option value="Bio-Chemic">Bio-Chemic</option>
                  <option value="Generic">Generic</option>
                  <option value="Speciality">Speciality</option>
                </select>
              </div>
            </div>

            <div className="med-form-grid">
              <div className="med-form-group">
                <label className="med-label">Price per Unit</label>
                <div className="med-input-wrap">
                  <span className="med-currency-symbol">₹</span>
                  <input
                    type="number"
                    className="med-input"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                    style={{ paddingLeft: '32px' }}
                  />
                </div>
              </div>
              <div className="med-form-group">
                <label className="med-label">Opening Stock</label>
                <div className="med-input-wrap">
                  <Package size={16} className="med-input-icon-left" />
                  <input
                    type="number"
                    className="med-input"
                    value={form.stockLevel}
                    onChange={e => setForm(f => ({ ...f, stockLevel: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="med-drawer-footer">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Discard</button>
            <button type="submit" className="plat-btn-primary med-submit-btn" disabled={createMed.isPending || updateMed.isPending}>
              {editingId ? 'Update Remedy' : 'Register Remedy'}
            </button>
          </div>
        </form>
      </Drawer>

      <style>{`
        .med-stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 24px !important;
          background: var(--bg-card) !important;
          border-radius: 16px !important;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid var(--border-main) !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04) !important;
          position: relative;
          overflow: hidden;
        }
        .med-stat-card::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.05) 100%);
          pointer-events: none;
        }
        .med-stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px -10px rgba(0,0,0,0.08) !important;
          border-color: var(--pp-blue) !important;
        }
        .med-stat-icon-wrap {
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: inset 0 -2px 4px rgba(0,0,0,0.05);
        }
        .med-stat-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        .med-stat-value {
          font-weight: 800 !important;
          line-height: 1 !important;
          letter-spacing: -0.02em;
        }
        
        .hover-row-premium {
          transition: all 0.2s ease;
        }
        .hover-row-premium:hover {
          background: rgba(37, 99, 235, 0.02) !important;
          transform: scale(1.002);
          z-index: 10;
          box-shadow: 0 4px 12px -4px rgba(0,0,0,0.05);
        }
        
        .med-avatar-icon {
          border-radius: 10px;
          background: var(--bg-surface-2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: var(--pp-blue);
          border: 1px solid var(--border-main);
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        
        .med-snomed-tag {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          background: #f1f5f9;
          color: #475569;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
          margin-top: 6px;
          border: 1px solid #e2e8f0;
          text-transform: uppercase;
          font-family: var(--font-mono);
        }
        
        .med-pill-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 8px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .med-pill-badge.category { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
        .med-pill-badge.type { background: #ede9fe; color: #6d28d9; border: 1px solid #ddd6fe; }
        .med-pill-badge.potency { background: var(--bg-surface-2); color: var(--text-main); border: 1px solid var(--border-main); }
        
        .med-stock-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono);
          font-weight: 700;
        }
        .med-stock-wrap.ok { color: #059669; }
        .med-stock-wrap.low { color: #ea580c; }
        .med-stock-wrap.depleted { color: #dc2626; }
        
        .med-status-tag {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .status-success { background: #ecfdf5; color: #059669; }
        .status-warning { background: #fff7ed; color: #ea580c; }
        .status-danger { background: #fef2f2; color: #dc2626; }
        
        .med-price-tag {
          font-family: var(--font-mono);
          font-weight: 800;
          color: var(--pp-blue);
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--pp-blue-tint);
          padding: 4px 10px;
          border-radius: 8px;
          width: fit-content;
        }
        
        .med-action-cluster {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        .med-btn-icon {
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border-main);
          background: var(--bg-card);
          color: var(--text-muted);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .med-btn-icon:hover {
          border-color: var(--pp-blue);
          color: var(--pp-blue);
          background: var(--bg-card);
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }
        .med-btn-icon.remove:hover {
          border-color: #ef4444;
          color: #ef4444;
          background: #fef2f2;
        }
        
        .med-empty-circle {
          border-radius: 50%;
          background: var(--bg-surface-2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          color: var(--text-muted);
          border: 2px dashed var(--border-main);
        }
        
        .med-drawer-form {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .med-form-card {
          background: var(--bg-surface-2);
          padding: 20px;
          border-radius: 16px;
          border: 1px solid var(--border-main);
          margin-bottom: 24px;
        }
        .med-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 10px;
        }
        .required-dot::after { content: '*'; color: #dc2626; margin-left: 4px; }
        .med-input-wrap { position: relative; }
        .med-input-icon-left { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); opacity: 0.6; }
        .med-input, .med-select {
          width: 100%;
          height: 44px;
          padding: 0 12px 0 42px;
          background: var(--bg-card);
          border: 1px solid var(--border-main);
          border-radius: 12px;
          font-size: 14px;
          transition: all 0.2s;
        }
        .med-select { padding-left: 14px; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; }
        .med-input:focus, .med-select:focus { border-color: var(--pp-blue); outline: none; box-shadow: 0 0 0 4px var(--pp-blue-tint); }
        .med-input-hint { font-size: 11px; color: var(--text-muted); margin-top: 8px; line-height: 1.4; }
        .med-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .med-form-group { margin-bottom: 20px; }
        .med-currency-symbol { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-weight: 800; color: var(--pp-blue); }
        
        .med-drawer-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 24px 0;
          margin-top: auto;
          border-top: 1px solid var(--border-main);
        }
        .med-submit-btn {
          min-width: 160px;
          height: 46px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 15px;
        }


      `}</style>
    </div>
  );
}
