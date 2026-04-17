import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePatients, useDeletePatient } from '../hooks/use-patients';
import { Search, Plus, List as ListIcon, Grid, Eye, Edit2, Phone, MapPin, Calendar } from 'lucide-react';
import type { PatientSummary } from '@mmc/types';
import '../../appointments/styles/appointments.css';
import '../styles/patients.css';

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

  return (
    <div className="pp-page-container animate-fade-in">
      <div className="pp-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="text-title" style={{ fontSize: '24px' }}>Patient Registry</h1>
          <p className="text-subtitle">Access and manage comprehensive patient health records.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
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
          <button className="btn-primary" onClick={() => navigate('/patients/add')}>
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
        <div className="pp-card pat-loading-state">
          <p>Loading patient records...</p>
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
                      <Link to={`/patients/${p.regid}/edit`} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid var(--pp-warm-4)', color: 'var(--pp-text-2)' }}>
                        <Edit2 size={14} />
                      </Link>
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
                  <span className="pat-grid-card-detail-label"><Phone size={12}/> Phone</span>
                  <span className="pat-grid-card-detail-value">{p.phone || '—'}</span>
                </div>
                <div className="pat-grid-card-detail-row">
                  <span className="pat-grid-card-detail-label"><MapPin size={12}/> City</span>
                  <span className="pat-grid-card-detail-value">{p.city || '—'}</span>
                </div>
                <div className="pat-grid-card-detail-row">
                  <span className="pat-grid-card-detail-label"><Calendar size={12}/> Date</span>
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
