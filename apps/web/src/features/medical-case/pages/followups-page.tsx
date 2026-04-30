import React, { useState, useEffect } from 'react';
import {
  Bell, Filter, RotateCw, List, LayoutGrid, MessageSquare,
  AlertCircle, CalendarClock, Search, ChevronRight, Clock,
  CheckCircle2, User, Calendar, ArrowLeft, MoreVertical
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '@/infrastructure/api-client';
import { useDoctors } from '@/features/appointments/hooks/use-doctors';
import { Pagination } from '@/components/shared/pagination';
export default function FollowupsPage() {
  const navigate = useNavigate();
  const [followups, setFollowups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [search, setSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [filters, setFilters] = useState({
    from_date: '',
    to_date: '',
    doctor_id: ''
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [totalItems, setTotalItems] = useState(0);

  const { data: doctors = [] } = useDoctors();

  useEffect(() => {
    fetchFollowups();
  }, [filters, page, pageSize]);

  const fetchFollowups = async () => {
    setLoading(true);
    try {
      const params: any = { ...filters, page, limit: pageSize };
      if (search) params.search = search;

      const res = await apiClient.get('/appointments/followups', { params });
      if (res.data?.data) {
        setFollowups(res.data.data.data || []);
        setTotalItems(res.data.data.total || res.data.data.data?.length || 0);
      }
    } catch (error) {
      console.error("Failed to load followups", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchFollowups();
  };

  const openWhatsApp = (f: any) => {
    const message = `Hello ${f.patientName}, this is a reminder regarding your follow-up visit at our clinic. Your appointment was scheduled for ${new Date(f.bookingDate).toLocaleDateString()}. Please let us know if you'd like to reschedule.`;
    const phone = f.phone ? f.phone.replace(/[^0-9]/g, '') : '';
    if (!phone) {
      alert('Mobile number not available');
      return;
    }
    window.open(`https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const missedCount = followups.filter(f => f.visitType === 'Missed').length;
  const nextVisitCount = followups.filter(f => f.visitType === 'Next Visit').length;

  return (
    <div className="pp-page-container animate-fade-in">
      {/* Header Section */}
      <header className="pp-page-header mb-8">
        <div className="flex items-center gap-4">
          {/* <button className="fu-back-btn" onClick={() => navigate(-1)} title="Go Back">
            <ArrowLeft size={18} strokeWidth={2} />
          </button> */}
          <div>
            <h1 className="text-title pp-text-gradient">Follow-up Dues</h1>
            <p className="text-subtitle">{followups.length} clinical encounters pending attention</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary" onClick={fetchFollowups}>
            <RotateCw size={14} className={loading ? 'fu-spin' : ''} />
            <span className="hide-mobile">Sync Data</span>
          </button>
        </div>
      </header>

      {/* Hero / Insights Card */}
      <section className="fu-hero-card pp-card-premium mb-8">
        <div className="fu-hero-content">
          <div className="fu-hero-icon-blob">
            <CalendarClock size={24} strokeWidth={1.5} />
          </div>
          <div className="fu-hero-text">
            <h2 className="fu-h2">Clinical Insights</h2>
            <p className="fu-p">Unified dashboard for missed appointments and scheduled next visits.</p>
          </div>
        </div>

        <div className="fu-insights-grid">
          <div className="fu-insight-item">
            <div className="fu-insight-icon total"><Bell size={18} /></div>
            <div>
              <span className="fu-insight-label">Total Pending</span>
              <span className="fu-insight-value">{followups.length}</span>
            </div>
          </div>
          <div className="fu-insight-item">
            <div className="fu-insight-icon missed"><AlertCircle size={18} /></div>
            <div>
              <span className="fu-insight-label">Missed Visits</span>
              <span className="fu-insight-value">{missedCount}</span>
            </div>
          </div>
          <div className="fu-insight-item">
            <div className="fu-insight-icon next"><CheckCircle2 size={18} /></div>
            <div>
              <span className="fu-insight-label">Upcoming</span>
              <span className="fu-insight-value">{nextVisitCount}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Action Bar */}
      <div className="fu-action-bar mb-6">
        <div className="fu-search-group">
          <Search size={18} className="fu-search-icon" />
          <form onSubmit={handleSearch} className="flex-1">
            <input
              type="text"
              className="pp-input"
              placeholder="Search by patient name or mobile..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </form>
        </div>

        <div className="flex gap-3">
          <button
            className={`btn-secondary ${isFilterOpen ? 'fu-btn-active' : ''}`}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <Filter size={16} />
            <span className="hide-mobile">Filters</span>
          </button>

          <div className="fu-toggle-group">
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              <List size={18} />
            </button>
            <button
              className={viewMode === 'card' ? 'active' : ''}
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Filter Panel */}
      {isFilterOpen && (
        <div className="pp-card mb-6 animate-fade-in" style={{ background: 'var(--pp-warm-1)' }}>
          <div className="pp-form-grid">
            <div className="fu-field">
              <label className="text-label">Practitioner</label>
              <select
                className="pp-select"
                value={filters.doctor_id}
                onChange={e => {
                  setFilters(prev => ({ ...prev, doctor_id: e.target.value }));
                  setPage(1);
                }}
              >
                <option value="">All Doctors</option>
                {doctors.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="fu-field">
              <label className="text-label">From Date</label>
              <input
                type="date"
                className="pp-input"
                value={filters.from_date}
                onChange={e => {
                  setFilters(prev => ({ ...prev, from_date: e.target.value }));
                  setPage(1);
                }}
              />
            </div>
            <div className="fu-field">
              <label className="text-label">To Date</label>
              <input
                type="date"
                className="pp-input"
                value={filters.to_date}
                onChange={e => {
                  setFilters(prev => ({ ...prev, to_date: e.target.value }));
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="fu-main">
        {loading ? (
          <div className="fu-loading-state">
            <div className="fu-loader-circle" />
            <p className="text-subtitle">Retrieving clinical records...</p>
          </div>
        ) : followups.length === 0 ? (
          <div className="fu-empty-state pp-card">
            <div className="fu-empty-icon">
              <CalendarClock size={32} strokeWidth={1} />
            </div>
            <h3 className="text-title" style={{ fontSize: '1rem', fontWeight: 600 }}>No pending follow-ups</h3>
            <p className="text-subtitle mb-4" style={{ fontSize: '0.75rem' }}>You're all caught up! No missed visits found for current criteria.</p>
            <button className="btn-secondary" onClick={() => {
              setFilters({ from_date: '', to_date: '', doctor_id: '' });
              setSearch('');
            }}>
              Reset all filters
            </button>
          </div>
        ) : (
          <div className={`animate-fade-in ${viewMode === 'list' ? 'fu-list-view' : 'fu-grid-view'}`}>
            {viewMode === 'list' ? (
              <div className="pp-table-scroll pp-card-premium" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="pp-table">
                  <thead>
                    <tr>
                      <th>Patient Details</th>
                      <th>Enc. Type</th>
                      <th>Due Date</th>
                      <th>Time</th>
                      <th>Assigned To</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {followups.map(f => (
                      <tr key={f.id} className="hover-row">
                        <td>
                          <div className="fu-patient-info">
                            <div className="fu-avatar-sm">{f.patientName?.[0]}</div>
                            <div>
                              <span className="fu-name">{f.patientName}</span>
                              <span className="fu-phone">{f.phone || 'No Contact'}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`db-badge ${f.visitType === 'Missed' ? 'db-badge-danger' : 'db-badge-success'}`}>
                            {f.visitType}
                          </span>
                        </td>
                        <td>
                          <div className="fu-meta-cell">
                            <Calendar size={12} />
                            {new Date(f.bookingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </div>
                        </td>
                        <td>
                          <div className="fu-meta-cell">
                            <Clock size={12} />
                            {f.bookingTime || '—'}
                          </div>
                        </td>
                        <td>
                          <div className="fu-meta-cell">
                            <User size={12} />
                            {f.doctorName || 'General'}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="flex justify-end gap-2">
                            <button className="fu-action-btn wa" onClick={() => openWhatsApp(f)}>
                              <MessageSquare size={14} />
                            </button>
                            <Link to={`/medical-cases/${f.patientId}`} className="fu-action-btn">
                              <ChevronRight size={14} />
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
                {followups.map(f => (
                  <div key={f.id} className="pp-card-premium fu-patient-card">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`db-badge ${f.visitType === 'Missed' ? 'db-badge-danger' : 'db-badge-success'}`}>
                        {f.visitType}
                      </span>
                      <button className="btn-ghost" style={{ padding: 2 }}><MoreVertical size={14} /></button>
                    </div>
                    <div className="flex flex-col items-center text-center mb-5">
                      <div className="fu-avatar-lg mb-3">{f.patientName?.[0]}</div>
                      <h4 className="fu-card-title">{f.patientName}</h4>
                      <p className="text-small">{f.phone || 'No mobile number'}</p>
                    </div>
                    <div className="fu-card-meta mb-5">
                      <div className="fu-meta-row">
                        <Calendar size={14} />
                        <span>{new Date(f.bookingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="fu-meta-row">
                        <Clock size={14} />
                        <span>{f.bookingTime || 'Flexible Time'}</span>
                      </div>
                      <div className="fu-meta-row">
                        <User size={14} />
                        <span>{f.doctorName || 'General Practitioner'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-secondary flex-1" onClick={() => openWhatsApp(f)} style={{ fontSize: '12px' }}>
                        <MessageSquare size={14} /> Reminder
                      </button>
                      <Link to={`/medical-cases/${f.patientId}`} className="btn-primary flex-1" style={{ fontSize: '12px' }}>
                        View Files
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {totalItems > 0 && Math.ceil(totalItems / pageSize) > 1 && (
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(totalItems / pageSize)}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
        />
      )}

      <style>{`
        .fu-back-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid var(--pp-warm-4);
          background: var(--bg-card);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--pp-text-2);
          cursor: pointer;
          transition: all 0.2s;
        }
        .fu-back-btn:hover {
          background: var(--pp-warm-2);
          border-color: var(--pp-blue-border);
          color: var(--pp-blue);
        }

        .text-title { font-size: 1.5rem !important; }
        .text-subtitle { font-size: 0.8rem !important; }

        /* Hero Insights - Fully Responsive & Premium */
        .fu-hero-card {
          padding: clamp(16px, 4vw, 24px);
          display: flex;
          flex-direction: column;
          gap: 24px;
          background: var(--bg-card);
          position: relative;
          overflow: hidden;
          border-radius: 20px;
        }
        .fu-hero-card::before {
          content: '';
          position: absolute;
          top: 0; right: 0;
          width: 250px; height: 250px;
          background: radial-gradient(circle at top right, var(--pp-blue-tint) 0%, transparent 70%);
          z-index: 0;
          pointer-events: none;
        }
        .fu-hero-content {
          display: flex;
          align-items: center;
          gap: clamp(12px, 3vw, 20px);
          position: relative;
          z-index: 1;
        }
        .fu-hero-icon-blob {
          flex-shrink: 0;
          width: clamp(40px, 10vw, 48px);
          height: clamp(40px, 10vw, 48px);
          background: var(--pp-blue);
          color: white;
          border-radius: clamp(12px, 3vw, 18px);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.15);
        }
        .fu-h2 { font-size: clamp(1.1rem, 3vw, 1.25rem); font-weight: 700; color: var(--pp-ink); margin: 0; }
        .fu-p { color: var(--pp-text-3); font-size: clamp(0.75rem, 2vw, 0.85rem); margin-top: 4px; line-height: 1.4; }

        .fu-insights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: clamp(12px, 3vw, 20px);
          position: relative;
          z-index: 1;
          width: 100%;
        }
        .fu-insight-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--pp-warm-1);
          padding: clamp(10px, 2vw, 14px);
          border-radius: 12px;
          border: 1px solid var(--pp-warm-2);
          transition: all 0.2s ease;
        }
        .fu-insight-item:hover {
          transform: translateY(-2px);
          box-shadow: var(--pp-shadow-sm);
          background: white;
          border-color: var(--pp-blue-border);
        }
        .fu-insight-icon {
          flex-shrink: 0;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .fu-insight-icon.total { background: #eff6ff; color: #2563eb; }
        .fu-insight-icon.missed { background: #fef2f2; color: #dc2626; }
        .fu-insight-icon.next { background: #f0fdf4; color: #16a34a; }
        
        .fu-insight-label { display: block; font-size: 9px; font-weight: 700; color: var(--pp-text-3); text-transform: uppercase; letter-spacing: 0.05em; }
        .fu-insight-value { display: block; font-size: clamp(1.1rem, 3vw, 1.25rem); font-weight: 800; color: var(--pp-ink); line-height: 1; margin-top: 2px; }

        /* Action Bar */
        .fu-action-bar {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .fu-search-group {
          flex: 1;
          display: flex;
          align-items: center;
          position: relative;
        }
        .fu-search-icon {
          position: absolute;
          left: 14px;
          color: var(--pp-text-4);
          pointer-events: none;
        }
        .fu-search-group .pp-input {
          padding-left: 44px;
          height: 44px;
          border-radius: 12px;
        }
        .fu-btn-active {
          border-color: var(--pp-blue) !important;
          background: var(--pp-blue-tint) !important;
          color: var(--pp-blue) !important;
        }

        .fu-toggle-group {
          display: flex;
          background: var(--pp-warm-3);
          padding: 3px;
          border-radius: 10px;
        }
        .fu-toggle-group button {
          width: 38px;
          height: 38px;
          border: none;
          background: transparent;
          border-radius: 7px;
          color: var(--pp-text-3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .fu-toggle-group button.active {
          background: var(--bg-card);
          color: var(--pp-blue);
          box-shadow: var(--pp-shadow-sm);
        }

        /* List View */
        .fu-patient-info { display: flex; align-items: center; gap: 12px; }
        .fu-avatar-sm {
          width: 32px; height: 32px;
          background: var(--pp-warm-3);
          color: var(--pp-text-2);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 12px;
        }
        .fu-name { display: block; font-weight: 600; color: var(--pp-ink); font-size: 13px; }
        .fu-phone { display: block; font-size: 11px; color: var(--pp-text-3); }
        .fu-meta-cell { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--pp-text-2); }
        .fu-meta-cell svg { color: var(--pp-text-4); }

        .fu-action-btn {
          width: 32px; height: 32px;
          border-radius: 6px;
          border: 1px solid var(--pp-warm-4);
          background: var(--bg-card);
          display: flex; align-items: center; justify-content: center;
          color: var(--pp-text-2);
          transition: all 0.2s;
        }
        .fu-action-btn:hover { background: var(--pp-warm-2); color: var(--pp-blue); border-color: var(--pp-blue-border); }
        .fu-action-btn.wa:hover { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }

        /* Card View */
        .fu-patient-card { padding: 24px; position: relative; }
        .fu-avatar-lg {
          width: 64px; height: 64px;
          background: linear-gradient(135deg, var(--pp-warm-2) 0%, var(--pp-warm-3) 100%);
          color: var(--pp-blue);
          border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 1.5rem;
          border: 4px solid var(--bg-card);
          box-shadow: var(--pp-shadow-sm);
        }
        .fu-card-title { font-size: 1.1rem; font-weight: 700; color: var(--pp-ink); margin: 0; }
        .fu-card-meta {
          background: var(--pp-warm-1);
          border-radius: 12px;
          padding: 12px;
          border: 1px solid var(--pp-warm-2);
        }
        .fu-meta-row { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--pp-text-2); }
        .fu-meta-row:not(:last-child) { margin-bottom: 8px; }
        .fu-meta-row svg { color: var(--pp-text-4); }

        /* Loading & Empty */
        .fu-loading-state { padding: 100px 0; text-align: center; }
        .fu-loader-circle {
          width: 32px; height: 32px;
          border: 3px solid var(--pp-warm-3);
          border-top-color: var(--pp-blue);
          border-radius: 50%;
          margin: 0 auto 16px;
          animation: fu-spin 0.8s linear infinite;
        }
        .fu-empty-state { padding: 60px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; }
        .fu-empty-icon {
          width: 64px; height: 64px;
          background: var(--pp-warm-2);
          color: var(--pp-text-4);
          border-radius: 24px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 24px;
        }

        @keyframes fu-spin { to { transform: rotate(360deg); } }
        .fu-spin { animation: fu-spin 1s linear infinite; }

        @media (min-width: 860px) {
          .fu-action-bar { flex-direction: row; }
          .fu-hero-card { flex-direction: row; justify-content: space-between; align-items: center; }
          .fu-insights-grid { width: auto; min-width: 500px; }
        }
        
        @media (max-width: 480px) {
          .fu-insights-grid { grid-template-columns: 1fr; }
          .fu-hero-content { align-items: flex-start; }
          .fu-hero-icon-blob { margin-top: 4px; }
        }
        
        @media (max-width: 639px) {
          .fu-list-view { display: none; }
        }
      `}</style>
    </div>
  );
}
