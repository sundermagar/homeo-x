import React, { useState } from 'react';
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
  const { data: dashData, isLoading } = useDashboard('day');
  const queueMgmt = useQueueMgmt();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isPatientDrawerOpen, setIsPatientDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const todayAppts = dashData?.queue || [];
  const kpis = dashData?.kpis;

  const totalPages = Math.ceil(todayAppts.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const currentAppts = todayAppts.slice(startIndex, startIndex + pageSize);

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

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="dash-root">
      {/* 1. KPI Strip */}
      <div className="dash-kpi-strip">
        <KPIItem label="Today Intake" value={kpis?.newPatientsCount || 0} trend="+12% vs avg" color="var(--pp-success-fg)" />
        <KPIItem label="Waitlist" value={todayAppts.filter(a => a.status === 'Waitlist').length} trend="Active queue" color="#d97706" />
        <KPIItem label="Collection" value={`₹${(kpis?.todaysCollection || 0).toLocaleString('en-IN')}`} trend="Today" color="var(--pp-success-fg)" />
        <KPIItem label="Completed" value={todayAppts.filter(a => a.status === 'Completed').length} trend="Visits done" color="var(--pp-blue)" />
      </div>

      <div className="dash-grid">
        {/* 2. Main Column — Schedule */}
        <div className="dash-main-col">
          <div className="dash-card">
            <div className="dash-card-header">
              <h3 className="dash-section-title">
                <Calendar size={16} style={{ marginRight: 8, color: 'var(--pp-blue)' }} /> Today's Schedule
              </h3>
              <span className="dash-badge badge-primary">{todayAppts.length} TOTAL</span>
            </div>

            <div className="rd-table-wrap">
            {isMobile ? (
              <div className="pp-mobile-list">
                {currentAppts.map((a: any, i: number) => (
                  <div 
                    key={i} 
                    className={`pp-mobile-card status-${(a.status || '').toLowerCase()}`}
                    onClick={() => navigate(`/patients/${a.regid || a.patientId}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="pmc-header">
                      <div className="pmc-time">
                        <Clock size={12} /> {a.bookingTime || 'Walk-in'}
                        {a.tokenNo && <span className="pmc-token">T-{a.tokenNo}</span>}
                      </div>
                      <span className={`dash-badge badge-${(a.status || '').toLowerCase()}`}>
                        {a.status}
                      </span>
                    </div>
                    <div className="pmc-body">
                      <div className="dash-avatar">{a.patientName?.charAt(0)}</div>
                      <div className="pmc-info">
                        <div className="pmc-name">{a.patientName}</div>
                        <div className="pmc-regid">ID: PT-{a.regid || a.id}</div>
                      </div>
                      <ChevronRight size={16} className="pmc-chevron" />
                    </div>
                  </div>
                ))}
                {todayAppts.length === 0 && (
                  <div className="dash-empty-state" style={{ padding: '40px', textAlign: 'center' }}>
                    <p className="text-small">No appointments scheduled today.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="pp-table-container">
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
                        <tr key={i} className="hover-row">
                          <td style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 600, color: '#64748b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {a.tokenNo ? (
                                <div className="token-badge">{a.tokenNo}</div>
                              ) : (
                                <Clock size={14} />
                              )}
                              {a.bookingTime || 'Walk-in'}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="dash-avatar">{a.patientName?.charAt(0)}</div>
                              <div>
                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{a.patientName}</div>
                                <div className="text-label" style={{ fontSize: 10 }}>ID: PT-{a.regid || a.id}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`dash-badge badge-${a.status === 'Consultation' ? 'success' : a.status === 'Waitlist' ? 'warning' : 'primary'}`}>
                              {a.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                              {canCheckIn && (
                                <button 
                                  className="dash-action-btn btn-checkin" 
                                  onClick={(e) => { e.stopPropagation(); handleAction(a); }}
                                  disabled={queueMgmt.isLoading}
                                >
                                  {queueMgmt.checkIn.isPending ? '...' : 'Check In'}
                                </button>
                              )}
                              {isWaitlist && (
                                <button 
                                  className="dash-action-btn btn-call" 
                                  onClick={(e) => { e.stopPropagation(); handleAction(a); }}
                                  disabled={queueMgmt.isLoading}
                                >
                                  Call
                                </button>
                              )}
                              <button className="dash-view-btn" onClick={(e) => { e.stopPropagation(); navigate(`/patients/${a.regid || a.patientId}`); }}>View</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {todayAppts.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                          <p className="text-small">No appointments scheduled today.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            </div>

            {todayAppts.length > 0 && totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={todayAppts.length}
                onPageChange={setPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setPage(1);
                }}
              />
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

function KPIItem({ label, value, trend, color }: any) {
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
