import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamilyGroups } from '../hooks/use-patients';
import { Search, Settings, Grid, List as ListIcon, Users as UsersIcon } from 'lucide-react';
import '../styles/patients.css';
import { Pagination } from '@/components/shared/pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
const PAGE_SIZE = 30;

export default function FamilyGroupListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const { data, isLoading } = useFamilyGroups({ page, limit: PAGE_SIZE, search: debouncedSearch });

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout((window as any).__familySearchTimer);
    (window as any).__familySearchTimer = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const families = (data?.data || []).map((f: any) => ({
    ...f,
    name: f.name ? f.name.replace(/\b\w/g, c => c.toUpperCase()) : '',
    surname: f.surname ? f.surname.replace(/\b\w/g, c => c.toUpperCase()) : ''
  }));
  const total = (data as any)?._original?.total ?? (data as any)?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="pp-page-container animate-fade-in">
      {/* Hero Header */}
      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            <UsersIcon size={22} strokeWidth={1.8} />
            Family Group Registry
          </h1>
          <p className="pp-page-hero-sub">View and manage clinical family groups and relationship links.</p>
        </div>
      </div>

      {/* Filter Card */}
      <div className="pp-filter-card">
        <div className="pp-filter-search-wrap">
          <Search size={14} />
          <input
            className="pp-filter-search-input"
            type="text"
            placeholder="Search family by head name or RegID..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="pp-filter-controls">
          <div className="appt-segmented-toggle">
            <button
              type="button"
              className={`appt-segmented-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <ListIcon size={16} /> List
            </button>
            <button
              type="button"
              className={`appt-segmented-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={16} /> Grid
            </button>
          </div>
          <button
            onClick={() => { setSearch(''); setDebouncedSearch(''); setPage(1); }}
            className="btn-secondary"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table Meta */}
      <div className="pp-table-meta-row">
        <div className="pp-table-meta-label">Family Units</div>
        <div className="pp-table-meta-stats">Showing {families.length} units of {total}</div>
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton rows={10} cols={4} />
      ) : families.length === 0 ? (
        <EmptyState 
          icon={UsersIcon}
          title={debouncedSearch ? "No matches found" : "No family groups"}
          description={debouncedSearch ? `No family units matching "${debouncedSearch}" were found.` : "Organize your patients into family units to track clinical histories together."}
          actionLabel={debouncedSearch ? "Clear Search" : "Register Patient"}
          onAction={debouncedSearch ? () => handleSearchChange('') : () => navigate('/patients/add')}
          variant="card"
          className="my-8"
        />
      ) : viewMode === 'list' ? (
        <div className="pp-table-container-enhanced">
          <div className="pp-table-scroll">
            <table className="pp-table">
              <colgroup>
                <col style={{ width: '6%' }} />
                <col style={{ width: '38%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '26%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Family Head</th>
                  <th>Head RegID</th>
                  <th>Total Members</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                 {families.map((f: any, idx: number) => (
                  <tr key={f.id} className="pp-hover-row">
                    <td data-label="#">
                      <div className="font-mono text-[11px] font-bold color-muted opacity-60">
                        {idx + 1 + (page - 1) * PAGE_SIZE}
                      </div>
                    </td>
                    <td data-label="Family Head">
                      <div className="pat-member-row">
                        <span className="appt-cell-name">{f.name} {f.surname}</span>
                      </div>
                    </td>
                    <td data-label="Head RegID">
                      <span className="pp-regid-pill">#{f.regid}</span>
                    </td>
                    <td data-label="Total Members">
                      <span className="appt-cell-muted" style={{ fontWeight: 600 }}>
                        {f.totalMembers} Members
                      </span>
                    </td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      <button onClick={() => navigate(`/patients/${f.regid}`)} className="appt-kebab-btn" aria-label="Manage group">
                        <Settings size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="pp-patient-grid">
          {families.map((f: any) => (
            <div key={f.id} className="pat-mobile-card" style={{ height: '100%' }}>
              <div className="pat-mobile-card-header">
                <div className="pat-avatar pat-avatar--md" style={{ flexShrink: 0 }}>
                  {((f.name?.[0] || f.surname?.[0] || 'F')).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="pat-mobile-card-name">{f.name} {f.surname}</div>
                  <div style={{ marginTop: 4 }}>
                    <span className="pp-regid-pill">#{f.regid}</span>
                  </div>
                </div>
              </div>

              <div className="pat-mobile-card-body" style={{ flex: 1 }}>
                <div className="pat-mobile-card-row">
                  <span className="pat-mobile-card-row-label">
                    <UsersIcon size={12} /> TOTAL MEMBERS
                  </span>
                  <span>{f.totalMembers} Members</span>
                </div>
              </div>

              <div className="pat-mobile-card-actions">
                <button onClick={() => navigate(`/patients/${f.regid}`)} className="btn-primary" style={{ flex: 1, height: 42, fontSize: '13px', justifyContent: 'center' }}>
                  <Settings size={16} /> Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={() => {}}
      />
    </div>
  );
}