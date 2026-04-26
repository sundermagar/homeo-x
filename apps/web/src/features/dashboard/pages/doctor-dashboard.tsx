import { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Zap,
  Users,
  MoreHorizontal,
  Calendar,
  XCircle,
  Scale,
  Thermometer,
  Heart,
  X,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboard } from '../hooks/use-dashboard';
import { useQueueMgmt } from '../hooks/use-queue-mgmt';
import { useUpdateStatus, apptKeys } from '../../appointments/hooks/use-appointments';
import { apiClient } from '@/infrastructure/api-client';
import { useAuthStore } from '@/shared/stores/auth-store';
import { VitalsFormModal } from '../../medical-case/components/vitals-form-modal';
import type { QueueItem, IntelligenceInsight, RecentTransaction } from '@mmc/types';
import './role-dashboards.css';

function getWlId(item: QueueItem): number | undefined {
  return (item as any).wlId ?? (item as any).id;
}

export function DoctorDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { data: dashData, isLoading } = useDashboard('day');
  const updateStatus = useUpdateStatus();
  const [queueFilter, setQueueFilter] = useState('ALL');
  const [consultDuration, setConsultDuration] = useState('00:00');
  const [consultationStartedAt, setConsultationStartedAt] = useState<number | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showIntelligence, setShowIntelligence] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // Tracks the appointment ID of the patient we most recently called into consultation
  const [activePatientId, setActivePatientId] = useState<number | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isMoreMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isMoreMenuOpen]);

  const todayAppts = (dashData?.queue || []) as QueueItem[];
  // Prefer the patient we explicitly called last; fall back to the first Consultation patient
  const activeConsultation = activePatientId
    ? (todayAppts.find((a) => a.id === activePatientId) ?? todayAppts.find((a) => a.status === 'Consultation'))
    : todayAppts.find((a) => a.status === 'Consultation');
  const kpis = dashData?.kpis;

  // Use the queue management hook to ensure Waitlist state syncs correctly
  const queueMgmt = useQueueMgmt();

  // Skip: sends current patient back to Waitlist, then calls the next waiting patient
  const handleSkip = async (item: QueueItem) => {
    setIsMoreMenuOpen(false);
    setConsultationStartedAt(null);
    setConsultDuration('00:00');
    try {
      const today = new Date().toISOString().split('T')[0]!;

      // 1. Fetch the live waitlist to get REAL waitlist entry IDs
      const res = await apiClient.get<{ success: boolean; data: any[] }>(
        `/appointments/waiting?date=${today}`
      );
      const liveWaitlist: any[] = res.data.data ?? [];

      // 2. Find THIS patient's waitlist entry (match by appointmentId or patientId)
      const currentEntry = liveWaitlist.find(
        (w) => w.appointmentId === item.id || w.patientId === (item as any).patientId
      );

      if (currentEntry) {
        // 3. Skip using the CORRECT waitlist entry ID
        await queueMgmt.skip.mutateAsync(currentEntry.id);

        // 4. Also reset the appointment status so Token Queue shows it as Waiting
        try {
          await updateStatus.mutateAsync({ id: item.id, status: 'Waitlist' });
        } catch { /* best-effort */ }
      }

      // 5. Fetch fresh waitlist again after the skip
      const res2 = await apiClient.get<{ success: boolean; data: any[] }>(
        `/appointments/waiting?date=${today}`
      );
      const freshWaitlist: any[] = res2.data.data ?? [];

      // 6. Find next waiting patient — exclude the one we just skipped
      const skippedId = currentEntry?.id;
      const nextEntry = freshWaitlist.find((w) => w.status === 0 && w.id !== skippedId);
      if (nextEntry) {
        await queueMgmt.callNext.mutateAsync(nextEntry.id);
        setActivePatientId(nextEntry.appointmentId ?? nextEntry.id);
      } else {
        setActivePatientId(null);
      }

      // 7. Refresh dashboard
      await qc.refetchQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: apptKeys.all });
    } catch (err) {
      console.error('Skip failed', err);
    }
  };

  const handleMarkAbsent = (item: QueueItem) => {
    updateStatus.mutate(
      { id: item.id, status: 'Absent' },
      { onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['dashboard'] });
        qc.invalidateQueries({ queryKey: apptKeys.all });
      }}
    );
    setIsMoreMenuOpen(false);
  };

  const handleCancel = (item: QueueItem) => {
    updateStatus.mutate(
      { id: item.id, status: 'Cancelled' },
      { onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['dashboard'] });
        qc.invalidateQueries({ queryKey: apptKeys.all });
      }}
    );
    setIsMoreMenuOpen(false);
  };

  const handleReschedule = (item: QueueItem) => {
    setIsMoreMenuOpen(false);
    // Navigate to appointments with pre-filled patient info
    navigate(`/appointments/calendar?patient=${item.regid || item.patientId}`);
  };

  const filteredAppts = todayAppts.filter((a) => {
    if (queueFilter === 'WAITING') return a.status === 'Waitlist';
    if (queueFilter === 'DONE') return a.status === 'Completed';
    return true;
  });

  useEffect(() => {
    if (!activeConsultation) {
      setConsultDuration('00:00');
      setConsultationStartedAt(null);
      return;
    }
    // Use the exact time Start Consultation was clicked (stored in state).
    // Fall back to now (so it starts at 00:00) if no recorded start time.
    const start = consultationStartedAt ?? Date.now();

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setConsultDuration(`${String(Math.floor(diff / 60)).padStart(2, '0')}:${String(diff % 60).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeConsultation, consultationStartedAt]);

  const handleStartConsultation = async (item: QueueItem) => {
    const wlId = getWlId(item);
    const appointmentId = item.id;

    setConsultationStartedAt(Date.now()); // Record exact click time
    setConsultDuration('00:00');          // Reset display immediately
    setActivePatientId(item.id);          // Pin the HUD to this patient

    try {
      // Only run the queue transition for patients still in Waitlist.
      // Re-calling callNext on an already-Consultation patient would be a no-op
      // at best, and could conflict at worst.
      if (item.status === 'Waitlist' && wlId) {
        await queueMgmt.callNext.mutateAsync(wlId);
        qc.invalidateQueries({ queryKey: ['dashboard'] });
        qc.invalidateQueries({ queryKey: apptKeys.all });
      }

      // Enter the full-screen consultation workspace.
      // appointment.id IS the visit id (consultations.router persists soap_notes
      // and prescriptions keyed on appointments.id).
      navigate(`/consultation/${appointmentId}`);
    } catch (err) {
      console.error('Start consultation failed', err);
    }
  };

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
      <div className="dash-header">
        <h1 className="dash-title">Clinical Workspace</h1>
        <p className="dash-subtitle">Real-time patient queue and diagnostic insights</p>
      </div>

      {/* 1. KPI Strip */}
      <div className="dash-kpi-strip">
        <KPIItem label="Daily Visits" value={todayAppts.length} trend={`${kpis?.patientTrend || 0}% vs yesterday`} color="var(--pp-blue)" />
        <KPIItem label="Collection" value={`₹${(kpis?.todaysCollection || 0).toLocaleString()}`} trend={`${kpis?.revenueTrend || 0}% vs yesterday`} color="var(--pp-blue)" />
        <KPIItem label="Wait Rate" value={`${kpis?.collectionRate || 0}%`} trend="Target 95%" color="var(--pp-blue)" />
        <KPIItem label="Avg Wait" value={`${kpis?.avgWaitTime || 0}m`} trend="In queue" color="var(--pp-blue)" />
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
                DURATION <span style={{ color: 'var(--pp-ink)', fontFamily: 'var(--pp-font-mono)', fontSize: 13 }}>{consultDuration}</span>
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
                      <button className="btn-primary" onClick={() => handleStartConsultation(activeConsultation)}>
                        <Zap size={14} fill="currentColor" /> Start Consultation
                      </button>
                      <button className="btn-skip" onClick={() => handleSkip(activeConsultation)}>Skip</button>

                      <div className="dash-dropdown-container" ref={moreMenuRef}>
                        <button className="btn-more" onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}>
                          <MoreHorizontal size={18} />
                        </button>
                        {isMoreMenuOpen && (
                          <div className="dash-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                            <button className="dash-dropdown-item" onClick={() => handleReschedule(activeConsultation)}>
                              <Calendar size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Reschedule
                            </button>
                            <button className="dash-dropdown-item danger" onClick={() => handleMarkAbsent(activeConsultation)}>
                              <XCircle size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} /> Mark Absent
                            </button>
                            <button className="dash-dropdown-item danger" onClick={() => handleCancel(activeConsultation)}>
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
                    <button className="btn-primary" onClick={() => handleStartConsultation(todayAppts.find(a => a.status === 'Waitlist')!)}>Call next patient</button>
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
                filteredAppts.map((a, idx) => {
                  const isExpanded = expandedId === a.id;
                  return (
                    <div key={`${a.id}-${idx}`}>
                      <div 
                        className={`dash-row ${isExpanded ? 'active' : ''}`} 
                        onClick={() => setExpandedId(isExpanded ? null : a.id)} 
                        style={{ cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                          <div className="dash-avatar">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pp-ink)' }}>{a.patientName}</div>
                            <div className="text-label" style={{ fontSize: 10 }}>{a.bookingTime || 'Scheduled'} · Token {a.tokenNo || '—'}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {a.status === 'Waitlist' && (
                            <button
                              className="dash-view-btn"
                              title="Start Consultation"
                              onClick={(e) => { e.stopPropagation(); handleStartConsultation(a); }}
                            >
                              Call
                            </button>
                          )}
                          <span className={`dash-badge badge-${a.status === 'Consultation' ? 'success' : a.status === 'Completed' ? 'primary' : 'warning'}`}>
                            {a.status || 'Waitlist'}
                          </span>
                        </div>
                      </div>
                      
                      <div className={`dash-row-details ${isExpanded ? 'expanded' : ''}`}>
                        <div className="details-inner">
                           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                              <div>
                                <div className="text-label" style={{ fontSize: 9, textTransform: 'uppercase', marginBottom: 4 }}>Clinical Notes</div>
                                <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                                  {a.notes || 'Routine follow-up. No specific symptoms recorded at registration.'}
                                </div>
                              </div>
                              <div style={{ paddingLeft: 16, borderLeft: '1px solid var(--pp-warm-2)' }}>
                                <div className="text-label" style={{ fontSize: 9, textTransform: 'uppercase', marginBottom: 4 }}>Patient Info</div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pp-ink)' }}>PT-{a.regid}</div>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                  {a.age || '--'} Yrs · {a.gender || '--'}
                                </div>
                                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                                  <button className="pp-link" onClick={(e) => { e.stopPropagation(); navigate(`/patients/${a.regid}`); }}>View Profile</button>
                                  {(a.status === 'Waitlist' || a.status === 'Consultation') && (
                                    <button
                                      className="pp-link"
                                      style={{ color: 'var(--pp-blue)' }}
                                      onClick={(e) => { e.stopPropagation(); handleStartConsultation(a); }}
                                    >
                                      {a.status === 'Consultation' ? 'Enter Consult' : 'Start Consult'}
                                    </button>
                                  )}
                                </div>
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  );
                })
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
          {showIntelligence && (
            <div className="dash-sidebar-card">
              <div className="dash-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Intelligence Hub</span>
                <button
                  className="pp-icon-btn"
                  title="Dismiss Intelligence"
                  style={{ width: 24, height: 24, padding: 0 }}
                  onClick={() => setShowIntelligence(false)}
                >
                  <X size={20} strokeWidth={1.6} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {dashData?.intelligenceInsights?.length ? (dashData.intelligenceInsights as IntelligenceInsight[]).map((insight, idx) => (
                  <IntelligenceItem key={idx} color={insight.color} text={insight.text} />
                )) : (
                  <IntelligenceItem color="#22c55e" text="Clinic is running smoothly. Monitoring vital metrics..." />
                )}
              </div>
            </div>
          )}

          {/* Recent Billing */}
          <div className="dash-sidebar-card">
            <div className="dash-section-title">Recent transactions</div>
            <div className="dash-list">
              {dashData?.recentTransactions?.length ? (
                (dashData.recentTransactions as RecentTransaction[]).map((tx) => (
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
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['dashboard'] });
            qc.invalidateQueries({ queryKey: ['appointments'] });
          }}
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
  const isPaid = status === 'paid' || status === 'completed' || status === 'Success';
  const isPartial = status === 'partial';
  const badgeClass = isPaid ? 'badge-success' : isPartial ? 'badge-warning' : 'badge-danger';
  const displayStatus = isPaid ? 'Paid' : isPartial ? 'Partial' : 'Due';

  return (
    <div className="dash-list-item">
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, paddingRight: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pp-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{patient}</span>
        <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'var(--pp-font-mono)' }}>{id}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--pp-ink)', opacity: 0.7 }}>₹</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--pp-ink)', fontFamily: 'var(--pp-font-mono)' }}>{amount}</span>
        </div>
        <span className={`dash-badge ${badgeClass}`}>{displayStatus}</span>
      </div>
    </div>
  );
}
