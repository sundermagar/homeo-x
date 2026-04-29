import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePatients, useDeletePatient } from '../hooks/use-patients';
import { Search, Plus, List as ListIcon, Grid, Eye, Edit2, Phone, MapPin, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/shared/stores/auth-store';
import { Role, type PatientSummary } from '@mmc/types';
import { PatientFormDrawer } from '../components/patient-form-drawer';
import '../../appointments/styles/appointments.css';
import '../../dashboard/pages/role-dashboards.css';
import '../styles/patients.css';

export default function PatientListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState('newest');

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerRegid, setDrawerRegid] = useState<number | null>(null);

  const user = useAuthStore(s => s.user);
  const rawRole = ((user as any)?.type || (user as any)?.role || (user as any)?.roleName || '').toLowerCase();
  const isDoctor = rawRole === 'doctor' || rawRole === 'medical practitioner' || ((user as any)?.name || '').toLowerCase().startsWith('dr');

  const { data, isLoading } = usePatients({
    page,
    limit: pageSize,
    search: debouncedSearch,
    clinicId: (user as any)?.contextId,
    sortBy: sortBy,
    sortOrder: sortBy === 'oldest' ? 'asc' : 'desc'
  });
  const deleteMutation = useDeletePatient();

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout((window as any).__patientSearchTimer);
    (window as any).__patientSearchTimer = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const patients = data?.data || [];

  const totalPages = Math.ceil((data?.total || 0) / pageSize);
  const totalEntries = data?.total || 0;
  const fromEntry = (page - 1) * pageSize + 1;
  const toEntry = Math.min(page * pageSize, totalEntries);

  return (
    <div className="pp-page-container animate-fade-in">
      <div className="pp-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="text-title" style={{ fontSize: '24px' }}>Patient Registry</h1>
          <p className="text-subtitle">Access and manage comprehensive patient health records.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
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
          <button className="btn-primary" onClick={() => { setDrawerRegid(null); setIsDrawerOpen(true); }}>
            <Plus size={16} /> New Patient
          </button>
        </div>
      </div>

      <div className="pp-card pp-filter-bar" style={{ marginBottom: '24px' }}>
        <div className="pat-search-wrap">
          <Search size={14} className="pat-search-icon" />
          <input
            className="pp-input pat-search-input"
            type="text"
            placeholder="Search patients by name or phone..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="text-label">Sort By:</span>
          <select
            className="pp-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ minWidth: '140px' }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>
      </div>

      <div className="pat-stats-row">
        <span className="text-label">Registry Entries</span>
        <span className="text-small">Showing {patients.length} of {data?.total || 0}</span>
      </div>

      {isLoading ? (
        <div className="pp-card pp-table-scroll" style={{ padding: 0, overflow: 'hidden', border: '1px solid #f1f5f9' }}>
          <table className="pp-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {Array.from({ length: 6 }).map((_, i) => (
                  <th key={i} style={{ padding: '16px 24px', background: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
                    <div className="skeleton-box" style={{ height: '12px', width: '40px', borderRadius: '4px', opacity: 0.7, animationDelay: `${i * 0.1}s` }} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.from({ length: 6 }).map((_, colIndex) => (
                    <td key={colIndex} style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                      <div 
                        className="skeleton-box" 
                        style={{ 
                          height: '24px', 
                          width: colIndex === 0 ? '120px' : colIndex === 5 ? '40px' : '80px', 
                          borderRadius: '6px',
                          opacity: 0.8,
                          animationDelay: `${colIndex * 0.1}s`
                        }} 
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : patients.length === 0 ? (
        <div className="pp-card pat-empty-state">
          <p className="pat-empty-state-title">No patients found</p>
          <p className="text-small">Try adjusting your search filters</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="pp-card pp-table-scroll" style={{ padding: 0 }}>
          <table className="pp-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>RegID</th>
                <th>Contact</th>
                <th>City</th>
                <th>Registered</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p: PatientSummary) => (
                <tr key={p.regid} className="hover-row">
                  <td>
                    <div className="pat-member-row">
                      <div className="pat-avatar">
                        {(p.fullName?.[0] || '?').toUpperCase()}
                      </div>
                      <div>
                        <div className="pat-member-name">{p.fullName || 'Unknown'}</div>
                        <div className="text-small">{p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : p.gender}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="pp-mono" style={{ background: 'var(--pp-warm-2)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                      {p.regid}
                    </span>
                  </td>
                  <td>{p.phone || '—'}</td>
                  <td>{p.city || '—'}</td>
                  <td className="text-small">{p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <Link to={`/patients/${p.regid}`} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>
                        <Eye size={14} /> View
                      </Link>
                      <button 
                        onClick={() => { setDrawerRegid(p.regid); setIsDrawerOpen(true); }} 
                        className="btn-secondary" 
                        style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid var(--pp-warm-4)', color: 'var(--pp-text-2)' }}
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="pp-patient-grid">
          {patients.map((p: PatientSummary) => (
            <div key={p.regid} className="pp-card pat-grid-card">
              <div className="pat-grid-card-header">
                <div className="pat-avatar pat-avatar--md">
                  {(p.fullName?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <div className="pat-grid-card-name">{p.fullName}</div>
                  <div className="pat-grid-card-regid">RegID: {p.regid}</div>
                </div>
              </div>

              <div className="pat-grid-card-detail">
                <div className="pat-grid-card-detail-row">
                  <span className="pat-grid-card-detail-label"><Phone size={12} /> Phone</span>
                  <span className="pat-grid-card-detail-value">{p.phone || '—'}</span>
                </div>
                <div className="pat-grid-card-detail-row">
                  <span className="pat-grid-card-detail-label"><MapPin size={12} /> City</span>
                  <span className="pat-grid-card-detail-value">{p.city || '—'}</span>
                </div>
                <div className="pat-grid-card-detail-row">
                  <span className="pat-grid-card-detail-label"><Calendar size={12} /> Date</span>
                  <span className="pat-grid-card-detail-value">{p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '—'}</span>
                </div>
              </div>

              <Link to={`/patients/${p.regid}`} className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}

      {totalPages > 0 && (
        <div className="pat-pagination-bar">
          <div className="pat-pagination-info-wrap">
            <span className="pat-pagination-info">
              Showing {fromEntry}-{toEntry} of {totalEntries}
            </span>
            <select 
              className="pat-pagination-limit" 
              value={pageSize} 
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>

          <div className="pat-pagination-controls">
            <button 
              className="pat-pagination-btn" 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button 
                key={p} 
                className={`pat-pagination-page ${p === page ? 'is-active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}

            <button 
              className="pat-pagination-btn" 
              disabled={page === totalPages} 
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <PatientFormDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        regid={drawerRegid} 
      />
    </div>
  );
}
