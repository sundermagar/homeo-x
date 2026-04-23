import { useState, useEffect } from 'react';
import {
  Clock, UserCheck, CheckCircle2, Users, RefreshCw, Plus, Ticket,
  ChevronRight, Activity,
} from 'lucide-react';
import { useWaitlist, useCallNext, useCompleteVisit, useTodayAppointments, useIssueToken, useAddToWaitlist } from '../hooks/use-appointments';
import { apiClient } from '@/infrastructure/api-client';
import { useAuthStore } from '@/shared/stores/auth-store';
import { VitalsFormModal } from '../../medical-case/components/vitals-form-modal';
import '../styles/appointments.css';

const WAIT_STATUS = { 0: 'Waiting', 1: 'Called', 2: 'Done' } as Record<number, string>;
const WAIT_COLOR  = { 0: 'var(--pp-warning-fg)', 1: 'var(--pp-blue)', 2: 'var(--pp-success-fg)' } as Record<number, string>;

export default function TokenQueuePage() {
  const today = new Date().toISOString().split('T')[0]!;
  const user = useAuthStore((s) => s.user);
  const rawRole = ((user as any)?.type || (user as any)?.role || (user as any)?.roleName || '').toLowerCase();
  const isDoctor = rawRole === 'doctor' || rawRole === 'medical practitioner' || ((user as any)?.name || '').toLowerCase().startsWith('dr');
  // Doctors see only their own queue automatically; admins/receptionists can choose.
  const [tab, setTab] = useState<'queue' | 'tokens'>('queue');
  const [doctorFilter, setDoctorFilter] = useState(() =>
    isDoctor ? String((user as any)?.id ?? '') : ''
  );
  const [doctors, setDoctors] = useState<any[]>([]);
  const [activeVitals, setActiveVitals] = useState<{ visitId: number, regid: number } | null>(null);

  // Keep filter in sync if user identity changes
  useEffect(() => {
    if (isDoctor) setDoctorFilter(String((user as any)?.id ?? ''));
  }, [(user as any)?.id, isDoctor]);

  useEffect(() => {
    if (!isDoctor) {
      apiClient.get('/doctors').then(({ data }) => setDoctors(Array.isArray(data) ? data : [])).catch(() => {});
    }
  }, [isDoctor]);

  const { data: waitlist = [], isLoading: wLoading, refetch: wRefetch } = useWaitlist(today, doctorFilter ? Number(doctorFilter) : undefined);
  const { data: todayAppts = [], isLoading: aLoading, refetch: aRefetch } = useTodayAppointments();

  // Filter appointments: for doctors, filter strictly by their ID or name match
  const filteredAppts = (() => {
    if (!doctorFilter) return todayAppts;
    const filterNum = Number(doctorFilter);
    const doctorUserName = ((user as any)?.name || '').toLowerCase().trim();
    return todayAppts.filter(a => {
      // Direct ID match
      if (a.doctorId === filterNum) return true;
      // Name-based fallback for legacy data
      if (isDoctor && doctorUserName && a.doctorName) {
        const aName = (a.doctorName || '').toLowerCase().trim();
        if (aName === doctorUserName || aName.includes(doctorUserName) || doctorUserName.includes(aName)) return true;
      }
      return false;
    });
  })();

  const callNext      = useCallNext();
  const completeVisit = useCompleteVisit();
  const issueToken    = useIssueToken();
  const addToWaitlist = useAddToWaitlist();

  const waiting    = waitlist.filter(w => w.status === 0);
  const inProgress = waitlist.filter(w => w.status === 1);
  const done       = waitlist.filter(w => w.status === 2);

  const withToken     = filteredAppts.filter(a => a.tokenNo);
  const withoutToken  = filteredAppts.filter(a => !a.tokenNo);

  const handleCall      = async (id: number) => { await callNext.mutateAsync(id); wRefetch(); };
  const handleComplete  = async (id: number) => { await completeVisit.mutateAsync(id); wRefetch(); aRefetch(); };
  const handleIssueToken = async (appointmentId: number) => { await issueToken.mutateAsync(appointmentId); aRefetch(); };

  return (
    <div className="appt-page">
      {/* Header */}
      <div className="appt-header">
        <div>
          <h1 className="appt-header-title">
            <Ticket size={20} strokeWidth={1.6} className="appt-panel-title-icon" />
            Token Queue
          </h1>
          <p className="appt-header-sub">Live waiting room — {today}</p>
        </div>
        <div className="appt-header-actions">
          {/* Doctors always see their own queue — show label instead of dropdown */}
          {isDoctor ? (
            <span style={{ fontSize: 13, color: 'var(--pp-muted)', padding: '0 8px' }}>
              Showing: <strong>{(user as any)?.name ?? 'My Queue'}</strong>
            </span>
          ) : (
            <select
              className="appt-filter-input"
              style={{ width: 180 }}
              value={doctorFilter}
              onChange={e => setDoctorFilter(e.target.value)}
            >
              <option value="">All Practitioners</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <button className="appt-btn appt-btn-sm" onClick={() => { wRefetch(); aRefetch(); }}>
            <RefreshCw size={14} strokeWidth={1.6} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="appt-stats-bar">
        {([
          { label: 'Waiting',       value: waiting.length,    bg: 'var(--pp-warning-bg)', ic: 'var(--pp-warning-fg)', icon: <Clock size={18} strokeWidth={1.6} /> },
          { label: 'In Progress',   value: inProgress.length, bg: 'var(--pp-purple-tint)', ic: 'var(--pp-purple)',    icon: <UserCheck size={18} strokeWidth={1.6} /> },
          { label: 'Done Today',   value: done.length,       bg: 'var(--pp-success-bg)',  ic: 'var(--pp-success-fg)', icon: <CheckCircle2 size={18} strokeWidth={1.6} /> },
          { label: 'Tokens Issued',value: withToken.length,  bg: 'var(--pp-blue-tint)',  ic: 'var(--pp-blue)',      icon: <Ticket size={18} strokeWidth={1.6} /> },
        ] as const).map(item => (
          <div key={item.label} className="appt-card">
            <div className="appt-card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="appt-stat-icon-wrap" style={{ background: item.bg, color: item.ic }}>
                {item.icon}
              </div>
              <div>
                <div className="appt-stat-label">{item.label}</div>
                <div className="appt-stat-value">{item.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="appt-tabs">
        <button className={`appt-tab ${tab === 'queue' ? 'active' : ''}`} onClick={() => setTab('queue')}>
          Live Queue ({waiting.length + inProgress.length})
        </button>
        <button className={`appt-tab ${tab === 'tokens' ? 'active' : ''}`} onClick={() => setTab('tokens')}>
          Token Management ({filteredAppts.length})
        </button>
      </div>

      {/* ─── LIVE QUEUE TAB ───────────────────────────────────────────────────── */}
      {tab === 'queue' && (
        <div>
          {/* In Progress */}
          {inProgress.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div className="appt-section-label">Now In Consultation</div>
              <div className="appt-queue-board">
                {inProgress.map(w => (
                  <div key={w.id} className="appt-token-card calling">
                    <div style={{ position: 'absolute', top: 10, right: 10 }}>
                      <span className="appt-calling-dot" />
                    </div>
                    <div className="appt-token-num">W{w.waitingNumber}</div>
                    <div className="appt-token-label">In Progress</div>
                    <div className="appt-token-patient">{w.patientName ?? `Patient #${w.patientId}`}</div>
                    {w.doctorName && <div className="appt-token-doctor">{w.doctorName}</div>}
                    <div className="appt-token-actions">
                      <button className="appt-btn appt-btn-sm appt-btn-success" onClick={() => handleComplete(w.id)} disabled={completeVisit.isPending}>
                        <CheckCircle2 size={13} strokeWidth={1.6} /> Done
                      </button>
                      <button className="appt-btn appt-btn-sm appt-btn-purple" onClick={() => setActiveVitals({ visitId: w.appointmentId || w.id, regid: w.patientId })}>
                        <Activity size={13} strokeWidth={1.6} /> Vitals
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Waiting */}
          {wLoading ? (
            <div className="appt-empty"><RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} /></div>
          ) : waiting.length === 0 && inProgress.length === 0 ? (
            <div className="appt-empty" style={{ padding: 60 }}>
              <Users size={28} className="appt-empty-icon" />
              <p className="appt-empty-text">No patients in the waiting room</p>
            </div>
          ) : (
            <>
              {waiting.length > 0 && (
                <>
                  <div className="appt-section-label">Waiting ({waiting.length})</div>
                  <div className="appt-queue-board" style={{ marginBottom: 24 }}>
                    {waiting.map(w => (
                      <div key={w.id} className="appt-token-card">
                        <div className="appt-token-num" style={{ color: WAIT_COLOR[w.status] }}>W{w.waitingNumber}</div>
                        <div className="appt-token-label" style={{ color: WAIT_COLOR[w.status] }}>{WAIT_STATUS[w.status]}</div>
                        <div className="appt-token-patient">{w.patientName ?? `Patient #${w.patientId}`}</div>
                        {w.doctorName && <div className="appt-token-doctor">{w.doctorName}</div>}
                        {w.consultationFee && <div className="appt-token-fee">₹{w.consultationFee}</div>}
                        <div className="appt-token-actions">
                          <button className="appt-btn appt-btn-sm appt-btn-primary" onClick={() => handleCall(w.id)} disabled={callNext.isPending}>
                            <ChevronRight size={13} strokeWidth={1.6} /> Call
                          </button>
                          <button className="appt-btn appt-btn-sm appt-btn-purple" onClick={() => setActiveVitals({ visitId: w.appointmentId || w.id, regid: w.patientId })}>
                            <Activity size={13} strokeWidth={1.6} /> Vitals
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Done */}
              {done.length > 0 && (
                <>
                  <div className="appt-section-label">Completed ({done.length})</div>
                  <div className="appt-queue-board">
                    {done.map(w => (
                      <div key={w.id} className="appt-token-card done">
                        <div className="appt-token-num" style={{ color: 'var(--pp-success-fg)' }}>W{w.waitingNumber}</div>
                        <div className="appt-token-label" style={{ color: 'var(--pp-success-fg)' }}>Done</div>
                        <div className="appt-token-patient">{w.patientName ?? `Patient #${w.patientId}`}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── TOKEN MANAGEMENT TAB ───────────────────────────────────────────── */}
      {tab === 'tokens' && (
        <div>
          {aLoading ? (
            <div className="appt-empty"><RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} /></div>
          ) : filteredAppts.length === 0 ? (
            <div className="appt-empty">
              <Ticket size={28} className="appt-empty-icon" />
              <p className="appt-empty-text">No appointments found {doctorFilter ? 'for this doctor' : 'today'}</p>
            </div>
          ) : (
            <div className="appt-card">
              <div className="appt-table-scroll">
                <table className="appt-table">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppts.map(a => (
                      <tr key={a.id}>
                        <td>
                          {a.tokenNo ? (
                            <span className="appt-cell-token">T{a.tokenNo}</span>
                          ) : (
                            <span className="appt-cell-slash">No token</span>
                          )}
                        </td>
                        <td>
                          <div className="appt-cell-name">{a.patientNameFromCase ?? a.patientName ?? `#${a.patientId}`}</div>
                          {a.phone && <div className="appt-cell-phone">{a.phone}</div>}
                        </td>
                        <td className="appt-cell-muted">{a.doctorName ?? '—'}</td>
                        <td className="appt-cell-muted">{a.bookingTime ?? '—'}</td>
                        <td><span className="appt-status-pill">{a.status}</span></td>
                        <td>
                          <div className="appt-row-actions">
                            {!a.tokenNo ? (
                              <button className="appt-btn appt-btn-sm appt-btn-primary" onClick={() => handleIssueToken(a.id)} disabled={issueToken.isPending}>
                                <Ticket size={12} strokeWidth={1.6} /> Issue Token
                              </button>
                            ) : (
                              <button className="appt-btn appt-btn-sm appt-btn-success" onClick={() => addToWaitlist.mutateAsync({ patientId: a.patientId!, appointmentId: a.id, doctorId: a.doctorId ?? undefined })} disabled={addToWaitlist.isPending}>
                                <Plus size={12} strokeWidth={1.6} /> Check In
                              </button>
                            )}
                            <button className="appt-btn appt-btn-sm appt-btn-purple" onClick={() => setActiveVitals({ visitId: a.id, regid: a.regid || a.patientId })}>
                              <Activity size={12} strokeWidth={1.6} /> Vitals
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeVitals && (
        <VitalsFormModal
          visitId={activeVitals.visitId}
          regid={activeVitals.regid}
          onClose={() => setActiveVitals(null)}
          onSuccess={() => { wRefetch(); aRefetch(); }}
        />
      )}
    </div>
  );
}
