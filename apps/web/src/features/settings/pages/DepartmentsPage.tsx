import React, { useState } from 'react';
import { Layers, Plus, X, RefreshCw, Trash2, Edit2, CheckCircle2, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment } from '../hooks/use-settings';
import { Drawer } from '@/shared/components/drawer';
import '../../platform/styles/platform.css'; // Reusing platform styles
import '../styles/settings.css';

import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import { TableSkeleton } from '@/shared/components/TableSkeleton';

interface Department {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
}

const EMPTY_FORM = { name: '', description: '', isActive: true };

export default function DepartmentsPage() {
  const { data: depts = [], isLoading } = useDepartments();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();

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
  } = usePagination(depts);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingId(dept.id);
    setForm({ name: dept.name, description: dept.description || '', isActive: dept.isActive });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateDept.mutateAsync({ id: editingId, ...form });
    } else {
      await createDept.mutateAsync(form);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the department "${name}"?`)) return;
    await deleteDept.mutateAsync(id);
  };

  return (
    <div className="plat-page fade-in">


      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Layers size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Departments
          </h1>
          <p className="plat-header-sub">Manage clinic departments and medical specializations.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} strokeWidth={1.6} />
            Add Department
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <p className="plat-stat-label">Total Departments</p>
          <p className="plat-stat-value plat-stat-value-primary">{depts.length}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Active Units</p>
          <p className="plat-stat-value plat-stat-value-success">
            {depts.filter((d: any) => d.isActive).length}
          </p>
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : depts.length === 0 ? (
          <div className="plat-empty">
            <Layers size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No departments found. Add your first one.</p>
          </div>
        ) : (
          <>
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Department Name</th>
                  <th>Description / Detail</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((dept: Department, idx: number) => (
                  <tr key={dept.id} className="plat-table-row">
                    <td data-label="ID" className="plat-table-cell font-mono text-xs color-muted">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td data-label="Name" className="plat-table-cell font-semibold">{dept.name}</td>
                    <td data-label="Detail" className="plat-table-cell text-secondary">{dept.description || '—'}</td>
                    <td data-label="Status" className="plat-table-cell">
                      <span className={`plat-badge ${dept.isActive ? 'plat-badge-staff' : 'plat-badge-default'}`}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="plat-table-cell">
                      <div className="flex justify-end gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(dept)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(dept.id, dept.name)}>
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
        title={editingId ? 'Edit Department' : 'Add Department'}
        maxWidth="480px"
      >
        <form onSubmit={handleSubmit}>
          <div className="plat-modal-body" style={{ padding: 0 }}>
            <div className="plat-form-section" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
              <div className="plat-form-grid-multi" style={{ gridTemplateColumns: '1fr' }}>
                <div className="plat-form-group">
                  <label className="plat-form-label">Department Name *</label>
                  <input
                    className="plat-form-input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    placeholder="e.g. Homeopathy, General Medicine"
                  />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Detail</label>
                  <textarea
                    className="plat-form-input"
                    style={{ minHeight: '120px' }}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Describe the department's focus..."
                  />
                </div>
                <div className="flex items-center gap-2 py-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary"
                    id="isActive"
                    checked={form.isActive}
                    onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  />
                  <label htmlFor="isActive" className="plat-form-label mb-0 cursor-pointer">Department is active</label>
                </div>
              </div>
            </div>
          </div>
          <div className="plat-modal-footer" style={{ padding: '24px 0 0 0', marginTop: '24px' }}>
            <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="plat-btn plat-btn-primary" disabled={createDept.isPending || updateDept.isPending}>
              {editingId ? 'Save Changes' : 'Create Department'}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
