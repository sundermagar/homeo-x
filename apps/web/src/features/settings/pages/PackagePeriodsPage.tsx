import React, { useState } from 'react';
import { Clock, Plus, Trash2, Edit2, Calendar, Search } from 'lucide-react';
import { Drawer } from '@/shared/components/drawer';
import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import {
  usePackagePeriods,
  useCreatePackagePeriod,
  useUpdatePackagePeriod,
  useDeletePackagePeriod
} from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

const EMPTY_FORM = { name: '', days: 30, description: '', isActive: true };

export default function PackagePeriodsPage() {
  const { data: periods = [], isLoading } = usePackagePeriods();
  const createPeriod = useCreatePackagePeriod();
  const updatePeriod = useUpdatePackagePeriod();
  const deletePeriod = useDeletePackagePeriod();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = periods.filter((p: any) =>
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

  const handleOpenEdit = (period: any) => {
    setEditingId(period.id);
    setForm({
      name: period.name,
      days: Number(period.days),
      description: period.description || '',
      isActive: period.isActive ?? true
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updatePeriod.mutateAsync({ id: editingId, ...form });
    } else {
      await createPeriod.mutateAsync(form);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete period "${name}"?`)) return;
    await deletePeriod.mutateAsync(id);
  };

  return (
    <div className="plat-page fade-in">
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Clock size={20} className="color-primary" />
            Package Periods
          </h1>
          <p className="plat-header-sub">Predefined membership plan durations and effective validity days.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} />
            Add Period
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <p className="plat-stat-label">Total Periods</p>
          <p className="plat-stat-value plat-stat-value-primary">{periods.length}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Active Periods</p>
          <p className="plat-stat-value plat-stat-value-success">
            {periods.filter((p: any) => p.isActive).length}
          </p>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={14} className="plat-search-icon" />
          <input
            className="plat-form-input plat-search-input"
            placeholder="Search periods..."
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
            <Clock size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No package periods found.</p>
          </div>
        ) : (
          <>
            <div className="plat-table-container">
              <table className="plat-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px', textAlign: 'left' }}>ID</th>
                    <th style={{ textAlign: 'left' }}>Period Name</th>
                    <th style={{ textAlign: 'left' }}>Description</th>
                    <th style={{ textAlign: 'left' }}>Effective Days</th>
                    <th style={{ width: '100px', textAlign: 'left' }}>Status</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((period: any, idx: number) => (
                    <tr key={period.id} className="plat-table-row">
                      <td data-label="ID" className="plat-table-cell font-mono text-xs color-muted text-left">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td data-label="Period Name" className="plat-table-cell font-semibold text-left">
                        {period.name}
                      </td>
                      <td data-label="Description" className="plat-table-cell text-left color-muted text-xs">
                        {period.description || 'No description'}
                      </td>
                      <td data-label="Effective Days" className="plat-table-cell font-mono font-bold text-left">
                        <span className="flex items-center gap-1.5 justify-start">
                          <Calendar size={13} className="color-primary" />
                          {period.days} Days
                        </span>
                      </td>
                      <td data-label="Status" className="plat-table-cell text-left">
                        <span className={`plat-badge ${period.isActive ? 'plat-badge-staff' : 'plat-badge-default'}`}>
                          {period.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="plat-table-cell">
                        <div className="flex justify-end gap-2">
                          <button className="plat-btn plat-btn-icon" onClick={() => handleOpenEdit(period)}>
                            <Edit2 size={14} />
                          </button>
                          <button className="plat-btn plat-btn-icon plat-btn-danger" onClick={() => handleDelete(period.id, period.name)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
        title={editingId ? 'Edit Package Period' : 'Add New Period'}
        maxWidth="480px"
      >
        <form onSubmit={handleSubmit}>
          <div className="plat-modal-body" style={{ padding: 0 }}>
            <div className="plat-form-section" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
              <div className="plat-form-grid-multi" style={{ gridTemplateColumns: '1fr' }}>
                <div className="plat-form-group">
                  <label className="plat-form-label">Period Name *</label>
                  <input
                    className="plat-form-input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    placeholder="e.g. Monthly, Quarterly"
                  />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Effective Days *</label>
                  <div className="plat-input-wrapper">
                    <Calendar size={16} className="plat-input-icon" />
                    <input
                      type="number"
                      min="1"
                      className="plat-form-input"
                      value={form.days}
                      onChange={e => setForm(f => ({ ...f, days: Number(e.target.value) }))}
                      required
                      placeholder="e.g. 30, 90"
                    />
                  </div>
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Description</label>
                  <textarea
                    className="plat-form-input"
                    style={{ minHeight: '80px' }}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Short description of the period..."
                  />
                </div>
                <label className="plat-checkbox-group">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  />
                  <span className="plat-checkbox-label">Period is Active</span>
                </label>
              </div>
            </div>
          </div>
          <div className="plat-modal-footer" style={{ padding: '24px 0 0 0', marginTop: '24px' }}>
            <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="plat-btn plat-btn-primary" disabled={createPeriod.isPending || updatePeriod.isPending}>
              {editingId ? 'Update Period' : 'Add Period'}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
