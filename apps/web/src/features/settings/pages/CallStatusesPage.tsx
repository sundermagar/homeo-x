import React, { useState } from 'react';
import { PhoneCall, Plus, Edit2, Trash2 } from 'lucide-react';
import { useCallStatuses, useCreateCallStatus, useUpdateCallStatus, useDeleteCallStatus } from '../hooks/use-settings';
import { Drawer } from '@/shared/components/drawer';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';

interface CallStatus {
  id: number;
  name: string;
  isActive: boolean;
}

const EMPTY_FORM = { name: '', isActive: true };

export default function CallStatusesPage() {
  const { data: statuses = [], isLoading } = useCallStatuses();
  const createStatus = useCreateCallStatus();
  const updateStatus = useUpdateCallStatus();
  const deleteStatus = useDeleteCallStatus();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(statuses);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (status: CallStatus) => {
    setEditingId(status.id);
    setForm({ name: status.name, isActive: status.isActive });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateStatus.mutateAsync({ id: editingId, ...form });
    } else {
      await createStatus.mutateAsync(form);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the call status "${name}"?`)) return;
    await deleteStatus.mutateAsync(id);
  };

  return (
    <div className="plat-page fade-in">
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <PhoneCall size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Call Statuses
          </h1>
          <p className="plat-header-sub">Manage follow-up statuses like "Interested", "Call Later", etc.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} strokeWidth={1.6} />
            Add Call Status
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <p className="plat-stat-label">Total Statuses</p>
          <p className="plat-stat-value plat-stat-value-primary">{statuses.length}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Active Statuses</p>
          <p className="plat-stat-value plat-stat-value-success">
            {statuses.filter((d: any) => d.isActive).length}
          </p>
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : statuses.length === 0 ? (
          <EmptyState 
            icon={PhoneCall}
            title="No call statuses found"
            description="Add your first call status to track follow-up outcomes."
            actionLabel="Add Call Status"
            onAction={handleOpenCreate}
            variant="card"
            className="my-8"
          />
        ) : (
          <>
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Status Name</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((status: CallStatus, idx: number) => (
                  <tr key={status.id} className="plat-table-row">
                    <td data-label="ID" className="plat-table-cell font-mono text-xs color-muted">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td data-label="Name" className="plat-table-cell font-semibold">{status.name}</td>
                    <td data-label="Status" className="plat-table-cell">
                      <span className={`plat-badge ${status.isActive ? 'plat-badge-staff' : 'plat-badge-default'}`}>
                        {status.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="plat-table-cell">
                      <div className="flex justify-end gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(status)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(status.id, status.name)}>
                          <Trash2 size={13} />
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
        title={editingId ? 'Edit Call Status' : 'Add Call Status'}
        maxWidth="480px"
      >
        <form onSubmit={handleSubmit}>
          <div className="plat-modal-body" style={{ padding: 0 }}>
            <div className="plat-form-section" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
              <div className="plat-form-grid-multi" style={{ gridTemplateColumns: '1fr' }}>
                <div className="plat-form-group">
                  <label className="plat-form-label">Status Name *</label>
                  <input
                    className="plat-form-input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    placeholder="e.g. Interested, Call Later"
                  />
                </div>
                <label className="plat-checkbox-group">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  />
                  <span className="plat-checkbox-label">Status is active</span>
                </label>
              </div>
            </div>
          </div>
          <div className="plat-modal-footer" style={{ padding: '24px 0 0 0', marginTop: '24px' }}>
            <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="plat-btn plat-btn-primary" disabled={createStatus.isPending || updateStatus.isPending}>
              {editingId ? 'Save Changes' : 'Create Call Status'}
            </button>
          </div>
        </form>
      </Drawer>

    </div>
  );
}
