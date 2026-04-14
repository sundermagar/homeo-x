import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamilyGroups } from '../hooks/use-patients';

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
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  return (
    <div style={{ padding: '16px', maxWidth: 1400, margin: '0 auto' }} className="page-container">
      <style>{`
        @media (min-width: 768px) {
          .page-container { padding: 32px 40px !important; }
        }
      `}</style>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }} className="title-text">Family Group Registry</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>View and manage clinical family groups and relationship links.</p>
        </div>
        <style>{`
          @media (min-width: 768px) {
            .title-text { fontSize: 24px !important; }
          }
        `}</style>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '16px 20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 16 }}>🔍</span>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{ width: '100%', height: 40, border: '1px solid #e2e8f0', borderRadius: 10, padding: '0 14px 0 42px', fontSize: 13, color: '#0f172a', outline: 'none' }}
          />
        </div>
        <button onClick={() => { setSearch(''); setDebouncedSearch(''); setPage(1); }} style={{ height: 36, background: 'none', border: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Reset</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 4px' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Family Units</span>
        <span style={{ fontSize: 12, color: '#64748b' }}>Showing {families.length} groups of {data?.total || 0}</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
          <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⟳</div>
          <p style={{ fontWeight: 600 }}>Loading family groups...</p>
        </div>
      ) : families.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8', background: 'white', border: '1px solid #e2e8f0', borderRadius: 14 }}>
          <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No family groups found</p>
          <p style={{ fontSize: 14 }}>Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="table-responsive" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Family Head</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Head RegID</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Members</th>
                <th style={{ width: 160, padding: '14px 20px' }}></th>
              </tr>
            </thead>
            <tbody>
              {families.map((f: any) => (
                <tr key={f.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                        {((f.name?.[0] || f.surname?.[0] || 'F')).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{f.name} {f.surname}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', padding: '3px 10px', borderRadius: 6, background: '#f0f9ff', border: '1px solid #bae6fd' }}>{f.regid}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569', fontWeight: 600 }}>
                    {f.totalMembers} Members
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <button onClick={() => navigate(`/patients/${f.regid}`)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#0284c7', cursor: 'pointer', background: 'white' }}>Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1, background: 'white', color: '#0f172a' }}>← Previous</button>
          <span style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#64748b' }}>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1, background: 'white', color: '#0f172a' }}>Next →</button>
        </div>
      )}
    </div>
  );
}
