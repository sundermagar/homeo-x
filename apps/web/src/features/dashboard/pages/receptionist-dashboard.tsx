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
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/use-dashboard';
import { useQueueMgmt } from '../hooks/use-queue-mgmt';
import './role-dashboards.css';

export function ReceptionistDashboard() {
  const navigate = useNavigate();
  const { data: dashData, isLoading } = useDashboard('day');
  const queueMgmt = useQueueMgmt();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  const todayAppts = dashData?.queue || [];
  const kpis = dashData?.kpis;

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
    return (
      <div className="dash-root" style={{ padding: '64px', textAlign: 'center', color: '#94a3b8' }}>
        <Activity className="animate-pulse" style={{ margin: '0 auto 16px', color: 'var(--primary)' }} />
        <p className="text-small">Connecting to Front-Desk Hub...</p>
      </div>
    );
  }

  return (
    <div className="dash-root">
      {/* 1. KPI Strip */}
      <div className="dash-kpi-strip">
        <KPIItem label="Today Intake" value={kpis?.newPatientsCount || 0} trend="+12% vs avg" color="#16a34a" />
        <KPIItem label="Waitlist" value={todayAppts.filter(a => a.status === 'Waitlist').length} trend="Active queue" color="#d97706" />
        <KPIItem label="Collection" value={`₹${(kpis?.todaysCollection || 0).toLocaleString('en-IN')}`} trend="Today" color="#16a34a" />
        <KPIItem label="Completed" value={todayAppts.filter(a => a.status === 'Completed').length} trend="Visits done" color="#2563eb" />
      </div>

      <div className="dash-grid">
        {/* 2. Main Column — Schedule */}
        <div className="dash-main-col">
          <div className="dash-card">
            <div className="dash-card-header">
              <h3 className="dash-section-title">
                <Calendar size={16} style={{ marginRight: 8, color: '#2563eb' }} /> Today's Schedule
              </h3>
              <span className="dash-badge badge-primary">{todayAppts.length} TOTAL</span>
            </div>

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
                <tbody className="dash-scroll">
                  {todayAppts.map((a: any, i: number) => {
                    const isExpanded = expandedId === a.id;
                    const canCheckIn = a.status === 'Scheduled';
                    const isWaitlist = a.status === 'Waitlist';

                    return (
                      <React.Fragment key={i}>
                        <tr
                          className={`hover-row ${isExpanded ? 'active-row' : ''}`}
                          onClick={() => setExpandedId(isExpanded ? null : a.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 700, color: '#64748b' }}>
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
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{a.patientName}</div>
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
                        <tr>
                          <td colSpan={4} className="expansion-details-td">
                            <div className={`expansion-content ${isExpanded ? 'open' : ''}`}>
                              <div className="expansion-grid">
                                <div>
                                  <span className="expansion-label">Contact</span>
                                  <div className="expansion-value">{a.phone || 'No phone recorded'}</div>
                                </div>
                                <div>
                                  <span className="expansion-label">Demographics</span>
                                  <div className="expansion-value">{a.age ? `${a.age} Yrs` : '--'} / {a.gender || '--'}</div>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                  <span className="expansion-label">Follow-up Notes</span>
                                  <div className="expansion-value" style={{ fontStyle: 'italic', color: '#64748b' }}>
                                    "{a.notes || 'No specific notes for this visit.'}"
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
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
              <OpLink icon={<UserPlus size={15} />} label="Add New Patient" path="/patients/add" />
            </div>
          </div>

          <div className="dash-sidebar-card">
            <h3 className="dash-section-title">
              <Activity size={15} style={{ color: '#16a34a' }} /> Live Activity
            </h3>
            <div className="dash-list">
              {todayAppts.slice(0, 6).map((a: any, i: number) => (
                <div key={i} className="dash-list-item">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{a.patientName}</div>
                    <div className="text-label" style={{ fontSize: 10 }}>{a.status} · {a.bookingTime || `Token ${a.tokenNo}`}</div>
                  </div>
                  <div className="dash-status-dot" style={{ background: a.status === 'Consultation' ? '#16a34a' : '#e2e8f0' }} />
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
      <span style={{ color: '#2563eb' }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>{label}</span>
      <ArrowUpRight size={13} style={{ color: '#94a3b8' }} />
    </Link>
  );
}
