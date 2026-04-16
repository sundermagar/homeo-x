import { useState } from 'react';
import { Users, Plus, X, RefreshCw, Trash2, Edit2, CheckCircle2, Tag, Search } from 'lucide-react';
import { useReferrals, useCreateReferral, useUpdateReferral, useDeleteReferral } from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

const EMPTY_FORM = { name: '', type: '', isActive: true };

export default function ReferralSourcesPage() {
  const { data: referrals = [], isLoading } = useReferrals();
  const createRef = useCreateReferral();
  const updateRef = useUpdateReferral();
  const deleteRef = useDeleteReferral();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = referrals.filter((r: any) => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.type && r.type.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ref: any) => {
    setEditingId(ref.id);
    setForm({ 
      name: ref.name, 
      type: ref.type || '', 
      isActive: ref.isActive 
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[ReferralForm] Submit', { editingId, form });
    if (editingId) {
      await updateRef.mutateAsync({ id: editingId, ...form });
    } else {
      await createRef.mutateAsync(form);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete referral source "${name}"?`)) return;
    await deleteRef.mutateAsync(id);
  };

  return (
    <div className="plat-page animate-fade-in">
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Users size={20} className="color-primary" />
            Referral Sources
          </h1>
          <p className="plat-header-sub">Manage where your patients are coming from (Doctors, Marketing, etc.).</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={handleOpenCreate}>
            <Plus size={14} />
            Add Source
          </button>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <span className="plat-stat-label">Total Sources</span>
          <span className="plat-stat-value">{referrals.length}</span>
        </div>
        <div className="plat-stat-card">
          <span className="plat-stat-label">Active Channels</span>
          <span className="plat-stat-value plat-stat-value-success">
            {referrals.filter((r: any) => r.isActive).length}
          </span>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={16} className="plat-search-icon" />
          <input 
            className="plat-filter-input plat-search-input"
            placeholder="Search sources..."
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
            <Users size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No referral sources found.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>ID</th>
                  <th>Source Name</th>
                  <th>Category / Type</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((ref: any, idx: number) => (
                  <tr key={ref.id}>
                    <td data-label="#" style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.78rem', color: 'var(--pp-text-3)' }}>{idx + 1}</td>
                    <td data-label="Source Name" style={{ fontWeight: 700 }}>{ref.name}</td>
                    <td data-label="Type">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--pp-text-2)' }}>
                        <Tag size={12} style={{ color: 'var(--pp-text-3)' }} />
                        {ref.type || 'General'}
                      </span>
                    </td>
                    <td data-label="Status">
                       <span className={`plat-badge ${ref.isActive ? 'plat-badge-staff' : 'plat-badge-default'}`}>
                         {ref.isActive ? 'Active' : 'Inactive'}
                       </span>
                    </td>
                    <td>
                      <div className="plat-action-group">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => handleOpenEdit(ref)} title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(ref.id, ref.name)} title="Delete">
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
        <div className="plat-modal-overlay animate-fade-in" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="plat-modal" style={{ maxWidth: '450px' }}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">
                {editingId ? 'Edit Referral Source' : 'Add New Source'}
              </h2>
              <button className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="plat-modal-form">
              <div className="plat-modal-body">
                <div className="plat-form">
                  <div className="plat-form-group plat-form-full">
                    <label className="plat-form-label">Source Name *</label>
                    <input 
                      className="plat-form-input" 
                      value={form.name} 
                      onChange={e => setForm(f => ({...f, name: e.target.value}))}
                      required 
                      placeholder="e.g. Dr. Sharma, Facebook, Magazine"
                    />
                  </div>
                  <div className="plat-form-group plat-form-full">
                    <label className="plat-form-label">Classification</label>
                    <div className="plat-input-wrapper">
                      <Tag size={16} className="plat-input-icon" />
                      <input 
                        className="plat-form-input" 
                        value={form.type} 
                        onChange={e => setForm(f => ({...f, type: e.target.value}))}
                        placeholder="e.g. Professional / Advertisement"
                      />
                    </div>
                  </div>
                  <div className="plat-form-group plat-form-row">
                    <input 
                      type="checkbox" 
                      className="plat-form-input"
                      id="isActiveRef"
                      checked={form.isActive} 
                      onChange={e => setForm(f => ({...f, isActive: e.target.checked}))}
                    />
                    <label htmlFor="isActiveRef" className="plat-form-label mb-0 cursor-pointer">Source is actively used</label>
                  </div>
                </div>
              </div>
              
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createRef.isPending || updateRef.isPending}>
                  {editingId ? 'Update Source' : 'Add Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
