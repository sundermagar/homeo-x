import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamilyGroups } from '../hooks/use-patients';
import { Search, Settings, Grid, List as ListIcon } from 'lucide-react';
import '../styles/patients.css';

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
      {/* Header */}
      <div className="pp-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="text-title" style={{ fontSize: '24px' }}>Family Group Registry</h1>
          <p className="text-subtitle">View and manage clinical family groups and relationship links.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="pp-card pp-filter-bar" style={{ marginBottom: '24px', alignItems: 'center' }}>
        <div className="pat-search-wrap">
          <Search size={14} className="pat-search-icon" />
          <input
            className="pp-input pat-search-input"
            type="text"
            placeholder="Search family by head name or RegID..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="appt-view-toggle">
            <button
              type="button"
              className={`appt-view-btn${viewMode === 'list' ? ' is-active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <ListIcon size={14} /> List
            </button>
            <button
              type="button"
              className={`appt-view-btn${viewMode === 'grid' ? ' is-active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={14} /> Grid
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

      {/* Stats */}
      <div className="pat-stats-row">
        <span className="text-label">Family Units</span>
        <span className="text-small">Showing {families.length} groups of {total}</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="pp-card pat-loading-state">
          <p style={{ fontWeight: 600 }}>Loading family groups...</p>
        </div>
      ) : families.length === 0 ? (
        <div className="pp-card pat-empty-state">
          <p className="pat-empty-state-title">No family groups found</p>
          <p className="text-small">Try adjusting your search criteria</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="pp-card pp-table-scroll" style={{ padding: 0 }}>
          <table className="pp-table">
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
                <tr key={f.id} className="hover-row">
                  <td>
                    <div className="pat-member-row">
                      <div className="pat-avatar">
                        {((f.name?.[0] || f.surname?.[0] || 'F')).toUpperCase()}
                      </div>
                      <span className="pat-member-name">{f.name} {f.surname}</span>
                    </div>
                  </td>
                  <td>
                    <span className="pat-reg-badge">{f.regid}</span>
                  </td>
                  <td>
                    <span className="text-body" style={{ fontWeight: 600 }}>
                      {f.totalMembers} Members
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => navigate(`/patients/${f.regid}`)} className="btn-secondary" style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <Settings size={14} /> Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="pp-patient-grid">
          {families.map((f: any) => (
            <div key={f.id} className="pp-card pat-grid-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div>
                  <div className="pat-grid-card-name" style={{ fontSize: '16px', fontWeight: 700 }}>{f.name} {f.surname}</div>
                  <div className="text-small" style={{ marginTop: '4px' }}>Head RegID: {f.regid}</div>
                </div>
                <div className="pat-avatar pat-avatar--md">
                  {((f.name?.[0] || f.surname?.[0] || 'F')).toUpperCase()}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--pp-warm-1)', borderRadius: 12 }}>
                <div>
                  <div className="text-small">Members</div>
                  <div style={{ fontWeight: 700 }}>{f.totalMembers}</div>
                </div>
                <button onClick={() => navigate(`/patients/${f.regid}`)} className="btn-secondary" style={{ minWidth: 100 }}>
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pat-pagination">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="btn-secondary"
            style={{ opacity: page <= 1 ? 0.5 : 1 }}
          >
            Previous
          </button>
          <span className="text-small">Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="btn-secondary"
            style={{ opacity: page >= totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}