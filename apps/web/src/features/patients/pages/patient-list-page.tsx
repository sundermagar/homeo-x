import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePatients, useDeletePatient } from '../hooks/use-patients';

const PAGE_SIZE = 30;

export default function PatientListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState('newest');

  const { data, isLoading } = usePatients({ page, limit: PAGE_SIZE, search: debouncedSearch });
  const deleteMutation = useDeletePatient();

  // Debounce search
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout((window as any).__patientSearchTimer);
    (window as any).__patientSearchTimer = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const patients = useMemo(() => {
    const list = data?.data || [];
    if (sortBy === 'name') return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName));
    if (sortBy === 'oldest') return [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return list;
  }, [data?.data, sortBy]);

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const handleDelete = async (regid: number) => {
    if (!confirm('Are you sure you want to delete this patient?')) return;
    await deleteMutation.mutateAsync(regid);
  };

  return (
    <div style={{ padding: '16px', maxWidth: 1400, margin: '0 auto' }} className="page-container">
      <style>{`
        @media (min-width: 768px) {
          .page-container { padding: 32px 40px !important; }
        }
      `}</style>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }} className="title-text">Patient Registry</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Access and manage comprehensive patient health records.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'space-between' }} className="header-actions">
          <div style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <button onClick={() => setViewMode('list')} style={{ padding: '8px 12px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: viewMode === 'list' ? '#f1f5f9' : 'white', color: viewMode === 'list' ? '#0f172a' : '#94a3b8' }}>☰ List</button>
            <button onClick={() => setViewMode('grid')} style={{ padding: '8px 12px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11, background: viewMode === 'grid' ? '#f1f5f9' : 'white', color: viewMode === 'grid' ? '#0f172a' : '#94a3b8' }}>▦ Grid</button>
          </div>
          <button onClick={() => navigate('/patients/add')} style={{ height: 36, padding: '0 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
            + New Patient
          </button>
        </div>
        <style>{`
          @media (min-width: 768px) {
            .header-actions { width: auto !important; }
            .title-text { fontSize: 24px !important; }
          }
        `}</style>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: 12, padding: '16px 20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', flexWrap: 'wrap' }} className="filter-bar">
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 16 }}>🔍</span>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{ width: '100%', height: 40, border: '1px solid #e2e8f0', borderRadius: 10, padding: '0 14px 0 42px', fontSize: 13, color: '#0f172a', outline: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }} className="filter-actions">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.08em' }}>SORT</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ height: 36, border: '1px solid #e2e8f0', borderRadius: 8, padding: '0 12px', fontSize: 12, color: '#0f172a', minWidth: 130 }}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
          <button onClick={() => { setSearch(''); setDebouncedSearch(''); setSortBy('newest'); setPage(1); }} style={{ height: 36, background: 'none', border: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 14 }}>Reset</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 4px' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Registry Entries</span>
        <span style={{ fontSize: 12, color: '#64748b' }}>Showing {patients.length} of {data?.total || 0}</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
          <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⟳</div>
          <p style={{ fontWeight: 600 }}>Loading patients...</p>
        </div>
      ) : patients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8', background: 'white', border: '1px solid #e2e8f0', borderRadius: 14 }}>
          <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No patients found</p>
          <p style={{ fontSize: 14 }}>Try adjusting your search criteria</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="table-responsive" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Patient</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>RegID</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contact</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>City</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Registered</th>
                <th style={{ width: 160, padding: '14px 20px' }}></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.regid} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                        {(p.fullName?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{p.fullName || 'Unknown'}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : p.gender}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', padding: '3px 10px', borderRadius: 6, background: '#eff6ff', border: '1px solid #bfdbfe' }}>{p.regid}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#334155', fontWeight: 500 }}>{p.phone || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#334155', fontWeight: 500 }}>{p.city || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748b' }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '—'}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Link to={`/patients/${p.regid}`} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#3b82f6', textDecoration: 'none', background: 'white' }}>View</Link>
                      <Link to={`/patients/${p.regid}/edit`} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#0f172a', textDecoration: 'none', background: 'white' }}>Edit</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {patients.map(p => (
            <div key={p.regid} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s' }} onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)')} onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)')}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800 }}>
                  {(p.fullName?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{p.fullName}</div>
                  <div style={{ fontSize: 12, color: '#3b82f6', fontWeight: 700 }}>ID: {p.regid}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>CONTACT</span>
                  <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}>{p.phone || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>CITY</span>
                  <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}>{p.city || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>REGISTERED</span>
                  <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '—'}</span>
                </div>
              </div>
              <Link to={`/patients/${p.regid}`} style={{ width: '100%', height: 36, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', background: 'white', transition: 'background 0.15s' }}>View Details</Link>
            </div>
          ))}
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
