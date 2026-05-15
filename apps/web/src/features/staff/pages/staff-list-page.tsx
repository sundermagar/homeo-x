import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStaffList, useDeleteStaff } from '../hooks/use-staff';
import { Grid, List, Search, Plus, UserCheck, MapPin, Phone, Edit2, Trash2, Stethoscope, Users, UserPlus, ShieldCheck, UserCog } from 'lucide-react';
import type { StaffCategory, StaffSummary } from '@mmc/types';
import { Pagination } from '@/shared/components/Pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';



const TABS: { key: StaffCategory; label: string; color: string; icon: string }[] = [
  { key: 'doctor', label: 'Doctors', color: '#0ea5e9', icon: '🩺' },
  { key: 'employee', label: 'Employees', color: '#8b5cf6', icon: '👤' },
  { key: 'receptionist', label: 'Receptionists', color: '#f59e0b', icon: '🏥' },
  { key: 'clinicadmin', label: 'Clinic Admins', color: 'var(--pp-danger-fg)', icon: '🛡️' },

];

const PAGE_SIZE = 10;

export default function StaffListPage({ defaultTab }: { defaultTab?: StaffCategory } = {}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<StaffCategory>(() =>
    (searchParams.get('tab') as StaffCategory) || defaultTab || 'doctor'
  );
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZE);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    const tab = (searchParams.get('tab') as StaffCategory) || defaultTab || 'doctor';
    setActiveTab(tab);
  }, [searchParams, defaultTab]);

  const { data, isLoading } = useStaffList(activeTab, { page, limit: itemsPerPage, search: debouncedSearch });
  const deleteMutation = useDeleteStaff();

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout((window as any).__staffSearchTimer);
    (window as any).__staffSearchTimer = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const handleTabChange = (tab: StaffCategory) => {
    setSearchParams({ tab });
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    await deleteMutation.mutateAsync({ category: activeTab, id });
  };

  const staff = data?.data || [];
  const currentTabMeta = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="plat-page fade-in">


      {/* Header */}
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <span style={{ fontSize: 20 }}>{currentTabMeta.icon}</span>
            Staff &amp; Administration
          </h1>
          <p className="plat-header-sub">Manage clinical practitioners, support staff, and system administrators.</p>
        </div>
        <div className="plat-header-actions">
          <div className="view-mode-tabs" style={{ display: 'inline-flex', border: '1px solid var(--border-main)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-card)' }}>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{ minWidth: 60, border: 'none', height: 40, background: viewMode === 'list' ? 'var(--bg-surface-2)' : 'transparent', color: viewMode === 'list' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
            >
              <List size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{ minWidth: 60, border: 'none', height: 40, background: viewMode === 'grid' ? 'var(--bg-surface-2)' : 'transparent', color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer' }}
            >
              <Grid size={16} />
            </button>
          </div>
          <button
            className="plat-btn plat-btn-primary"
            onClick={() => navigate(`/staff/add?category=${activeTab}`)}
          >
            <Plus size={14} />
            Add {currentTabMeta.label.replace(/s$/, '')}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            style={{
              padding: '10px 20px',
              borderRadius: 14,
              border: '1px solid',
              borderColor: activeTab === tab.key ? tab.color : 'var(--border-main)',
              background: activeTab === tab.key ? `${tab.color}15` : 'var(--bg-card)',
              color: activeTab === tab.key ? tab.color : 'var(--text-secondary)',
              fontWeight: 800,
              fontSize: 12.5,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: activeTab === tab.key ? `0 4px 12px ${tab.color}25` : 'none',
              transform: activeTab === tab.key ? 'translateY(-1px)' : 'none'
            }}
          >
            <span style={{ fontSize: 16 }}>{tab.icon}</span>
            <span style={{ letterSpacing: '0.02em' }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="plat-filters">
        <div className="flex gap-4 flex-1">
          <div className="plat-search-wrap">
            <Search className="plat-search-icon" size={14} />
            <input
              className="plat-form-input plat-search-input"
              placeholder={`Search ${currentTabMeta.label.toLowerCase()}...`}
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>
        <button
          className="plat-btn plat-btn-ghost plat-btn-sm"
          onClick={() => { setSearch(''); setDebouncedSearch(''); setPage(1); }}
        >
          Reset
        </button>
      </div>

      {/* Stats Summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{currentTabMeta.label} Registry</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Showing {staff.length} of {data?.total || 0}</span>
      </div>

      {/* Content */}
      <div className="plat-card">
        {isLoading ? (
          <TableSkeleton rows={itemsPerPage} columns={6} />
        ) : staff.length === 0 ? (
          <EmptyState 
            icon={
              activeTab === 'doctor' ? Stethoscope :
              activeTab === 'employee' ? Users :
              activeTab === 'receptionist' ? UserPlus :
              activeTab === 'clinicadmin' ? ShieldCheck : Users
            }
            title={`No ${currentTabMeta.label.toLowerCase()} records found.`}
            description={`Adjust your search or register a new ${currentTabMeta.label.replace(/s$/, '').toLowerCase()} in the registry.`}
            actionLabel={`Add ${currentTabMeta.label.replace(/s$/, '')}`}
            onAction={() => navigate(`/staff/add?category=${activeTab}`)}
            variant="card"
            className="my-8"
          />
        ) : viewMode === 'list' ? (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th>Identity Profile</th>
                  <th>Contact Details</th>
                  {activeTab === 'doctor' && <th style={{ width: 140 }}>Qualification</th>}
                  <th>Professional Role</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ width: 110 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s: StaffSummary, idx: number) => (
                  <tr key={s.id} className="plat-table-row">
                    <td data-label="#" className="plat-mono-data text-xs" style={{ width: 40 }}>
                      <div>{((page - 1) * itemsPerPage) + idx + 1}</div>
                    </td>
                    <td data-label="Profile">
                      <div className="plat-cell-val">
                        <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--pp-ink)' }}>{s.name || 'Unknown'}</div>
                        <div style={{ fontSize: 10, color: s.gender === 'Female' ? '#db2777' : 'var(--pp-blue)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                          {s.gender || 'Not Specified'}
                        </div>
                      </div>
                    </td>
                    <td data-label="Contact">
                      <div className="plat-cell-val">
                        <div style={{ fontSize: 13, fontWeight: 600 }} className="plat-mono-data">{s.mobile || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{s.email || '—'}</div>
                      </div>
                    </td>
                    {activeTab === 'doctor' && (
                      <td data-label="Qualification">
                        <div className="plat-cell-val">
                          <span style={{ fontSize: 10, fontWeight: 800, color: currentTabMeta.color, padding: '3px 10px', borderRadius: 8, background: `${currentTabMeta.color}15`, textTransform: 'uppercase', letterSpacing: '0.05em', border: `1px solid ${currentTabMeta.color}25` }}>
                            {s.qualification || 'N/A'}
                          </span>
                        </div>
                      </td>
                    )}
                    <td data-label="Role">
                      <div className="plat-cell-val">
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{s.designation || '—'}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: '2px' }}>
                          <MapPin size={10} /> {s.city || 'Station N/A'}
                        </div>
                      </div>
                    </td>
                    <td data-label="Status">
                      <div className="plat-cell-val">
                        <span className={s.isActive ? 'plat-badge plat-badge-info' : 'plat-badge plat-badge-default'}>
                          {s.isActive ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <UserCheck size={10} /> Active
                            </span>
                          ) : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td data-label="Actions">
                      <div className="plat-cell-val">
                        <div className="flex justify-end gap-2" style={{ width: '100%' }}>
                          <button className="plat-btn plat-btn-icon plat-btn-ghost" style={{ width: 36, height: 36, borderRadius: 10 }} onClick={() => navigate(`/staff/${s.id}/edit?category=${activeTab}`)}>
                            <Edit2 size={13} />
                          </button>
                          <button className="plat-btn plat-btn-icon plat-btn-danger" style={{ width: 36, height: 36, borderRadius: 10 }} onClick={() => handleDelete(s.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {staff.map((s: StaffSummary) => (
              <div key={s.id} style={{ padding: 24, borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border-main)', boxShadow: 'var(--pp-shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>{s.name || 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{s.designation || 'Staff Member'}</div>
                  </div>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `${currentTabMeta.color}15`, display: 'grid', placeItems: 'center', color: currentTabMeta.color, fontWeight: 800, fontSize: 18 }}>
                    {s.name?.[0]?.toUpperCase() || '?'}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <Phone size={12} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600 }} className="plat-mono-data">{s.mobile || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--bg-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      <MapPin size={12} />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.city || 'Location N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={s.isActive ? 'plat-badge plat-badge-info' : 'plat-badge plat-badge-default'}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    className="plat-btn plat-btn-ghost"
                    style={{ flex: 1, height: 40, fontSize: 12 }}
                    onClick={() => navigate(`/staff/${s.id}/edit?category=${activeTab}`)}
                  >
                    Edit Profile
                  </button>
                  <button
                    className="plat-btn plat-btn-danger"
                    style={{ flex: 1, height: 40, fontSize: 12 }}
                    onClick={() => handleDelete(s.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && staff.length > 0 && (
        <Pagination
          totalItems={data?.total || 0}
          itemsPerPage={itemsPerPage}
          currentPage={page}
          onPageChange={setPage}
          onLimitChange={setItemsPerPage}
        />
      )}
    </div>
  );
}
