import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamilyGroups } from '../hooks/use-patients';
import { Search, Settings, Grid, List as ListIcon, Users as UsersIcon } from 'lucide-react';
import '../styles/patients.css';
import { Pagination } from '@/components/shared/pagination';
import { TableSkeleton } from '@/components/shared/table-skeleton';
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

  const families = data?.data || [];
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
        <div className="pp-empty-enhanced">
          <div className="pp-empty-icon-circle">
            <UsersIcon size={32} />
          </div>
          <p className="pp-empty-title">No family groups found</p>
          <p className="pp-empty-sub">Try adjusting your search criteria</p>
        </div>
      ) : viewMode === 'list' ? (
          <div className="pp-table-container-enhanced">
          {/* ── DESKTOP TABLE ── */}
          <div className="pat-desktop-table pp-table-scroll">
            <table className="pp-table" style={{ border: 'none', tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: '42%' }} />  {/* Family Head */}
                <col style={{ width: '22%' }} />  {/* Head RegID */}
                <col style={{ width: '26%' }} />  {/* Total Members */}
                <col style={{ width: '10%' }} />  {/* Actions — always reserved */}
              </colgroup>
              <thead>
                <tr>
                  <th>Family Head</th>
                  <th>Head RegID</th>
                  <th>Total Members</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {families.map((f: any) => (
                  <tr key={f.id} className="pp-hover-row">
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div className="pat-member-row">
                        <div className="pat-avatar pat-avatar--md">
                          {((f.name?.[0] || f.surname?.[0] || 'F')).toUpperCase()}
                        </div>
                        <span className="appt-cell-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name} {f.surname}</span>
                      </div>
                    </td>
                    <td>
                      <span className="pp-regid-pill">#{f.regid}</span>
                    </td>
                    <td>
                      <span className="appt-cell-muted" style={{ fontWeight: 600 }}>
                        {f.totalMembers} Members
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => navigate(`/patients/${f.regid}`)} className="appt-kebab-btn" aria-label="Manage group">
                        <Settings size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>



          {/* ── MOBILE CARDS ── */}
          <div className="pat-mobile-cards">
            {families.map((f: any) => (
              <div key={f.id} className="pat-mobile-card">
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

                <div className="pat-mobile-card-body">
                  <div className="pat-mobile-card-row">
                    <span className="pat-mobile-card-row-label">
                      <UsersIcon size={12} /> TOTAL MEMBERS
                    </span>
                    <span>{f.totalMembers} Members</span>
                  </div>
                </div>

                <div className="pat-mobile-card-actions">
                  <button onClick={() => navigate(`/patients/${f.regid}`)} className="btn-primary" style={{ flex: 1, height: 42, fontSize: '13px', justifyContent: 'center' }}>
                    <Settings size={16} /> Manage Family Group
                  </button>
                </div>
              </div>
            ))}
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