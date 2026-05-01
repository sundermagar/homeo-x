import React, { useMemo, useState } from 'react';
import { Package, Plus, X, RefreshCw, Trash2, Edit2, Info, IndianRupee, Search, Tag, Database } from 'lucide-react';
import { useStocks, useCreateStock, useUpdateStock, useDeleteStock } from '../hooks/use-settings';
import { Drawer } from '@/shared/components/drawer';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';

interface Stock {
  id: number;
  name: string;
  description?: string;
  potency?: string;
  category?: string;
  quantity?: number;
  unitPrice?: number;
  batchNumber?: string;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  potency: '',
  category: '',
  quantity: 0,
  unitPrice: 0,
  batchNumber: ''
};

export default function StocksPage() {
  const { data: stocks = [], isLoading } = useStocks();

  const createStock = useCreateStock();
  const updateStock = useUpdateStock();
  const deleteStock = useDeleteStock();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => stocks.filter((s: Stock) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase()) ||
    s.potency?.toLowerCase().includes(search.toLowerCase())
  ), [stocks, search]);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(filtered);

  const totalValue = useMemo(() => 
    stocks.reduce((acc: number, s: Stock) => acc + ((s.quantity || 0) * (s.unitPrice || 0)), 0), 
    [stocks]
  );

  const lowStockCount = useMemo(() => stocks.filter((s: Stock) => (s.quantity || 0) < 10).length, [stocks]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (stock: Stock) => {
    setEditingId(stock.id);
    setForm({
      name: stock.name,
      description: stock.description || '',
      potency: stock.potency || '',
      category: stock.category || '',
      quantity: stock.quantity || 0,
      unitPrice: stock.unitPrice || 0,
      batchNumber: stock.batchNumber || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        unitPrice: Number(form.unitPrice)
      };

      if (editingId) {
        await updateStock.mutateAsync({ id: editingId, ...payload });
      } else {
        await createStock.mutateAsync(payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('[StockForm] Error', err);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}" from stock?`)) return;
    await deleteStock.mutateAsync(id);
  };

  return (
    <div className="plat-page fade-in">
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Package size={20} className="color-primary" />
            Inventory & Stock Management
          </h1>
          <p className="plat-header-sub">Track physical medicine stock, potencies, and unit pricing.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} /> Add Stock Item
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <p className="plat-stat-label">Stock Items</p>
          <p className="plat-stat-value plat-stat-value-primary">{stocks.length}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Inventory Value</p>
          <p className="plat-stat-value">₹{totalValue.toLocaleString()}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Low Stock Items</p>
          <p className={`plat-stat-value ${lowStockCount > 0 ? 'plat-stat-value-warning' : ''}`}>
            {lowStockCount}
          </p>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={14} className="plat-search-icon" />
          <input
            className="plat-form-input plat-search-input"
            placeholder="Search by name, potency, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <TableSkeleton rows={5} columns={7} />
        ) : filtered.length === 0 ? (
          <div className="plat-empty" style={{ minHeight: 200 }}>
            <Database size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No inventory records found.</p>
          </div>
        ) : (
          <>
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Medicine Name</th>
                  <th>Potency / Description</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item: Stock, idx: number) => (
                  <tr key={item.id} className="plat-table-row">
                    <td className="plat-table-cell font-mono text-xs opacity-50">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="plat-table-cell">
                      <div className="font-bold">{item.name}</div>
                      {item.batchNumber && (
                        <div className="text-[10px] color-muted mt-0.5">Batch: {item.batchNumber}</div>
                      )}
                    </td>
                    <td className="plat-table-cell">
                      <div className="text-sm">{item.potency || '—'}</div>
                      <div className="text-[11px] color-muted italic">{item.description || 'No description'}</div>
                    </td>
                    <td className="plat-table-cell">
                      <span className="plat-badge plat-badge-default text-[10px] uppercase">{item.category || 'General'}</span>
                    </td>
                    <td className="plat-table-cell font-mono font-bold">
                      <span className={(item.quantity || 0) < 10 ? 'text-red-600' : ''}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="plat-table-cell font-mono text-primary font-bold">
                      ₹{item.unitPrice || '0'}
                    </td>
                    <td className="plat-table-cell">
                      <div className="flex justify-end gap-2">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(item)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(item.id, item.name)}>
                          <Trash2 size={13} />
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
        title={editingId ? 'Edit Stock Item' : 'Add New Stock'}
        maxWidth="600px"
      >
        <form onSubmit={handleSubmit}>
          <div className="plat-modal-body" style={{ padding: 0 }}>
            <div className="plat-form-section" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
              <div className="plat-form-group">
                <label className="plat-form-label">Medicine Name *</label>
                <input
                  className="plat-form-input"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Enter medicine name"
                />
              </div>

              <div className="plat-form-grid-multi mt-4">
                <div className="plat-form-group">
                  <label className="plat-form-label">Potency</label>
                  <input
                    className="plat-form-input"
                    value={form.potency}
                    onChange={e => setForm(f => ({ ...f, potency: e.target.value }))}
                    placeholder="e.g. 200C, 30CH"
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
                    <option value="Mother Tincture">Mother Tincture</option>
                    <option value="Biochemic">Biochemic</option>
                    <option value="Trituration">Trituration</option>
                    <option value="External">External</option>
                  </select>
                </div>
              </div>

              <div className="plat-form-group mt-4">
                <label className="plat-form-label">Description / Related Diseases</label>
                <textarea
                  className="plat-form-input"
                  rows={3}
                  style={{ minHeight: '100px' }}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Indications or diseases..."
                />
              </div>

              <div className="plat-form-grid-multi mt-4" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="plat-form-group">
                  <label className="plat-form-label">Current Quantity</label>
                  <input
                    type="number"
                    className="plat-form-input"
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                  />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Unit Price (₹)</label>
                  <input
                    type="number"
                    className="plat-form-input"
                    value={form.unitPrice}
                    onChange={e => setForm(f => ({ ...f, unitPrice: Number(e.target.value) }))}
                  />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Batch Number</label>
                  <input
                    className="plat-form-input"
                    value={form.batchNumber}
                    onChange={e => setForm(f => ({ ...f, batchNumber: e.target.value }))}
                    placeholder="B-001"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="plat-modal-footer" style={{ padding: '24px 0 0 0', marginTop: '24px' }}>
            <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="plat-btn plat-btn-primary">
              {editingId ? 'Update Stock' : 'Add Stock Item'}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
