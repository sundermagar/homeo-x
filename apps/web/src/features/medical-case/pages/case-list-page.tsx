import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/shared/hooks/use-api';
import {
  Plus, Search, Filter, ChevronRight,
  MapPin, Phone, User, Calendar, Clock, Activity,
  Grid, List
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/medical-case.css';

export default function MedicalCaseListPage() {
  const api = useApi();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const { data: records, isLoading } = useQuery({
    queryKey: ['medical-cases', search, page],
    queryFn: async () => {
      const res = await api.get(`/medical-cases?search=${search}&page=${page}`);
      return res.data;
    },
  });

  return (
    <div className="mc-page">
      <header className="mc-header">
        <div>
          <h1 className="mc-title">Clinical Records</h1>
          <p className="mc-subtitle">Patient cases, longitudinal records, and clinical findings.</p>
        </div>
        <button
          onClick={() => navigate('/patients/new')}
          className="mc-btn-primary"
        >
          <Plus size={16} strokeWidth={1.6} /> New Case
        </button>
      </header>

      {/* Control Bar */}
      <div className="mc-controls">
        <div className="mc-search-wrap">
          <Search className="mc-search-icon" size={15} strokeWidth={1.6} />
          <input
            type="text"
            placeholder="Search by name, RegID, or mobile..."
            className="mc-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button className="mc-filter-btn">
            <Filter size={14} strokeWidth={1.6} /> Filters
          </button>
          <div style={{ display: 'inline-flex', border: '1px solid #e2e8f0', borderRadius: 999, overflow: 'hidden', background: 'white' }}>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{ border: 'none', borderRadius: 0, minWidth: 78, padding: '8px 12px', background: viewMode === 'list' ? '#eff6ff' : 'transparent', color: viewMode === 'list' ? '#1d4ed8' : '#64748b', cursor: 'pointer' }}
            >
              <List size={14} strokeWidth={1.6} /> List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{ border: 'none', borderRadius: 0, minWidth: 78, padding: '8px 12px', background: viewMode === 'grid' ? '#eff6ff' : 'transparent', color: viewMode === 'grid' ? '#1d4ed8' : '#64748b', cursor: 'pointer' }}
            >
              <Grid size={14} strokeWidth={1.6} /> Grid
            </button>
          </div>
          <span className="mc-count">
            {records?.total ?? 0} records
          </span>
        </div>
      </div>

      {/* Records Table */}
      {viewMode === 'list' ? (
        <div className="mc-table-wrap">
          <table className="mc-table">
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
                <tr className="mc-loading-row">
                  <td colSpan={5}>Loading records...</td>
                </tr>
              ) : !records?.data?.length ? (
                <tr className="mc-empty-row">
                  <td colSpan={5}>No records found.</td>
                </tr>
              ) : records.data.map((record: any) => (
                <tr
                  key={record.id}
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
                          <span className="mc-regid-badge">PT-{record.regid}</span>
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
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {isLoading ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 48, color: '#94a3b8' }}>Loading records...</div>
          ) : !records?.data?.length ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 48, color: '#94a3b8' }}>No records found.</div>
          ) : records.data.map((record: any) => (
            <div
              key={record.id}
              style={{ cursor: 'pointer', borderRadius: 18, border: '1px solid #e2e8f0', background: 'white', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}
              onClick={() => navigate(`/medical-cases/${record.regid}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>{record.first_name} {record.surname}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, color: '#64748b', fontSize: 13 }}>
                    <span className="mc-regid-badge" style={{ padding: '4px 8px', borderRadius: 999, background: '#f1f5f9', color: '#334155' }}>PT-{record.regid}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><User size={12} />{record.gender === 'M' ? 'Male' : 'Female'}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={12} />{record.age || '—'} yrs</span>
                  </div>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#eff6ff', display: 'grid', placeItems: 'center', color: '#2563EB', fontWeight: 800, fontSize: 16 }}>
                  {record.first_name?.[0]}{record.surname?.[0]}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 8, color: '#334155', fontSize: 13 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Phone size={13} />{record.phone || record.mobile || '—'}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><MapPin size={13} />{record.city || 'Unknown'}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Activity size={13} />{record.bp ? record.bp : 'No BP data'}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <span style={{ color: record.status !== 'Active' ? '#ef4444' : '#16a34a', fontWeight: 700 }}>{record.status || 'Active'}</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13 }}>
                  <Clock size={12} /> {record.last_followup || 'No visits yet'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
