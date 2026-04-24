import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStaffList, useDeleteStaff } from '../hooks/use-staff';
import { Grid, List } from 'lucide-react';
import type { StaffCategory, StaffSummary } from '@mmc/types';

const TABS: { key: StaffCategory; label: string; color: string; icon: string }[] = [
  { key: 'doctor', label: 'Doctors', color: '#0ea5e9', icon: '🩺' },
  { key: 'employee', label: 'Employees', color: '#8b5cf6', icon: '👤' },
  { key: 'receptionist', label: 'Receptionists', color: '#f59e0b', icon: '🏥' },
  { key: 'clinicadmin', label: 'Clinic Admins', color: '#ef4444', icon: '🛡️' },
  { key: 'account', label: 'Account Mgrs', color: '#10b981', icon: '💼' },
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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    const tab = (searchParams.get('tab') as StaffCategory) || defaultTab || 'doctor';
    setActiveTab(tab);
  }, [searchParams, defaultTab]);

  const { data, isLoading } = useStaffList(activeTab, { page, limit: PAGE_SIZE, search: debouncedSearch });
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
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);
  const currentTabMeta = TABS.find((t) => t.key === activeTab)!;

  return (
    <div style={{ padding: '16px', maxWidth: 1400, margin: '0 auto' }} className="page-container">
      <style>{`
        @media (min-width: 768px) {
          .page-container { padding: 32px 40px !important; }
        }
        .staff-tab { transition: all 0.2s; cursor: pointer; }
        .staff-tab:hover { transform: translateY(-1px); }
        .staff-row:hover { background: var(--bg-surface-2) !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px' }}>Staff & Administration</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Manage clinical practitioners, support staff, and system administrators.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', border: '1px solid #e2e8f0', borderRadius: 999, overflow: 'hidden', background: 'var(--bg-card)' }}>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{ minWidth: 76, border: 'none', borderRadius: 0, padding: '10px 14px', background: viewMode === 'list' ? '#eff6ff' : 'transparent', color: viewMode === 'list' ? currentTabMeta.color : '#64748b', fontWeight: 700, cursor: 'pointer' }}
            >
              <List size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{ minWidth: 76, border: 'none', borderRadius: 0, padding: '10px 14px', background: viewMode === 'grid' ? '#eff6ff' : 'transparent', color: viewMode === 'grid' ? currentTabMeta.color : '#64748b', fontWeight: 700, cursor: 'pointer' }}
            >
              <Grid size={14} />
            </button>
          </div>
          <button
            onClick={() => navigate(`/staff/add?category=${activeTab}`)}
            style={{
              height: 38, padding: '0 20px', borderRadius: 10, border: 'none',
              background: `linear-gradient(135deg, ${currentTabMeta.color} 0%, ${currentTabMeta.color}dd 100%)`,
              color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: `0 4px 12px ${currentTabMeta.color}30`
            }}
          >
            + Add {currentTabMeta.label.replace(/s$/, '')}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: 12, padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid #e2e8f0', borderRadius: 14, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 16 }}>🔍</span>
          <input
            type="text"
            placeholder={`Search ${currentTabMeta.label.toLowerCase()}...`}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{ width: '100%', height: 40, border: '1px solid var(--border)', borderRadius: 10, padding: '0 14px 0 42px', fontSize: 13, color: 'var(--text-main)', outline: 'none', background: 'var(--bg-card)' }}
          />
        </div>
        <button
          onClick={() => { setSearch(''); setDebouncedSearch(''); setPage(1); }}
          style={{ height: 40, background: 'none', border: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          Reset
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 4px' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{currentTabMeta.label}</span>
        <span style={{ fontSize: 12, color: '#64748b' }}>Showing {staff.length} of {data?.total || 0}</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
          <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⟳</div>
          <p style={{ fontWeight: 600 }}>Loading {currentTabMeta.label.toLowerCase()}...</p>
        </div>
      ) : staff.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8', background: 'var(--bg-card)', border: '1px solid #e2e8f0', borderRadius: 14 }}>
          <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No {currentTabMeta.label.toLowerCase()} found</p>
          <p style={{ fontSize: 14 }}>Add your first {currentTabMeta.label.toLowerCase().replace(/s$/, '')} to get started.</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="table-responsive card" style={{ background: 'var(--bg-card)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 11, fontWeight: 800, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.08em', width: 50 }}>#</th>
                <th style={{ textAlign: 'left', padding: '14px 20px', fontSize: 11, fontWeight: 800, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 11, fontWeight: 800, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contact</th>
                {activeTab === 'doctor' && (
                  <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 11, fontWeight: 800, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Qualification</th>
                )}
                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 11, fontWeight: 800, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Designation</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 11, fontWeight: 800, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</th>
                <th style={{ width: 140, padding: '14px 20px' }}></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s: StaffSummary, idx: number) => (
                <tr key={s.id} className="staff-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                  <td style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>
                    {((page - 1) * PAGE_SIZE) + idx + 1}
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: `linear-gradient(135deg, ${currentTabMeta.color}15, ${currentTabMeta.color}25)`,
                        color: currentTabMeta.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 800, flexShrink: 0
                      }}>
                        {(s.name?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>{s.name || 'Unknown'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{s.gender === 'M' || s.gender === 'Male' ? 'Male' : s.gender === 'F' || s.gender === 'Female' ? 'Female' : s.gender}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{s.mobile || '—'}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.email || '—'}</div>
                  </td>
                  {activeTab === 'doctor' && (
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: currentTabMeta.color, padding: '3px 10px', borderRadius: 6, background: `${currentTabMeta.color}12` }}>
                        {s.qualification || 'N/A'}
                      </span>
                    </td>
                  )}
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#334155', fontWeight: 500 }}>{s.designation || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                      background: s.isActive ? '#dcfce7' : '#fee2e2',
                      color: s.isActive ? '#16a34a' : '#ef4444',
                    }}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => navigate(`/staff/${s.id}/edit?category=${activeTab}`)}
                        style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#0f172a', cursor: 'pointer', background: 'var(--bg-card)' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #fee2e2', fontSize: 12, fontWeight: 700, color: '#ef4444', cursor: 'pointer', background: '#fef2f2' }}
                      >
                        Remove
                      </button>
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
            <div key={s.id} style={{ padding: 20, borderRadius: 18, background: 'var(--bg-card)', border: '1px solid #e2e8f0', boxShadow: '0 4px 18px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>{s.name || 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{s.designation || '—'}</div>
                </div>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: `linear-gradient(135deg, ${currentTabMeta.color}15, ${currentTabMeta.color}25)`, display: 'grid', placeItems: 'center', color: currentTabMeta.color, fontWeight: 800, fontSize: 16 }}>
                  {s.name?.[0]?.toUpperCase() || '?'}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 10, margin: '18px 0' }}>
                <div style={{ fontSize: 13, color: '#334155' }}><strong>Contact:</strong> {s.mobile || '—'}</div>
                <div style={{ fontSize: 13, color: '#334155' }}><strong>Email:</strong> {s.email || '—'}</div>
                {activeTab === 'doctor' && (
                  <div style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}><strong>Qualification:</strong> <span style={{ color: currentTabMeta.color }}>{s.qualification || 'N/A'}</span></div>
                )}
                <div style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}><strong>Status:</strong> <span style={{ fontWeight: 700, color: s.isActive ? '#16a34a' : '#ef4444' }}>{s.isActive ? 'Active' : 'Inactive'}</span></div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate(`/staff/${s.id}/edit?category=${activeTab}`)}
                  style={{ flex: 1, minWidth: 0, padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#0f172a', cursor: 'pointer', background: 'var(--bg-card)' }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  style={{ flex: 1, minWidth: 0, padding: '10px 14px', borderRadius: 10, border: '1px solid #fee2e2', fontSize: 12, fontWeight: 700, color: '#ef4444', cursor: 'pointer', background: '#fef2f2' }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1, background: 'var(--bg-card)', color: '#0f172a' }}>← Previous</button>
          <span style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#64748b' }}>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1, background: 'var(--bg-card)', color: '#0f172a' }}>Next →</button>
        </div>
      )}
    </div>
  );
}
