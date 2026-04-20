import { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  Clock,
  TrendingUp,
  CreditCard,
  Users,
  MoreHorizontal,
  Calendar,
  XCircle,
  Scale,
  Thermometer,
  Heart,
  Settings,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboard } from '../hooks/use-dashboard';
import { useUpdateStatus } from '../../appointments/hooks/use-appointments';
import { useAuthStore } from '@/shared/stores/auth-store';
import { VitalsFormModal } from '../../medical-case/components/vitals-form-modal';
import './role-dashboards.css';



export function DoctorDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { data: dashData, isLoading } = useDashboard('day');
  const updateStatus = useUpdateStatus();
  const [queueFilter, setQueueFilter] = useState('ALL');
  const [consultDuration, setConsultDuration] = useState('00:00');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [isInsightsCleared, setIsInsightsCleared] = useState(false);

  const todayAppts = dashData?.queue || [];
  const activeConsultation = todayAppts.find((a: any) => a.status === 'Consultation');
  const kpis = dashData?.kpis;

  // Skip: move current patient back to Waitlist, auto-promote next Waitlist patient
  const handleSkip = async (currentId: number) => {
    setIsMoreMenuOpen(false);

    // Step 1: set current consultation patient back to Waitlist (stays in queue)
    await new Promise<void>((resolve) =>
      updateStatus.mutate(
        { id: currentId, status: 'Waitlist' },
        { onSuccess: () => resolve(), onError: () => resolve() }
      )
    );

    // Step 2: promote the next Waitlist patient to Consultation
    const nextWaiting = todayAppts.find(
      (a: any) => a.status === 'Waitlist' && a.id !== currentId
    );
    if (nextWaiting) {
      updateStatus.mutate(
        { id: nextWaiting.id, status: 'Consultation' },
        { onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard'] }) }
      );
    } else {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    }
  };

  // Mark Absent: fully removes them from today (used from … menu)
  const handleMarkAbsent = (id: number) => {
    updateStatus.mutate(
      { id, status: 'Absent' },
      { onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard'] }) }
    );
    setIsMoreMenuOpen(false);
  };

  const handleCancel = (id: number) => {
    updateStatus.mutate(
      { id, status: 'Cancelled' },
      { onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard'] }) }
    );
    setIsMoreMenuOpen(false);
  };

  const filteredAppts = todayAppts.filter((a: any) => {
    if (queueFilter === 'WAITING') return a.status === 'Waitlist';
    if (queueFilter === 'DONE') return a.status === 'Completed';
    return true;
  });

  useEffect(() => {
    if (!activeConsultation) {
      setConsultDuration('00:00');
      return;
    }
    // Guard against invalid/missing timestamps to prevent NaN:NaN
    const rawTs = activeConsultation ? (activeConsultation.updatedAt || activeConsultation.createdAt) : null;
    const parsed = rawTs ? new Date(rawTs).getTime() : NaN;
    const start = isNaN(parsed) ? Date.now() : parsed;

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setConsultDuration(`${String(Math.floor(diff / 60)).padStart(2, '0')}:${String(diff % 60).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeConsultation]);

  const handleStartConsultation = (id: number) => updateStatus.mutate({ id, status: 'Consultation' });
  const handleCompleteConsultation = (id: number) => updateStatus.mutate({ id, status: 'Completed' });

  if (isLoading) {
    return (
      <div className="dash-root" style={{ padding: '64px', textAlign: 'center', color: '#94a3b8' }}>
        <Activity className="animate-pulse" style={{ margin: '0 auto 16px', color: 'var(--primary)' }} />
        <p className="text-small">Preparing Clinical Workspace...</p>
      </div>
    );
  }

  return (
    <div className="dash-root">
      {/* 1. KPI Strip */}
      <div className="dash-kpi-strip">
        <KPIItem label="Daily Visits" value={todayAppts.length} trend={`${kpis?.patientTrend || 0}% vs yesterday`} color={Number(kpis?.patientTrend) > 0 ? '#16a34a' : '#dc2626'} />
        <KPIItem label="Collection" value={`₹${(kpis?.todaysCollection || 0).toLocaleString()}`} trend={`${kpis?.revenueTrend || 0}% vs yesterday`} color={Number(kpis?.revenueTrend) > 0 ? '#16a34a' : '#dc2626'} />
        <KPIItem label="Wait Rate" value={`${kpis?.collectionRate || 0}%`} trend="Target 95%" color="#16a34a" />
        <KPIItem label="Avg Wait" value={`${kpis?.avgWaitTime || 0}m`} trend="In queue" color="#2563eb" />
      </div>

      <div className="dash-grid">
        {/* 2. Left Column: Workspace & Queue */}
        <div className="dash-main-col">
          {/* Active Consultation HUD */}
          <div className="dd-active-head-up">
            <div className="dd-hud-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: '#15803d' }}>
                <div className="dash-pulse-dot" />
                ACTIVE CONSULTATION
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>
                DURATION <span style={{ color: '#0f172a', fontFamily: 'var(--pp-font-mono)', fontSize: 13 }}>{consultDuration}</span>
              </div>
            </div>

            <div className="dd-hud-body">
              {activeConsultation ? (
                <>
                  <div className="dd-patient-profile">
                    <h2 className="dd-patient-name-big">{activeConsultation.patientName}</h2>
                    <p className="dd-patient-meta">
                      — · {activeConsultation.age || '—'} yrs · General · {user?.name || 'Practitioner'} · PT-{activeConsultation.regid}
                    </p>

                    <div className="dd-vitals-strip" onClick={() => setShowVitalsModal(true)} style={{ cursor: 'pointer' }}>
                      <VitalItem icon={<Heart size={12} />} label="BP" value={activeConsultation.vitals?.bp || '--'} color="#ef4444" />
                      <VitalItem icon={<Scale size={12} />} label="Weight" value={activeConsultation.vitals?.weight ? `${activeConsultation.vitals.weight} kg` : '--'} color="#3b82f6" />
                      <VitalItem icon={<Thermometer size={12} />} label="Temp" value={activeConsultation.vitals?.temp ? `${activeConsultation.vitals.temp}°F` : '--'} color="#f59e0b" />
                    </div>

                    <div className="dd-hud-actions">
                      <button className="btn-primary" onClick={() => navigate(`/patients/${activeConsultation.regid}`)}>
                        <Zap size={14} fill="currentColor" /> Start Consultation
                      </button>
                      <button className="btn-secondary" style={{ color: '#16a34a', borderColor: '#16a34a' }} onClick={() => handleCompleteConsultation(activeConsultation.id)}>
                        Complete
                      </button>
                      <button className="btn-skip" onClick={() => handleSkip(activeConsultation.id)}>Skip</button>

                      <div className="dash-dropdown-container">
                        <button className="btn-more" onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}>
                          <MoreHorizontal size={18} />
                        </button>
                        {isMoreMenuOpen && (
                          <div className="dash-dropdown-menu">
                            <button className="dash-dropdown-item" onClick={() => { setIsMoreMenuOpen(false); navigate('/appointments/calendar'); }}>
                              <Calendar size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Reschedule
                            </button>
                            <button className="dash-dropdown-item danger" onClick={() => handleMarkAbsent(activeConsultation.id)}>
                              <XCircle size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Mark Absent
                            </button>
                            <button className="dash-dropdown-item danger" onClick={() => handleCancel(activeConsultation.id)}>
                              <XCircle size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Cancel Appointment
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="dd-clinical-notes">
                    <p>{activeConsultation.notes || 'Routine checkup. Documented symptoms pending triage.'}</p>
                  </div>
                </>
              ) : (
                <div style={{ gridColumn: '1 / -1', padding: '48px 0', textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                  <Activity size={32} />
                  <p className="text-small">No patient currently being seen.</p>
                  {todayAppts.filter(a => a.status === 'Waitlist').length > 0 && (
                    <button className="btn-primary" onClick={() => handleStartConsultation(todayAppts.find(a => a.status === 'Waitlist')!.id)}>Call next patient</button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Patient Queue Tabs */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3 className="dash-section-title">Patient queue</h3>
              <div style={{ display: 'flex', gap: 20 }}>
                <button className={`dash-tab-btn ${queueFilter === 'ALL' ? 'active' : ''}`} onClick={() => setQueueFilter('ALL')}>All</button>
                <button className={`dash-tab-btn ${queueFilter === 'WAITING' ? 'active' : ''}`} onClick={() => setQueueFilter('WAITING')}>Waiting</button>
                <button className={`dash-tab-btn ${queueFilter === 'DONE' ? 'active' : ''}`} onClick={() => setQueueFilter('DONE')}>Done</button>
              </div>
            </div>
            <div className="dash-card-body" style={{ padding: '0 8px' }}>
              {filteredAppts.length > 0 ? (
                filteredAppts.map((a: any) => (
                  <div key={a.id} className="dash-row" onClick={() => navigate(`/patients/${a.regid}`)} style={{ cursor: 'pointer' }}>
                    <div className="dash-avatar">T-{a.tokenNo || '—'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{a.patientName}</div>
                      <div className="text-label" style={{ fontSize: 10 }}>{a.bookingTime || 'Scheduled'} · {a.notes || 'Regular Checkup'}</div>
                    </div>
                    <span className={`dash-badge badge-${a.status === 'Consultation' ? 'success' : a.status === 'Completed' ? 'primary' : 'warning'}`}>
                      {a.status || 'Waitlist'}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '48px 0', textAlign: 'center', color: '#94a3b8' }}>
                  <Users size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <p className="text-small">{queueFilter === 'ALL' ? 'Queue view is empty today.' : `No patients in '${queueFilter.toLowerCase()}' status.`}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Right Column: Intelligence & Timeline */}
        <aside className="dash-sidebar">
          {/* Intelligence Hub */}
          <div className="dash-sidebar-card">
            <div className="dash-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Intelligence Hub</span>
              <button
                className="pp-icon-btn"
                title="Clear Insights"
                style={{ width: 24, height: 24, padding: 0, opacity: (dashData?.intelligenceInsights?.length && !isInsightsCleared) ? 1 : 0.3 }}
                onClick={() => setIsInsightsCleared(true)}
              >
                {/* <Settings size={14} /> */}
                <X size={20} strokeWidth={1.6} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(!isInsightsCleared && dashData?.intelligenceInsights?.length) ? dashData.intelligenceInsights.map((insight: any, idx: number) => (
                <IntelligenceItem key={idx} color={insight.color} text={insight.text} />
              )) : (
                <IntelligenceItem color="#22c55e" text="Clinic is running smoothly. Monitoring vital metrics..." />
              )}
            </div>
          </div>

          {/* Recent Billing */}
          <div className="dash-sidebar-card">
            <div className="dash-section-title">Recent transactions</div>
            <div className="dash-list">
              {dashData?.recentTransactions?.length ? (
                dashData.recentTransactions.map((tx: any) => (
                  <BillingItem
                    key={tx.id}
                    patient={tx.patientName}
                    id={tx.invoiceNo}
                    amount={tx.amount.toLocaleString()}
                    status={tx.status}
                  />
                ))
              ) : (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8' }}>
                  <p className="text-small">No recent transactions.</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {showVitalsModal && activeConsultation && (
        <VitalsFormModal
          visitId={activeConsultation.id}
          regid={activeConsultation.regid || activeConsultation.patientId}
          initialData={activeConsultation.vitals}
          onClose={() => setShowVitalsModal(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['dashboard'] })}
        />
      )}
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

function VitalItem({ icon, label, value, color }: any) {
  return (
    <div className="dd-vital-item">
      <span style={{ color, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span className="text-label" style={{ fontSize: 10, margin: '0 4px' }}>{label}</span>
      <span style={{ fontWeight: 800 }}>{value}</span>
    </div>
  );
}

function IntelligenceItem({ color, text }: any) {
  return (
    <div className="dash-intel-item">
      <div className="dash-status-dot" style={{ background: color }} />
      <div className="dash-intel-content">{text}</div>
    </div>
  );
}

function BillingItem({ patient, id, amount, status }: any) {
  return (
    <div className="dash-list-item">
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{patient}</span>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>{id}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 800 }}>₹{amount}</span>
        <span className={`dash-tag tag-${status}`}>{status}</span>
      </div>
    </div>
  );
}
