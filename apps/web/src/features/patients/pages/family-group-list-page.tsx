import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamilyGroups } from '../hooks/use-patients';
import { Search, Settings } from 'lucide-react';

const PAGE_SIZE = 30;

export default function FamilyGroupListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useFamilyGroups({ page, limit: PAGE_SIZE, search: debouncedSearch });

  // Debounce search
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
      <div className="pp-card pp-filter-bar" style={{ marginBottom: '24px' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pp-text-3)' }} />
          <input
            className="pp-input"
            type="text"
            placeholder="Search family by head name or RegID..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>
        <button 
          onClick={() => { setSearch(''); setDebouncedSearch(''); setPage(1); }} 
          className="btn-secondary"
        >
          Reset
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span className="text-label">Family Units</span>
        <span className="text-small">Showing {families.length} groups of {total}</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="pp-card" style={{ textAlign: 'center', padding: '60px', color: 'var(--pp-text-3)' }}>
          <p style={{ fontWeight: 600 }}>Loading family groups...</p>
        </div>
      ) : families.length === 0 ? (
        <div className="pp-card" style={{ textAlign: 'center', padding: '60px', color: 'var(--pp-text-3)' }}>
          <p style={{ fontWeight: 600, color: 'var(--pp-ink)', marginBottom: '8px' }}>No family groups found</p>
          <p className="text-small">Try adjusting your search criteria</p>
        </div>
      ) : (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--pp-blue-tint)', color: 'var(--pp-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}>
                        {((f.name?.[0] || f.surname?.[0] || 'F')).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--pp-ink)' }}>{f.name} {f.surname}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="pp-mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--pp-blue)', background: 'var(--pp-blue-tint)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--pp-blue-border)' }}>
                      {f.regid}
                    </span>
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '32px', alignItems: 'center' }}>
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
