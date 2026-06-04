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
    <div className="pp-page-container animate-fade-in">

      {/* Header */}
      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            <Users size={22} strokeWidth={1.8} />
            Staff &amp; Administration
          </h1>
          <p className="pp-page-hero-sub">Manage clinical practitioners, support staff, and system administrators.</p>
        </div>
        <div className="pp-page-hero-actions">
          <div className="appt-segmented-toggle">
            <button
              type="button"
              className={`appt-segmented-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List size={14} /> List
            </button>
            <button
              type="button"
              className={`appt-segmented-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <Grid size={14} /> Grid
            </button>
          </div>
          <button
            className="btn-primary"
            onClick={() => navigate(`/staff/add?category=${activeTab}`)}
          >
            <Plus size={14} strokeWidth={1.6} />
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
      <div className="pp-filter-card" style={{ marginBottom: '24px' }}>
        <div className="pp-filter-search-wrap">
          <Search size={14} strokeWidth={1.6} />
          <input
            className="pp-filter-search-input"
            placeholder={`Search ${currentTabMeta.label.toLowerCase()}...`}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        {search && (
          <button
            className="btn-secondary"
            onClick={() => { setSearch(''); setDebouncedSearch(''); setPage(1); }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Content */}
      <div className="appt-card">
        {isLoading ? (
          <TableSkeleton rows={itemsPerPage} cols={6} />
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
          <div className="pp-table-scroll">
            <table className="pp-table">
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
                  <tr key={s.id}>
                    <td data-label="#">
                      <span className="appt-cell-id">{((page - 1) * itemsPerPage) + idx + 1}</span>
                    </td>
                    <td data-label="Profile">
                      <div className="plat-cell-val">
                        <div className="appt-cell-name">{s.name || 'Unknown'}</div>
                        <div style={{ fontSize: 10, color: s.gender === 'Female' ? '#db2777' : 'var(--pp-blue)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                          {s.gender || 'Not Specified'}
                        </div>
                      </div>
                    </td>
                    <td data-label="Contact">
                      <div className="plat-cell-val">
                        <div className="appt-cell-phone font-mono">{s.mobile || '—'}</div>
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
                        <div className="appt-cell-name font-medium text-[13px]">{s.designation || '—'}</div>
                        <div className="appt-cell-phone flex items-center gap-1 mt-0.5">
                          <MapPin size={10} /> {s.city || 'Station N/A'}
                        </div>
                      </div>
                    </td>
                    <td data-label="Status">
                      <div className="plat-cell-val">
                        <span className={s.isActive ? 'appt-badge appt-badge-done' : 'appt-badge appt-badge-absent'}>
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td data-label="Actions">
                      <div className="plat-cell-val">
                        <div className="flex gap-2">
                          <button className="btn-ghost" style={{ padding: '6px' }} onClick={() => navigate(`/staff/${s.id}/edit?category=${activeTab}`)}>
                            <Edit2 size={14} strokeWidth={1.6} />
                          </button>
                          <button className="btn-ghost" style={{ padding: '6px', color: 'var(--pp-danger-fg)' }} onClick={() => handleDelete(s.id)}>
                            <Trash2 size={14} strokeWidth={1.6} />
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
                    <div className="plat-capitalize" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>{s.name || 'Unknown'}</div>
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
