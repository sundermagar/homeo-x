import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Calendar,
  Activity,
  Clock,
  Phone,
  ArrowUpRight,
  UserPlus,
  Search,
  CheckSquare,
  ChevronRight,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/use-dashboard';
import { useQueueMgmt } from '../hooks/use-queue-mgmt';
import { Pagination } from '@/components/shared/pagination';
import { DashboardSkeleton } from '@/components/shared/dashboard-skeleton';
import { PatientFormDrawer } from '../../patients/components/patient-form-drawer';
import './role-dashboards.css';

export function ReceptionistDashboard() {
  const navigate = useNavigate();
  const { data: dashData, isLoading, refetch } = useDashboard('day');
  const queueMgmt = useQueueMgmt();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [isPatientDrawerOpen, setIsPatientDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const todayAppts = dashData?.queue || [];
  const kpis = dashData?.kpis;

  // Local Search/Filter
  const [searchTerm, setSearchTerm] = useState('');
  const filteredAppts = todayAppts.filter((a: any) => 
    a.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.regid?.toString().includes(searchTerm) ||
    a.tokenNo?.toString().includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredAppts.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const currentAppts = filteredAppts.slice(startIndex, startIndex + pageSize);

  const handleAction = async (appt: any) => {
    if (appt.status === 'Scheduled') {
      await queueMgmt.checkIn.mutateAsync({ 
        appointmentId: appt.id, 
        patientId: appt.patientId || appt.regid,
        doctorId: appt.doctorId 
      });
    } else if (appt.status === 'Waitlist') {
      const waitlistId = appt.wlId || appt.id;
      await queueMgmt.callNext.mutateAsync(waitlistId);
    }
  };

  return (
    <div className="dash-root">
      {/* 1. KPI Strip */}
      <div className="dash-kpi-strip">
        <KPIItem label="Today Intake" value={kpis?.newPatientsCount || 0} trend="+12% vs avg" color="var(--pp-success-fg)" loading={isLoading} />
        <KPIItem label="Waitlist" value={todayAppts.filter(a => a.status === 'Waitlist').length} trend="Active queue" color="#d97706" loading={isLoading} />
        <KPIItem label="Collection" value={`₹${(kpis?.todaysCollection || 0).toLocaleString('en-IN')}`} trend="Today" color="var(--pp-success-fg)" loading={isLoading} />
        <KPIItem label="Completed" value={todayAppts.filter(a => a.status === 'Completed').length} trend="Visits done" color="var(--pp-blue)" loading={isLoading} />
      </div>

      <div className="dash-grid">
        {/* 2. Main Column — Schedule */}
        <div className="dash-main-col">
          <div className="dash-card">
            <div className="dash-card-header" style={{ padding: '8px 16px', minHeight: 60 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Calendar size={18} style={{ color: 'var(--pp-blue)' }} />
                <div>
                  <h3 className="dash-section-title" style={{ margin: 0 }}>Today's Schedule</h3>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--pp-text-3)', marginTop: 2 }}>{todayAppts.length} TOTAL RECORDS</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="dash-search-box" style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--pp-text-4)' }} />
                  <input 
                    type="text" 
                    placeholder="Search schedule..." 
                    className="pp-input"
                    style={{ height: 32, paddingLeft: 30, fontSize: 12, width: 180, borderRadius: 8 }}
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  />
                </div>
              </div>
            </div>

            <div className="dash-content-area">
              {isLoading ? (
                <div style={{ padding: 16 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="dash-row" style={{ border: 'none', padding: '16px 0' }}>
                      <div className="skeleton-box skeleton-circle" style={{ width: 32, height: 32 }} />
                      <div style={{ flex: 1, marginLeft: 12 }}>
                        <div className="skeleton-box skeleton-text" style={{ width: '40%', marginBottom: 8 }} />
                        <div className="skeleton-box skeleton-text" style={{ width: '20%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {!isMobile ? (
                    /* Desktop Table View */
                    <div className="pp-table-container-enhanced">
                      <div className="pp-table-scroll">
                        <table className="pp-table">
                          <thead>
                            <tr>
                              <th>TOKEN / TIME</th>
                              <th>PATIENT</th>
                              <th>STATUS</th>
                              <th style={{ textAlign: 'center' }}>ACTION</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentAppts.map((a: any, i: number) => {
                              const canCheckIn = a.status === 'Scheduled';
                              const isWaitlist = a.status === 'Waitlist';

                              return (
                                <tr key={i} className={`pp-hover-row status-${(a.status || 'pending').toLowerCase().replace(/\s+/g, '-')}`}>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      {a.tokenNo ? <div className="token-badge">{a.tokenNo}</div> : <Clock size={14} className="color-muted" />}
                                      <span className="font-mono font-semibold color-muted">{a.bookingTime || 'Walk-in'}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <div className="dash-avatar">{a.patientName?.charAt(0)}</div>
                                      <div style={{ minWidth: 0 }}>
                                        <div className="font-semibold color-main" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.patientName}</div>
                                        <div className="text-label" style={{ fontSize: 10 }}>ID: PT-{a.regid || a.id}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <span className={`dash-badge badge-${a.status === 'Consultation' ? 'success' : a.status === 'Waitlist' ? 'warning' : 'primary'}`}>
                                      {a.status}
                                    </span>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                      {canCheckIn && (
                                        <button className="dash-action-btn btn-checkin" onClick={(e) => { e.stopPropagation(); handleAction(a); }}>
                                          {queueMgmt.checkIn.isPending ? '...' : 'Check In'}
                                        </button>
                                      )}
                                      {isWaitlist && (
                                        <button className="dash-action-btn btn-call" onClick={(e) => { e.stopPropagation(); handleAction(a); }}>
                                          Call
                                        </button>
                                      )}
                                      <button className="dash-view-btn" onClick={(e) => { e.stopPropagation(); navigate(`/patients/${a.regid || a.patientId}`); }}>View</button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* Mobile Card List View */
                    <div className="pp-mobile-list">
                      {currentAppts.map((a: any, i: number) => {
                        const statusClass = `status-${(a.status || 'pending').toLowerCase().replace(/\s+/g, '-')}`;
                        
                        return (
                          <div key={i} className={`pp-mobile-card ${statusClass}`} onClick={() => navigate(`/patients/${a.regid || a.patientId}`)}>
                            <div className="pmc-header">
                              <div className="pmc-time">
                                {a.tokenNo ? <span className="pmc-token">{a.tokenNo}</span> : <Clock size={12} />}
                                <span>{a.bookingTime || 'Walk-in'}</span>
                              </div>
                                <span className={`dash-badge badge-${a.status === 'Consultation' ? 'success' : a.status === 'Waitlist' ? 'warning' : 'primary'}`}>
                                {a.status}
                              </span>
                            </div>
                            <div className="pmc-body">
                              <div className="dash-avatar">{a.patientName?.charAt(0)}</div>
                              <div className="pmc-info">
                                <div className="pmc-name">{a.patientName}</div>
                                <div className="pmc-regid">ID: PT-{a.regid || a.id}</div>
                              </div>
                              <ChevronRight size={18} className="pmc-chevron" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {filteredAppts.length > 0 && (
              <div className="dash-pagination-wrap">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredAppts.length}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </div>
        </div>

        {/* 3. Sidebar — Operations */}
        <aside className="dash-sidebar">
          <div className="dash-sidebar-card">
            <h3 className="dash-section-title">Quick Operations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <OpLink icon={<Search size={15} />} label="Registry Lookup" path="/patients" />
              <OpLink icon={<Phone size={15} />} label="Confirm Appointments" path="/appointments" />
              <OpLink icon={<CreditCard size={15} />} label="Process Payments" path="/billing" />
              <button 
                onClick={() => setIsPatientDrawerOpen(true)}
                className="hover-op"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: '#475569',
                  transition: 'all 0.15s',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <span style={{ color: 'var(--pp-blue)' }}><UserPlus size={15} /></span>
                <span style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>Add New Patient</span>
                <Plus size={13} style={{ color: '#94a3b8' }} />
              </button>
            </div>
          </div>

          <div className="dash-sidebar-card">
            <h3 className="dash-section-title">
              <Activity size={15} style={{ color: 'var(--pp-success-fg)' }} /> Live Activity
            </h3>
            <div className="dash-list">
              {todayAppts.slice(0, 6).map((a: any, i: number) => (
                <div key={i} className="dash-list-item">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{a.patientName}</div>
                    <div className="text-label" style={{ fontSize: 10 }}>{a.status} · {a.bookingTime || `Token ${a.tokenNo}`}</div>
                  </div>
                  <div className="dash-status-dot" style={{ background: a.status === 'Consultation' ? 'var(--pp-success-fg)' : '#e2e8f0' }} />
                </div>
              ))}
              {todayAppts.length === 0 && (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                  Queue clear.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <PatientFormDrawer
        isOpen={isPatientDrawerOpen}
        onClose={() => setIsPatientDrawerOpen(false)}
        onSuccess={() => {
          setIsPatientDrawerOpen(false);
          // Optional: refetch dashboard data if needed
        }}
      />
    </div>
  );
}

function KPIItem({ label, value, trend, color, loading }: any) {
  if (loading) {
    return (
      <div className="dash-kpi-item" style={{ minHeight: '110px' }}>
        <div className="skeleton-box skeleton-text" style={{ width: '40%' }} />
        <div className="skeleton-box skeleton-text title" style={{ width: '60%', margin: '12px 0' }} />
        <div className="skeleton-box skeleton-text" style={{ width: '30%', marginBottom: 0 }} />
      </div>
    );
  }
  return (
    <div className="dash-kpi-item">
      <span className="dash-kpi-label">{label}</span>
      <div className="dash-kpi-value-row">
        <span className="dash-kpi-value">{value}</span>
      </div>
      <div className="dash-kpi-trend" style={{ color }}>
        {trend}
      </div>
    </div>
  );
}

function OpLink({ icon, label, path }: any) {
  return (
    <Link to={path} style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 14px',
      background: '#f8fafc',
      border: '1px solid #f1f5f9',
      borderRadius: '8px',
      textDecoration: 'none',
      color: '#475569',
      transition: 'all 0.15s'
    }} className="hover-op">
      <span style={{ color: 'var(--pp-blue)' }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>{label}</span>
      <ArrowUpRight size={13} style={{ color: '#94a3b8' }} />
    </Link>
  );
}
