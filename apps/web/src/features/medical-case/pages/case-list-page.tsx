import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/shared/hooks/use-api';
import {
  Plus, Search, Filter, ChevronRight,
  MapPin, Phone, User, Calendar, Clock, Activity,
  Grid, List
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { Pagination } from '@/components/shared/pagination';
import '../styles/medical-case.css';

export default function MedicalCaseListPage() {
  const api = useApi();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const { data: records, isLoading } = useQuery({
    queryKey: ['medical-cases', search, page, pageSize],
    queryFn: async () => {
      const res = await api.get(`/medical-cases?search=${search}&page=${page}&limit=${pageSize}`);
      return res.data;
    },
  });

  return (
    <div className="mc-page">
      {/* Header */}
      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            <Activity size={22} strokeWidth={1.8} />
            Clinical Records
          </h1>
          <p className="pp-page-hero-sub">Patient cases, longitudinal records, and clinical findings.</p>
        </div>
        <div className="pp-page-hero-actions">
          <button
            onClick={() => navigate('/patients/new')}
            className="btn-primary"
          >
            <Plus size={16} strokeWidth={1.6} /> New Case
          </button>
        </div>
      </div>

      {/* Control Bar */}
      {/* Control Bar */}
      <div className="pp-filter-card">
        <div className="pp-filter-search-wrap">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search by name, RegID, or mobile..."
            className="pp-filter-search-input"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="pp-filter-controls">
          <button className="btn-secondary">
            <Filter size={14} strokeWidth={1.6} /> Filters
          </button>
          <div className="appt-segmented-toggle">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`appt-segmented-btn ${viewMode === 'list' ? 'active' : ''}`}
            >
              <List size={16} strokeWidth={1.6} /> List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`appt-segmented-btn ${viewMode === 'grid' ? 'active' : ''}`}
            >
              <Grid size={16} strokeWidth={1.6} /> Grid
            </button>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pp-text-3)' }}>
            {records?.total ?? 0} records
          </span>
        </div>
      </div>

      {/* Records Table */}
      {viewMode === 'list' ? (
        <div className="pp-table-container-enhanced">
          <div className="pp-table-scroll">
          <table className="pp-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Contacts</th>
                <th>Status</th>
                <th>Last Visit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 0 }}>
                    <TableSkeleton rows={10} columns={5} />
                  </td>
                </tr>
              ) : !records?.data?.length ? (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: 'center' }}>
                    <div className="pp-empty-enhanced" style={{ border: 'none', background: 'transparent' }}>
                      <div className="pp-empty-icon-circle">
                        <Activity size={32} />
                      </div>
                      <p className="pp-empty-title">No records found</p>
                      <p className="pp-empty-sub">Adjust your search to find clinical cases.</p>
                    </div>
                  </td>
                </tr>
              ) : records.data.map((record: any) => (
                <tr
                  key={record.id}
                  className="pp-hover-row"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/medical-cases/${record.regid}`)}
                >
                  <td data-label="Patient">
                    <div className="mc-patient-cell">
                      <div className="mc-avatar">
                        {record.first_name?.[0]}{record.surname?.[0]}
                      </div>
                      <div>
                        <div className="mc-patient-name">
                          {record.first_name} {record.surname}
                        </div>
                        <div className="mc-patient-meta">
                          <span className="pp-regid-pill">PT-{record.regid}</span>
                          <span className="mc-meta-text">
                            <User size={11} strokeWidth={1.6} />
                            {record.gender === 'M' ? 'Male' : 'Female'}
                          </span>
                          <span className="mc-meta-text">
                            <Calendar size={11} strokeWidth={1.6} />
                            {record.age || '—'} yrs
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Contacts">
                    <div className="mc-contact-cell">
                      <div className="mc-contact-row">
                        <Phone size={13} strokeWidth={1.6} style={{ color: 'var(--text-muted)' }} />
                        {record.phone || record.mobile || '—'}
                      </div>
                      <div className="mc-contact-row">
                        <MapPin size={13} strokeWidth={1.6} style={{ color: 'var(--text-muted)' }} />
                        {record.city || 'Unknown'}
                      </div>
                    </div>
                  </td>
                  <td data-label="Status">
                    <div className="mc-status-cell">
                      <div className="mc-status-row">
                        <span className={`mc-status-dot ${record.status !== 'Active' ? 'inactive' : ''}`} />
                        <span className="mc-status-label">{record.status || 'Active'}</span>
                      </div>
                      {record.bp && (
                        <div className="mc-bp-row">
                          <Activity size={10} strokeWidth={1.6} /> {record.bp}
                        </div>
                      )}
                    </div>
                  </td>
                  <td data-label="Last Visit">
                    <div className="mc-visit-cell">
                      <div className="mc-visit-icon-box">
                        <Clock size={14} strokeWidth={1.6} />
                      </div>
                      <div>
                        <div className="mc-visit-date">{record.last_followup || 'No visits yet'}</div>
                        <div className="mc-visit-track">Stable trajectory</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="" className="mc-arrow-cell">
                    <button className="mc-row-arrow">
                      <ChevronRight size={16} strokeWidth={1.6} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {isLoading ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 48, color: '#94a3b8' }}>Loading records...</div>
          ) : !records?.data?.length ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 48, color: '#94a3b8' }}>No records found.</div>
          ) : records.data.map((record: any) => (
            <div
              key={record.id}
              style={{ cursor: 'pointer', borderRadius: 18, border: '1px solid var(--border-main)', background: 'var(--bg-card)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}
              onClick={() => navigate(`/medical-cases/${record.regid}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>{record.first_name} {record.surname}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, color: '#64748b', fontSize: 13 }}>
                    <span className="pp-regid-pill">PT-{record.regid}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><User size={12} />{record.gender === 'M' ? 'Male' : 'Female'}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={12} />{record.age || '—'} yrs</span>
                  </div>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--pp-blue-tint)', display: 'grid', placeItems: 'center', color: 'var(--pp-blue)', fontWeight: 800, fontSize: 16 }}>
                  {record.first_name?.[0]}{record.surname?.[0]}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 8, color: '#334155', fontSize: 13 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Phone size={13} />{record.phone || record.mobile || '—'}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><MapPin size={13} />{record.city || 'Unknown'}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Activity size={13} />{record.bp ? record.bp : 'No BP data'}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <span style={{ color: record.status !== 'Active' ? 'var(--pp-danger-fg)' : 'var(--pp-success-fg)', fontWeight: 700 }}>{record.status || 'Active'}</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13 }}>
                  <Clock size={12} /> {record.last_followup || 'No visits yet'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {!isLoading && (records?.total ?? 0) > 0 && (
        <Pagination
          currentPage={page}
          totalPages={Math.ceil((records?.total ?? 0) / pageSize)}
          pageSize={pageSize}
          totalItems={records?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      )}
    </div>
  );
}
