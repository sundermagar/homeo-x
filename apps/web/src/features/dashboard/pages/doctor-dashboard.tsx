import { useState, useEffect, useRef, memo } from 'react';
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
  BrainCircuit,
  MessageSquare,
  Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useDashboard, dashboardKeys, useMarkReminderDone } from '../hooks/use-dashboard';
import { useQueueMgmt } from '../hooks/use-queue-mgmt';
import { useUpdateStatus, apptKeys } from '../../appointments/hooks/use-appointments';
import { apiClient } from '@/infrastructure/api-client';
import { useAuthStore } from '@/shared/stores/auth-store';
import { VitalsFormModal } from '../../medical-case/components/vitals-form-modal';
import { PatientBillingDrawer } from '../../billing/components/PatientBillingDrawer';
import type { QueueItem, IntelligenceInsight, RecentTransaction, SimpleReminder } from '@mmc/types';
import { DashboardSkeleton } from '@/components/shared/dashboard-skeleton';
import { PatientQuickChartDrawer } from '../components/patient-quick-chart-drawer';
import './role-dashboards.css';

function getWlId(item: QueueItem): number | undefined {
  return (item as any).wlId ?? (item as any).id;
}

function fmt(n: number): string {
  if (!n && n !== 0) return '₹0';
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

export function DoctorDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { data: dashData, isLoading } = useDashboard('day');
  const markReminderDone = useMarkReminderDone();
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
  const [billingDrawerRegid, setBillingDrawerRegid] = useState<{ regid: number; patientName: string } | null>(null);
  const [showQuickChart, setShowQuickChart] = useState(false);
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

    // Optimistic: find next patient and immediately set them in HUD
    const nextPatient = todayAppts
      .filter((a) => a.id !== item.id && a.status === 'Waitlist')
      .sort((a, b) => (Number(a.tokenNo) || 999) - (Number(b.tokenNo) || 999))[0];

    setActivePatientId(nextPatient?.id || null);
    setConsultationStartedAt(nextPatient ? Date.now() : null);
    setConsultDuration('00:00');

    // Optimistically update React Query cache to reflect the UI instantly
    qc.setQueryData(dashboardKeys.detail('day'), (old: any) => {
      if (!old?.queue) return old;
      const newQueue = old.queue.map((q: QueueItem) => {
        if (q.id === item.id) return { ...q, status: 'Waitlist' };
        if (nextPatient && q.id === nextPatient.id) return { ...q, status: 'Consultation' };
        return q;
      });
      // Sort to match backend logic (Consultation first)
      newQueue.sort((a: any, b: any) => {
        const order: Record<string, number> = { Consultation: 1, Confirmed: 2, Waitlist: 2, Pending: 3, Completed: 4 };
        const aOrd = order[a.status] ?? 5;
        const bOrd = order[b.status] ?? 5;
        if (aOrd !== bOrd) return aOrd - bOrd;
        return (Number(a.tokenNo) || 999) - (Number(b.tokenNo) || 999);
      });
      return { ...old, queue: newQueue };
    });

    const realWlId = (item as any).wlId;

    // Fire-and-forget: don't await the backend call
    const skipPromise = realWlId
      ? queueMgmt.skip.mutateAsync(realWlId)
      : updateStatus.mutateAsync({ id: item.id, status: 'Waitlist' }).catch(() => { });

    // Invalidate cache immediately so React Query refetches in background
    qc.invalidateQueries({ queryKey: dashboardKeys.all });
    qc.invalidateQueries({ queryKey: apptKeys.all });

    // Log errors silently
    skipPromise.catch((err) => console.error('Skip failed', err));
  };

  const handleMarkAbsent = (item: QueueItem) => {
    setIsMoreMenuOpen(false);
    // Optimistic: clear HUD immediately
    setActivePatientId(null);
    setConsultationStartedAt(null);
    setConsultDuration('00:00');

    const apptId = (item as any).visitId || item.id;
    updateStatus.mutate(
      { id: apptId, status: 'Absent' },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ['dashboard'] });
          qc.invalidateQueries({ queryKey: apptKeys.all });
        }
      }
    );
  };

  const handleCancel = (item: QueueItem) => {
    setIsMoreMenuOpen(false);
    // Optimistic: clear HUD immediately
    setActivePatientId(null);
    setConsultationStartedAt(null);
    setConsultDuration('00:00');

    const apptId = (item as any).visitId || item.id;
    updateStatus.mutate(
      { id: apptId, status: 'Cancelled' },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ['dashboard'] });
          qc.invalidateQueries({ queryKey: apptKeys.all });
        }
      }
    );
  };

  const handleReschedule = (item: QueueItem) => {
    setIsMoreMenuOpen(false);
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
      } else if (item.status === 'Pending' || item.status === 'Confirmed') {
        // If they bypass the waitlist and start directly
        await updateStatus.mutateAsync({ id: item.id, status: 'Consultation' });
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

  const handleCallNextPatient = async () => {
    const nextPatient = todayAppts.find((a) => a.status === 'Waitlist');
    if (!nextPatient) return;

    const wlId = getWlId(nextPatient);
    setActivePatientId(nextPatient.id);
    setConsultationStartedAt(Date.now());
    setConsultDuration('00:00');

    // Optimistically update React Query cache to reflect the UI instantly
    qc.setQueryData(dashboardKeys.detail('day'), (old: any) => {
      if (!old?.queue) return old;
      const newQueue = old.queue.map((q: QueueItem) => {
        if (q.id === nextPatient.id) return { ...q, status: 'Consultation' };
        return q;
      });
      return { ...old, queue: newQueue };
    });

    try {
      if (wlId) {
        await queueMgmt.callNext.mutateAsync(wlId);
      } else {
        await updateStatus.mutateAsync({ id: nextPatient.id, status: 'Consultation' });
      }
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
      qc.invalidateQueries({ queryKey: apptKeys.all });
    } catch (err) {
      console.error('Call next failed', err);
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="dash-root dd-v2-grid">
      {/* Top Row: Active Consultation & Timeline */}
      <div className="dd-v2-top-row">
        
        {/* Active Consultation Card (Green) */}
        <div className="dd-active-green">
          {activeConsultation ? (
            <>
              <div className="dd-active-green-header">
                IN YOUR ROOM · TOKEN #{activeConsultation.tokenNo || '—'}
              </div>
              <div className="dd-active-green-title">
                {activeConsultation.patientName}
              </div>
              <div className="dd-active-green-meta">
                {activeConsultation.age || '—'} Yrs {activeConsultation.gender?.charAt(0) || ''} · MRN-{activeConsultation.regid} · New case
              </div>
              <div className="dd-active-green-box">
                <strong>Chief complaint:</strong> {activeConsultation.notes || 'Routine checkup. Documented symptoms pending triage.'}
              </div>
              <div className="dd-active-green-actions">
                <button className="dd-btn-start" onClick={() => handleStartConsultation(activeConsultation)}>
                  <Zap size={16} /> Start consultation
                </button>
                <button className="dd-btn-chart" onClick={() => setShowQuickChart(true)}>
                  Open chart
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.8 }}>
              <Activity size={32} style={{ marginBottom: 16 }} />
              <div className="dd-active-green-title">No Active Patient</div>
              <div className="dd-active-green-meta">Room is currently empty</div>
            </div>
          )}
        </div>

        {/* Timeline Queue (Today) */}
        <div className="dd-timeline-card">
          <div className="dd-timeline-header">
            <div className="dd-timeline-title">Today</div>
            <div className="dd-timeline-meta">
              {todayAppts.length} · {todayAppts.filter(a => a.status === 'Waitlist').length} LEFT
            </div>
          </div>
          <div className="dd-timeline-list db-scroll">
            {todayAppts.length > 0 ? (
              todayAppts.map((a, idx) => {
                let dotClass = '';
                let statusText = '';
                if (a.status === 'Completed') { dotClass = 'seen'; statusText = 'Seen'; }
                else if (a.status === 'Waitlist' || a.status === 'Consultation') { dotClass = 'ready'; statusText = 'Ready'; }
                else { dotClass = 'booked'; statusText = `${a.bookingTime || 'Scheduled'} · booked`; }

                const isBold = a.status === 'Waitlist' || a.status === 'Consultation';

                return (
                  <div 
                    key={`${a.id}-${idx}`} 
                    className="dd-timeline-item"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleStartConsultation(a)}
                  >
                    <div className="dd-timeline-time">{a.bookingTime || '—'}</div>
                    <div className={`dd-timeline-dot ${dotClass}`} />
                    <div className="dd-timeline-content">
                      <div className={`dd-timeline-name ${isBold ? 'bold' : ''}`}>{a.patientName}</div>
                      <div className="dd-timeline-status">{statusText}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: 13 }}>
                No appointments today
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Middle Row: Quick Actions */}
      <div className="dd-v2-actions-row">
        <div 
          className="dd-action-card primary" 
          onClick={handleCallNextPatient}
        >
          <div className="dd-action-icon">
            <Zap size={20} />
          </div>
          <div className="dd-action-info">
            <div className="dd-action-title">Start consultation</div>
            <div className="dd-action-subtitle">next in queue</div>
          </div>
        </div>

        <div 
          className="dd-action-card"
          onClick={() => navigate('/clinical/ai-analysis')}
        >
          <div className="dd-action-icon">
            <BrainCircuit size={20} />
          </div>
          <div className="dd-action-info">
            <div className="dd-action-title">AI Analysis</div>
            <div className="dd-action-subtitle">smart insights</div>
          </div>
        </div>

        <div 
          className="dd-action-card"
          onClick={() => navigate(activeConsultation?.regid ? `/patients/${activeConsultation.regid}` : '/patients')}
        >
          <div className="dd-action-icon">
            <Activity size={20} />
          </div>
          <div className="dd-action-info">
            <div className="dd-action-title">Patient History</div>
            <div className="dd-action-subtitle">clinical records</div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Lists */}
      <div className="dd-v2-bottom-row">
        
        {/* Your Patients */}
        <div className="dd-list-card">
          <div className="dd-list-header">
            <div className="dd-timeline-title">Your patients</div>
            <div className="dd-timeline-meta">ASSIGNED TO YOU</div>
          </div>
          <div>
            {todayAppts.filter(a => a.doctorId === user?.id || !a.doctorId).length > 0 ? (
              todayAppts.filter(a => a.doctorId === user?.id || !a.doctorId).slice(0, 5).map(a => {
                const initials = (a.patientName || '').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                return (
                  <div key={a.id} className="dd-list-item">
                    <div className="dd-list-avatar blue">{initials}</div>
                    <div className="dd-list-info">
                      <div className="dd-list-name">{a.patientName}</div>
                      <div className="dd-list-sub">MRN-{a.regid} · {a.notes || 'Routine checkup'}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: '#94a3b8', fontSize: 13, padding: 16 }}>No patients assigned</div>
            )}
          </div>
        </div>

        {/* Prescriptions Downstream */}
        <div className="dd-list-card">
          <div className="dd-list-header">
            <div className="dd-timeline-title">Prescriptions downstream</div>
            <div className="dd-timeline-meta">HANDOFF</div>
          </div>
          <div>
            {todayAppts.filter(a => a.status === 'Completed').length > 0 ? (
              todayAppts.filter(a => a.status === 'Completed').slice(0, 5).map(a => {
                const hasRx = !!a.rxMedication;
                const pillText = hasRx ? a.rxMedication : 'reception billing';
                const pillClass = hasRx ? 'blue' : 'orange';
                const statusPill = hasRx ? (a.rxStatus || 'settled') : '';

                return (
                  <div key={a.id} className="dd-list-item">
                    <div className="dd-list-avatar blue" style={{ width: 32, height: 32, fontSize: 12 }}>
                      #{a.tokenNo || '—'}
                    </div>
                    <div className="dd-list-info">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div className="dd-list-name">{a.patientName}</div>
                        {statusPill && <div className={`dd-list-pill blue`}>{statusPill}</div>}
                      </div>
                      <div>
                        <span className={`dd-list-pill ${pillClass}`}>{pillText}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: '#94a3b8', fontSize: 13, padding: 16 }}>No downstream prescriptions</div>
            )}
          </div>
        </div>

      </div>

      {showVitalsModal && activeConsultation && (
        <VitalsFormModal
          visitId={(activeConsultation as any).visitId || activeConsultation.id}
          regid={activeConsultation.regid || activeConsultation.patientId}
          initialData={activeConsultation.vitals}
          onClose={() => setShowVitalsModal(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['dashboard'] });
            qc.invalidateQueries({ queryKey: ['appointments'] });
          }}
        />
      )}

      {billingDrawerRegid && (
        <PatientBillingDrawer
          regid={billingDrawerRegid.regid}
          patientName={billingDrawerRegid.patientName}
          isOpen={true}
          onClose={() => setBillingDrawerRegid(null)}
        />
      )}

      {showQuickChart && activeConsultation && (
        <PatientQuickChartDrawer
          isOpen={showQuickChart}
          onClose={() => setShowQuickChart(false)}
          patient={activeConsultation}
          onAddVitals={() => {
            setShowQuickChart(false);
            setShowVitalsModal(true);
          }}
        />
      )}
    </div>
  );
}

const KPIItem = memo(function KPIItem({ label, value, trend, color }: any) {
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
});

const VitalItem = memo(function VitalItem({ icon, label, value, color }: any) {
  return (
    <div className="dd-vital-item">
      <span style={{ color, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span className="text-label" style={{ fontSize: 10, margin: '0 4px' }}>{label}</span>
      <span style={{ fontWeight: 800 }}>{value}</span>
    </div>
  );
});

const IntelligenceItem = memo(function IntelligenceItem({ color, text }: any) {
  return (
    <div className="dash-intel-item">
      <div className="dash-status-dot" style={{ background: color }} />
      <div className="dash-intel-content">{text}</div>
    </div>
  );
});

const BillingItem = memo(function BillingItem({ patient, id, amount, status, onView }: any) {
  return (
    <div
      className="dash-list-item"
      style={{
        alignItems: 'center',
        padding: '12px 14px',
        borderRadius: '12px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        marginBottom: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onClick={onView}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f1f5f9';
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#f8fafc';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: '10px',
        background: '#e0f2fe', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#0284c7', fontWeight: 800, fontSize: 14, marginRight: 12
      }}>
        {patient.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{patient}</span>
        <span style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>INV-{id}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>₹{amount}</span>
          <span className={`dash-tag tag-${status.toLowerCase()}`} style={{ padding: '2px 8px', fontSize: 10, borderRadius: '4px', letterSpacing: '0.02em' }}>
            {status.toUpperCase()}
          </span>
        </div>
        <div style={{ color: '#cbd5e1' }}>
          <ChevronRight size={18} />
        </div>
      </div>
    </div>
  );
});
