import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/shared/hooks/use-api';
import {
  Plus, Search, Filter, ChevronRight,
  MapPin, Phone, User, Calendar, Clock, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/medical-case.css';

export default function MedicalCaseListPage() {
  const api = useApi();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="mc-filter-btn">
            <Filter size={14} strokeWidth={1.6} /> Filters
          </button>
          <span className="mc-count">
            {records?.total ?? 0} records
          </span>
        </div>
      </div>

      {/* Records Table */}
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
                <td>
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
                <td>
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
                <td>
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
                <td>
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
                <td>
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
  );
}
