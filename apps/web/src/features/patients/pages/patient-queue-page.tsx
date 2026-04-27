import { useState, useEffect } from 'react';
import {
  Clock, UserCheck, CheckCircle2, Users, RefreshCw, Ticket,
  ChevronRight, Activity
} from 'lucide-react';
import { useWaitlist, useCallNext, useCompleteVisit } from '@/features/appointments/hooks/use-appointments';
import { useAuthStore } from '@/shared/stores/auth-store';
import { apiClient } from '@/infrastructure/api-client';
import { VitalsFormModal } from '@/features/medical-case/components/vitals-form-modal';
import '@/features/appointments/styles/appointments.css';

const WAIT_STATUS = { 0: 'Waiting', 1: 'Called', 2: 'Done' } as Record<number, string>;
const WAIT_COLOR  = { 0: 'var(--pp-warning-fg)', 1: 'var(--pp-blue)', 2: 'var(--pp-success-fg)' } as Record<number, string>;

function formatWaitTime(checkedInAt: Date | string | null) {
  if (!checkedInAt) return null;
  const start = new Date(checkedInAt);
  const diff = Math.floor((new Date().getTime() - start.getTime()) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m wait`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m wait`;
}

export default function PatientQueuePage() {
  const today = new Date().toISOString().split('T')[0]!;
  const user = useAuthStore((s) => s.user);
  const rawRole = ((user as any)?.type || (user as any)?.role || (user as any)?.roleName || '').toLowerCase();
  const isDoctor = rawRole === 'doctor' || rawRole === 'medical practitioner' || ((user as any)?.name || '').toLowerCase().startsWith('dr');
  
  const [doctorFilter, setDoctorFilter] = useState(() =>
    isDoctor ? String((user as any)?.id ?? '') : ''
  );
  const [doctors, setDoctors] = useState<any[]>([]);
  const [activeVitals, setActiveVitals] = useState<{ visitId: number, regid: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isDoctor) {
      apiClient.get('/doctors').then(({ data }) => {
        const list = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        setDoctors(list);
      }).catch(() => {});
    }
  }, [isDoctor]);

  const { data: waitlist = [], isLoading: wLoading, refetch: wRefetch } = useWaitlist(today, doctorFilter ? Number(doctorFilter) : undefined);

  const callNext      = useCallNext();
  const completeVisit = useCompleteVisit();

  const waiting    = waitlist.filter(w => w.status === 0);
  const inProgress = waitlist.filter(w => w.status === 1);
  const done       = waitlist.filter(w => w.status === 2);

  const handleCall      = async (id: number) => { await callNext.mutateAsync(id); wRefetch(); };
  const handleComplete  = async (id: number) => { await completeVisit.mutateAsync(id); wRefetch(); };

  const handleStartConsult = (w: any) => {
    window.location.href = `/medical-case/entry?regid=${w.patientId}&visitId=${w.appointmentId || w.id}`;
  };

  return (
    <div className="appt-page animate-fade-in">
      {/* Header */}
      <div className="appt-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="appt-header-title">
            <Users size={22} strokeWidth={1.8} className="appt-panel-title-icon" />
            Patient Queue
          </h1>
          <p className="appt-header-sub">
            Real-time waiting room management — {today} • <span style={{ color: 'var(--pp-blue)', fontWeight: 700 }}>{currentTime.toLocaleTimeString()}</span>
          </p>
        </div>
        <div className="appt-header-actions">
          {!isDoctor && (
            <select
              className="appt-filter-input"
              style={{ width: 200 }}
              value={doctorFilter}
              onChange={e => setDoctorFilter(e.target.value)}
            >
              <option value="">All Practitioners</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <button className="appt-btn appt-btn-sm" onClick={() => wRefetch()}>
            <RefreshCw size={14} strokeWidth={1.6} /> Refresh
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="appt-stats-bar" style={{ marginBottom: '32px' }}>
        <div className="appt-card" style={{ background: 'var(--pp-warning-bg)', border: '1px solid var(--pp-warning-fg)', opacity: 0.9 }}>
          <div className="appt-card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="appt-stat-icon-wrap" style={{ background: 'var(--pp-warning-fg)', color: '#fff' }}>
              <Clock size={18} />
            </div>
            <div>
              <div className="appt-stat-label">Waiting</div>
              <div className="appt-stat-value">{waiting.length}</div>
            </div>
          </div>
        </div>
        <div className="appt-card" style={{ background: 'var(--pp-blue-tint)', border: '1px solid var(--pp-blue)', opacity: 0.9 }}>
          <div className="appt-card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="appt-stat-icon-wrap" style={{ background: 'var(--pp-blue)', color: '#fff' }}>
              <UserCheck size={18} />
            </div>
            <div>
              <div className="appt-stat-label">Consulting</div>
              <div className="appt-stat-value">{inProgress.length}</div>
            </div>
          </div>
        </div>
        <div className="appt-card" style={{ background: 'var(--pp-success-bg)', border: '1px solid var(--pp-success-fg)', opacity: 0.9 }}>
          <div className="appt-card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="appt-stat-icon-wrap" style={{ background: 'var(--pp-success-fg)', color: '#fff' }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="appt-stat-label">Completed</div>
              <div className="appt-stat-value">{done.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="appt-queue-board-wrapper">
        {/* In Progress Section */}
        {inProgress.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div className="appt-section-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={14} color="var(--pp-blue)" /> Currently in Consultation
            </div>
            <div className="appt-queue-board">
              {inProgress.map(w => (
                <div key={w.id} className="appt-token-card calling" style={{ borderLeft: '4px solid var(--pp-blue)' }}>
                  <div style={{ position: 'absolute', top: 12, right: 12 }}>
                    <span className="appt-calling-dot" />
                  </div>
                  <div className="appt-token-num">W{w.waitingNumber}</div>
                  <div className="appt-token-patient">{w.patientName ?? `Patient #${w.patientId}`}</div>
                  {w.doctorName && <div className="appt-token-doctor">{w.doctorName}</div>}
                  <div className="appt-token-actions">
                    <button className="appt-btn appt-btn-sm appt-btn-primary" onClick={() => handleStartConsult(w)}>
                      Consult
                    </button>
                    <button className="appt-btn appt-btn-sm appt-btn-success" onClick={() => handleComplete(w.id)}>
                      Finish
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waiting List */}
        <div className="appt-section-label">Waiting Queue ({waiting.length})</div>
        {wLoading ? (
          <div className="appt-empty"><RefreshCw className="spin" /></div>
        ) : waiting.length === 0 ? (
          <div className="appt-card" style={{ padding: '40px', textAlign: 'center', background: 'var(--pp-warm-1)' }}>
            <Users size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
            <p style={{ color: 'var(--pp-text-3)', fontSize: '14px' }}>The waiting room is currently empty.</p>
          </div>
        ) : (
          <div className="appt-queue-board">
            {waiting.map(w => (
              <div key={w.id} className="appt-token-card">
                <div className="appt-token-num" style={{ color: 'var(--pp-warning-fg)' }}>W{w.waitingNumber}</div>
                <div className="appt-token-patient">{w.patientName ?? `Patient #${w.patientId}`}</div>
                {w.doctorName && <div className="appt-token-doctor">{w.doctorName}</div>}
                <div style={{ fontSize: 10, color: 'var(--pp-text-3)', marginTop: 8, fontWeight: 600 }}>
                  {formatWaitTime(w.checkedInAt || w.createdAt)}
                </div>
                <div className="appt-token-actions">
                  <button className="appt-btn appt-btn-sm appt-btn-primary" onClick={() => handleCall(w.id)}>
                    Call Patient
                  </button>
                  <button 
                    className="appt-btn appt-btn-sm appt-btn-purple" 
                    onClick={() => setActiveVitals({ visitId: w.appointmentId || w.id, regid: w.patientId ?? 0 })}
                  >
                    Vitals
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeVitals && (
        <VitalsFormModal
          visitId={activeVitals.visitId}
          regid={activeVitals.regid}
          onClose={() => setActiveVitals(null)}
          onSuccess={() => wRefetch()}
        />
      )}
    </div>
  );
}
