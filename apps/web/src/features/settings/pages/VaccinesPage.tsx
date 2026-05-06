import React, { useMemo, useState } from 'react';
import { Shield, Plus, Search, Edit2, Trash2, Info, Calendar, ChevronRight, MoreHorizontal } from 'lucide-react';
import { useVaccines, useCreateVaccine, useUpdateVaccine, useDeleteVaccine } from '../hooks/use-settings';
import { Drawer } from '@/shared/components/drawer';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

import { Pagination } from '@/shared/components/Pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';

interface Vaccine {
  id: number;
  label: string;
  description?: string;
  months?: number;
  parentId?: number;
}

const EMPTY_FORM = {
  label: '',
  description: '',
  months: '',
  parentId: '0'
};

export default function VaccinesPage() {
  const { data: vaccines = [], isLoading } = useVaccines();

  const createVac = useCreateVaccine();
  const updateVac = useUpdateVaccine();
  const deleteVac = useDeleteVaccine();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  const flatGrouped = useMemo(() => {
    const categoryMap: Record<number, Vaccine> = {};
    const childrenMap: Record<number, Vaccine[]> = {};

    // Separate categories and children
    vaccines.forEach(v => {
      if (v.parentId === 0) {
        categoryMap[v.id] = v;
      } else {
        if (!childrenMap[v.parentId]) childrenMap[v.parentId] = [];
        childrenMap[v.parentId].push(v);
      }
    });

    // Build flat list with headers
    const list: (Vaccine & { isHeader?: boolean })[] = [];
    const sortedCats = Object.values(categoryMap).sort((a, b) => (a.months || 0) - (b.months || 0));

    sortedCats.forEach(cat => {
      list.push({ ...cat, isHeader: true });
      const children = childrenMap[cat.id] || [];
      list.push(...children.sort((a, b) => (a.months || 0) - (b.months || 0)));
    });

    // Orphans handle
    const orphans = vaccines.filter(v => v.parentId !== 0 && !categoryMap[v.parentId]);
    if (orphans.length > 0) {
      list.push({ id: -1, label: 'Standard / Other', isHeader: true, months: 999 } as any);
      list.push(...orphans);
    }

    // Filter by search
    if (!search) return list;
    
    return list.filter(v => 
      v.label?.toLowerCase().includes(search.toLowerCase()) || 
      v.description?.toLowerCase().includes(search.toLowerCase())
    );
  }, [vaccines, search]);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(flatGrouped);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vac: Vaccine) => {
    setEditingId(vac.id);
    setForm({
      label: vac.label,
      description: vac.description || '',
      months: vac.months?.toString() || '',
      parentId: vac.parentId?.toString() || '0'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        months: form.months ? parseInt(form.months) : null,
        parentId: parseInt(form.parentId) || 0
      };

      if (editingId) {
        await updateVac.mutateAsync({ id: editingId, ...payload });
      } else {
        await createVac.mutateAsync(payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('[VaccineForm] Submission Error', err);
    }
  };

  const handleDelete = async (id: number, label: string) => {
    if (!confirm(`Permanently remove vaccine "${label}"?`)) return;
    await deleteVac.mutateAsync(id);
  };

  const categories = useMemo(() => vaccines.filter((v: Vaccine) => v.parentId === 0), [vaccines]);

  return (
    <div className="plat-page fade-in">
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Shield size={20} className="color-primary" />
            Immunization Master Data
          </h1>
          <p className="plat-header-sub">Manage clinical vaccination schedules and age-based milestones.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} /> Add Vaccine
          </button>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap" style={{ flex: 1 }}>
          <Search size={14} className="plat-search-icon" />
          <input
            className="plat-form-input plat-search-input"
            placeholder="Search immunization label or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="plat-card">
        {isLoading ? (
          <TableSkeleton rows={8} columns={4} />
        ) : flatGrouped.length === 0 ? (
          <EmptyState 
            icon={Shield}
            title={search ? "No matches found" : "Immunization master is empty"}
            description={search ? `No vaccine records matching "${search}" were found.` : "Start building your clinical immunization schedule by adding your first vaccine."}
            actionLabel={search ? "Clear Search" : "Add Vaccine"}
            onAction={search ? () => setSearch('') : handleOpenCreate}
            variant="card"
            className="my-8"
          />
        ) : (
          <>
          <div className="plat-table-container" style={{ border: 'none' }}>
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Vaccine & Description</th>
                  <th style={{ width: '180px' }}>Recommended Age</th>
                  <th style={{ textAlign: 'right', width: '120px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((vac: Vaccine & { isHeader?: boolean }, idx: number) => {
                  if (vac.isHeader) {
                    return (
                      <tr key={`header-${vac.id}`} className="plat-table-row-group">
                        <td colSpan={4} className="plat-table-milestone-cell">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="color-primary" />
                            <span className="font-bold text-[12px] uppercase tracking-wider color-primary">
                              {vac.label} 
                              {vac.months !== undefined && vac.months !== 999 && (
                                <span className="ml-2 color-muted font-normal text-[10px]">
                                  (At {vac.months} Months)
                                </span>
                              )}
                            </span>
                            <div className="flex-1 border-t border-dashed border-gray-300 ml-4 opacity-50"></div>
                            <button 
                              className="plat-btn-icon plat-btn-ghost plat-btn-sm" 
                              onClick={() => handleOpenEdit(vac)}
                              title="Edit Milestone"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={vac.id} className="plat-table-row">
                      <td data-label="#" className="plat-table-cell font-mono text-[10px] color-muted opacity-60">
                        {idx + 1 + (currentPage - 1) * itemsPerPage}
                      </td>
                      <td data-label="VACCINE" className="plat-table-cell">
                        <div className="flex items-start gap-3 justify-start">
                          <div className="mt-1 p-1.5 rounded-md bg-blue-50 text-blue-500 md:block hidden">
                            <Shield size={14} />
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-[14px] color-main">{vac.label}</div>
                            {vac.description && (
                              <div className="text-[12px] color-muted mt-0.5 flex items-start gap-1.5 leading-relaxed justify-start">
                                <Info size={11} className="mt-0.5 opacity-40 shrink-0" />
                                <span>{vac.description}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td data-label="AGE" className="plat-table-cell">
                        <div className="flex justify-start">
                          {vac.months !== null && vac.months !== undefined ? (
                            <div className={`plat-badge ${vac.months === 0 ? 'plat-badge-success' : 'plat-badge-info'}`}>
                               {vac.months === 0 ? 'At Birth' : `${vac.months} Months`}
                            </div>
                          ) : (
                            <span className="color-muted text-[11px]">N/A</span>
                          )}
                        </div>
                      </td>
                      <td data-label="ACTION" className="plat-table-cell" style={{ textAlign: 'right' }}>
                        <div className="flex justify-end gap-1">
                          <button 
                            className="plat-btn-icon plat-btn-ghost" 
                            onClick={() => handleOpenEdit(vac)} 
                            title="Edit Vaccine"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="plat-btn-icon plat-btn-ghost-danger" 
                            onClick={() => handleDelete(vac.id, vac.label)} 
                            title="Delete"
                          >
                            <Trash2 size={14} />
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
        title={editingId ? 'Update Vaccine Record' : 'Register New Vaccine'}
        maxWidth="500px"
      >
        <form onSubmit={handleSubmit}>
          <div className="plat-modal-body" style={{ padding: 0 }}>
            <div className="plat-form-section" style={{ border: 'none', boxShadow: 'none', padding: 0 }}>
              <div className="plat-form-group">
                <label className="plat-form-label">Vaccine / Milestone Name *</label>
                <div className="plat-input-wrapper">
                  <Shield className="plat-input-icon" size={14} />
                  <input
                    className="plat-form-input"
                    required
                    value={form.label}
                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="e.g. Hepatitis B (HepB) - D1"
                  />
                </div>
              </div>

              <div className="plat-form-group mt-6">
                <label className="plat-form-label">Clinical Notes / Guidance</label>
                <textarea
                  className="plat-form-input"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Additional details for clinicians..."
                  style={{ height: '100px', paddingTop: '10px', lineHeight: '1.5' }}
                />
              </div>

              <div className="plat-form-grid-multi mt-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="plat-form-group">
                  <label className="plat-form-label">Age Milestone (Months)</label>
                  <div className="plat-input-wrapper">
                    <Calendar className="plat-input-icon" size={14} />
                    <input
                      type="number"
                      className="plat-form-input"
                      value={form.months}
                      onChange={e => setForm(f => ({ ...f, months: e.target.value }))}
                      placeholder="e.g. 0 for Birth"
                    />
                  </div>
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Hierarchy Category</label>
                  <select
                    className="plat-form-input"
                    value={form.parentId}
                    onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
                  >
                    <option value="0">None (Set as Header)</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="plat-modal-footer" style={{ padding: '24px 0 0 0', marginTop: '24px', borderTop: '1px solid var(--pp-warm-4)' }}>
            <button type="button" className="plat-btn plat-btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="plat-btn plat-btn-primary" disabled={createVac.isPending || updateVac.isPending}>
              {editingId ? 'Update Record' : 'Save Vaccine'}
            </button>
          </div>
        </form>
      </Drawer>

      {/* style removed */}

    </div>
  );
}
