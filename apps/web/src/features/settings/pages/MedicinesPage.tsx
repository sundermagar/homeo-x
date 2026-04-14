import React, { useState } from 'react';
import { Pill, Plus, X, RefreshCw, ArrowLeft, Trash2, Edit2, Info, Package, IndianRupee, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMedicines, useCreateMedicine, useUpdateMedicine, useDeleteMedicine, usePotencies } from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

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
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const filtered = medicines.filter((m: Medicine) =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.disease?.toLowerCase().includes(search.toLowerCase()) ||
    m.category?.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = medicines.filter((m: Medicine) => (m.stockLevel || 0) > 0 && (m.stockLevel || 0) < 10).length;
  const outOfStockCount = medicines.filter((m: Medicine) => (m.stockLevel || 0) === 0).length;

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
      potencyId: med.potencyId || '',
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
        price: parseFloat(form.price) || 0,
        stockLevel: parseInt(form.stockLevel) || 0
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
    if (!confirm(`Delete medicine "${name}"?`)) return;
    await deleteMed.mutateAsync(id);
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
            <Pill size={20} className="color-primary" />
            Medicine Catalog
          </h1>
          <p className="plat-header-sub">Manage clinical inventory, pricing and data.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} />
            Add Medicine
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <span className="plat-stat-label">Total Items</span>
          <span className="plat-stat-value">{medicines.length}</span>
        </div>
        <div className="plat-stat-card">
          <span className="plat-stat-label">Low Stock</span>
          <span className={`plat-stat-value ${lowStockCount > 0 ? 'text-warning font-bold' : ''}`}>
            {lowStockCount}
          </span>
        </div>
        <div className="plat-stat-card">
          <span className="plat-stat-label">Out of Stock</span>
          <span className={`plat-stat-value ${outOfStockCount > 0 ? 'text-danger font-bold' : ''}`}>
            {outOfStockCount}
          </span>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={16} className="plat-search-icon" />
          <input 
            className="plat-filter-input plat-search-input"
            placeholder="Search catalog by name, disease or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty">
            <RefreshCw size={22} className="animate-spin opacity-30" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="plat-empty">
            <Pill size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No medicines found in the catalog.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Medicine & Indication</th>
                  <th>Categorization</th>
                  <th>Inventory</th>
                  <th>Pricing</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((med: Medicine, idx: number) => {
                   const potencyName = potencies.find((p: any) => p.id === med.potencyId)?.name || '—';
                   const stock = med.stockLevel || 0;
                   const isOutOfStock = stock === 0;
                   const isLowStock = stock > 0 && stock < 10;

                   return (
                    <tr key={med.id} className="plat-table-row">
                      <td data-label="ID" className="plat-table-cell color-muted font-mono text-xs">{idx + 1}</td>
                      <td data-label="Medicine" className="plat-table-cell">
                        <div className="font-semibold">{med.name}</div>
                        <div className="text-xs color-muted mt-0.5 flex items-center gap-1">
                          <Info size={10} /> {med.disease || 'General Remedy'}
                        </div>
                      </td>
                      <td data-label="Category" className="plat-table-cell">
                        <div className="flex flex-wrap gap-1.5">
                           {med.category && <span className="plat-badge plat-badge-staff text-[10px]">{med.category}</span>}
                           {med.type && <span className="plat-badge plat-badge-default text-[10px]">{med.type}</span>}
                           <span className="plat-badge bg-faded text-[10px] border border-main color-muted italic">{potencyName}</span>
                        </div>
                      </td>
                      <td data-label="Stock" className="plat-table-cell">
                        <div className="flex flex-col gap-1">
                           <div className="flex items-center gap-1.5 font-mono text-sm">
                             <Package size={12} className="color-muted" />
                             <span className={isOutOfStock ? 'text-danger font-bold' : isLowStock ? 'text-warning font-bold' : 'text-success'}>
                               {stock} Units
                             </span>
                           </div>
                           <div className="flex gap-1">
                             {isOutOfStock ? (
                               <span className="text-[9px] flex items-center gap-0.5 text-danger bg-danger/5 px-1 rounded border border-danger/10">
                                 <AlertCircle size={8} /> OUT OF STOCK
                               </span>
                             ) : isLowStock ? (
                               <span className="text-[9px] flex items-center gap-0.5 text-warning bg-warning/5 px-1 rounded border border-warning/10">
                                 <AlertCircle size={8} /> LOW STOCK
                               </span>
                             ) : (
                               <span className="text-[9px] flex items-center gap-0.5 text-success bg-success/5 px-1 rounded border border-success/10">
                                 <CheckCircle2 size={8} /> AVAILABLE
                               </span>
                             )}
                           </div>
                        </div>
                      </td>
                      <td data-label="Price" className="plat-table-cell">
                        <div className="flex items-center gap-1 font-mono font-semibold text-primary">
                          <IndianRupee size={12} />
                          {med.price || 0}
                        </div>
                      </td>
                      <td className="plat-table-cell">
                        <div className="flex justify-end gap-3">
                          <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(med)}>
                            <Edit2 size={13} />
                          </button>
                          <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(med.id, med.name)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                   );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="plat-modal-overlay fade-in" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="plat-modal" style={{ maxWidth: '600px' }}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">
                {editingId ? 'Edit Medicine Details' : 'Add New Medicine'}
              </h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="plat-modal-form">
              <div className="plat-modal-body">
                <div className="plat-form">
                  {/* Basic Info */}
                  <div className="plat-form-group plat-form-full">
                    <label className="plat-form-label">Medicine Name *</label>
                    <div className="plat-input-wrapper">
                      <Pill size={16} className="plat-input-icon" />
                      <input
                        className="plat-form-input"
                        required
                        value={form.name}
                        onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Arnica Montana"
                      />
                    </div>
                  </div>

                  <div className="plat-form-group plat-form-full">
                    <label className="plat-form-label">Primary Disease / Indication</label>
                    <div className="plat-input-wrapper">
                      <Info size={16} className="plat-input-icon" />
                      <input
                        className="plat-form-input"
                        value={form.disease}
                        onChange={e => setForm((f: any) => ({ ...f, disease: e.target.value }))}
                        placeholder="e.g. Injury, Muscle Pain..."
                      />
                    </div>
                  </div>

                  {/* Categorization Grid */}
                  <div className="plat-form-group">
                    <label className="plat-form-label">Potency</label>
                    <select 
                      className="plat-form-select"
                      value={form.potencyId}
                      onChange={e => setForm((f: any) => ({ ...f, potencyId: e.target.value }))}
                    >
                      <option value="">Select Potency</option>
                      {potencies.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="plat-form-group">
                    <label className="plat-form-label">Type</label>
                    <input 
                      className="plat-form-input"
                      value={form.type}
                      onChange={e => setForm((f: any) => ({ ...f, type: e.target.value }))}
                      placeholder="e.g. Dilution"
                    />
                  </div>

                  <div className="plat-form-group">
                    <label className="plat-form-label">Category</label>
                    <select 
                      className="plat-form-select"
                      value={form.category}
                      onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}
                    >
                      <option value="">Select Category</option>
                      <option value="Mother Tincture">Mother Tincture</option>
                      <option value="Dilution">Dilution</option>
                      <option value="Bio-Chemic">Bio-Chemic</option>
                      <option value="Ointment">Ointment</option>
                      <option value="Generic">Generic</option>
                      <option value="Patent">Patent</option>
                    </select>
                  </div>
                  <div className="plat-form-group">
                    <label className="plat-form-label">Price (₹)</label>
                    <div className="plat-input-wrapper">
                      <IndianRupee size={16} className="plat-input-icon" />
                      <input 
                        type="number"
                        className="plat-form-input"
                        value={form.price}
                        onChange={e => setForm((f: any) => ({ ...f, price: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="plat-form-group plat-form-full">
                    <label className="plat-form-label">Current Stock Level</label>
                    <div className="plat-input-wrapper">
                      <Package size={16} className="plat-input-icon" />
                      <input 
                        type="number"
                        className="plat-form-input"
                        value={form.stockLevel}
                        onChange={e => setForm((f: any) => ({ ...f, stockLevel: e.target.value }))}
                      />
                    </div>
                    <p className="text-xs color-muted mt-1">Changes are automatically logged in Stock Audit Trail.</p>
                  </div>
                </div>
              </div>

              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createMed.isPending || updateMed.isPending}>
                  {editingId ? 'Update Catalog' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
