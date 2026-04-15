import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, UserCheck, CheckCircle2, Users, RefreshCw, Plus, Ticket, ChevronRight, Stethoscope } from 'lucide-react';
import { useWaitlist, useCallNext, useCompleteVisit, useTodayAppointments, useIssueToken, useAddToWaitlist } from '../hooks/use-appointments';
import { apiClient } from '@/infrastructure/api-client';
import '../styles/appointments.css';

const WAIT_STATUS = { 0: 'Waiting', 1: 'Called', 2: 'Done' } as Record<number, string>;
const WAIT_COLOR  = { 0: '#D97706', 1: '#2563EB', 2: '#16A34A' } as Record<number, string>;
const WAIT_BG     = { 0: '#FFFBEB', 1: '#EFF6FF', 2: '#F0FDF4' } as Record<number, string>;

export default function TokenQueuePage() {
  const today = new Date().toISOString().split('T')[0]!;
  const [tab, setTab] = useState<'queue' | 'tokens'>('queue');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get('/doctors').then(({ data }) => setDoctors(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const { data: waitlist = [], isLoading: wLoading, refetch: wRefetch } = useWaitlist(today, doctorFilter ? Number(doctorFilter) : undefined);
  const { data: todayAppts = [], isLoading: aLoading, refetch: aRefetch } = useTodayAppointments();

  const filteredAppts = doctorFilter 
    ? todayAppts.filter(a => a.doctorId === Number(doctorFilter))
    : todayAppts;

  const callNext     = useCallNext();
  const completeVisit = useCompleteVisit();
  const issueToken   = useIssueToken();
  const addToWaitlist = useAddToWaitlist();
  const navigate = useNavigate();

  const waiting    = waitlist.filter(w => w.status === 0);
  const inProgress = waitlist.filter(w => w.status === 1);
  const done       = waitlist.filter(w => w.status === 2);

  const withToken    = filteredAppts.filter(a => a.tokenNo);
  const withoutToken = filteredAppts.filter(a => !a.tokenNo);

  const handleCall = async (id: number) => {
    await callNext.mutateAsync(id);
    wRefetch();
  };

  const handleComplete = async (id: number) => {
    await completeVisit.mutateAsync(id);
    wRefetch();
    aRefetch();
  };

  const handleIssueToken = async (appointmentId: number) => {
    await issueToken.mutateAsync(appointmentId);
    aRefetch();
  };

  return (
    <div className="appt-page">
      {/* Header */}
      <div className="appt-header">
        <div>
          <h1 className="appt-header-title">
            <Ticket size={20} strokeWidth={1.6} style={{ color: '#2563EB' }} />
            Token Queue
          </h1>
          <p className="appt-header-sub">Live waiting room — {today}</p>
        </div>
        <div className="appt-header-actions">
          <select
            className="appt-filter-input"
            style={{ width: 180 }}
            value={doctorFilter}
            onChange={e => setDoctorFilter(e.target.value)}
          >
            <option value="">All Practitioners</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button className="appt-btn appt-btn-sm" onClick={() => { wRefetch(); aRefetch(); }}>
            <RefreshCw size={14} strokeWidth={1.6} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="appt-stats-bar">
        {[
          { label: 'Waiting',     value: waiting.length,    color: '#D97706', bg: '#FFFBEB', icon: <Clock size={18} strokeWidth={1.6} /> },
          { label: 'In Progress', value: inProgress.length, color: '#7C3AED', bg: '#F5F3FF', icon: <UserCheck size={18} strokeWidth={1.6} /> },
          { label: 'Done Today',  value: done.length,       color: '#16A34A', bg: '#F0FDF4', icon: <CheckCircle2 size={18} strokeWidth={1.6} /> },
          { label: 'Tokens Issued', value: withToken.length, color: '#2563EB', bg: '#EFF6FF', icon: <Ticket size={18} strokeWidth={1.6} /> },
        ].map(item => (
          <div key={item.label} className="appt-card">
            <div className="appt-card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#888786', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F0F0E', lineHeight: 1.2 }}>{item.value}</div>
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

      {/* ─── LIVE QUEUE TAB ────────────────────────────────────────────────────── */}
      {tab === 'queue' && (
        <div>
          {/* In Progress (prominent) */}
          {inProgress.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888786', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Now In Consultation
              </div>
              <div className="appt-queue-board">
                {inProgress.map(w => (
                  <div key={w.id} className="appt-token-card calling">
                    <div style={{ position: 'absolute', top: 10, right: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    </div>
                    <div className="appt-token-num">W{w.waitingNumber}</div>
                    <div className="appt-token-label">In Progress</div>
                    <div className="appt-token-patient">{w.patientName ?? `Patient #${w.patientId}`}</div>
                    {w.doctorName && <div style={{ fontSize: '0.72rem', color: '#888786', marginTop: 2 }}>{w.doctorName}</div>}
                    <div className="appt-token-actions">
                      <button
                        className="appt-btn appt-btn-sm"
                        style={{ background: '#F5F3FF', color: '#7C3AED', borderColor: '#DDD6FE' }}
                        onClick={() => navigate(`/consultation/${w.id}`)}
                      >
                        <Stethoscope size={13} strokeWidth={1.6} /> Consult
                      </button>
                      <button
                        className="appt-btn appt-btn-sm"
                        style={{ background: '#F0FDF4', color: '#16A34A', borderColor: '#BBF7D0' }}
                        onClick={() => handleComplete(w.id)}
                        disabled={completeVisit.isPending}
                      >
                        <CheckCircle2 size={13} strokeWidth={1.6} /> Done
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
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888786', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                    Waiting ({waiting.length})
                  </div>
                  <div className="appt-queue-board" style={{ marginBottom: 24 }}>
                    {waiting.map(w => (
                      <div key={w.id} className="appt-token-card">
                        <div className="appt-token-num" style={{ color: WAIT_COLOR[w.status] ?? '#2563EB' }}>
                          W{w.waitingNumber}
                        </div>
                        <div className="appt-token-label" style={{ color: WAIT_COLOR[w.status] }}>
                          {WAIT_STATUS[w.status]}
                        </div>
                        <div className="appt-token-patient">{w.patientName ?? `Patient #${w.patientId}`}</div>
                        {w.doctorName && <div style={{ fontSize: '0.72rem', color: '#888786', marginTop: 2 }}>{w.doctorName}</div>}
                        {w.consultationFee && (
                          <div style={{ fontSize: '0.72rem', color: '#4A4A47', marginTop: 2 }}>₹{w.consultationFee}</div>
                        )}
                        <div className="appt-token-actions">
                          <button
                            className="appt-btn appt-btn-sm"
                            style={{ background: '#EFF6FF', color: '#2563EB', borderColor: '#BFDBFE' }}
                            onClick={() => handleCall(w.id)}
                            disabled={callNext.isPending}
                          >
                            <ChevronRight size={13} strokeWidth={1.6} /> Call
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Done section */}
              {done.length > 0 && (
                <>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888786', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                    Completed ({done.length})
                  </div>
                  <div className="appt-queue-board">
                    {done.map(w => (
                      <div key={w.id} className="appt-token-card done">
                        <div className="appt-token-num" style={{ color: '#16A34A' }}>W{w.waitingNumber}</div>
                        <div className="appt-token-label" style={{ color: '#16A34A' }}>Done</div>
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

      {/* ─── TOKEN MANAGEMENT TAB ────────────────────────────────────────────── */}
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
            <div className="appt-card" style={{ overflowX: 'auto' }}>
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
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563EB', fontFamily: 'monospace' }}>
                            T{a.tokenNo}
                          </span>
                        ) : (
                          <span style={{ color: '#888786', fontSize: '0.78rem' }}>No token</span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{a.patientNameFromCase ?? a.patientName ?? `#${a.patientId}`}</div>
                        {a.phone && <div style={{ fontSize: '0.72rem', color: '#888786' }}>{a.phone}</div>}
                      </td>
                      <td style={{ color: '#4A4A47', fontSize: '0.82rem' }}>{a.doctorName ?? '—'}</td>
                      <td style={{ fontSize: '0.82rem', color: '#4A4A47' }}>{a.bookingTime ?? '—'}</td>
                      <td>
                        <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, background: WAIT_BG[a.tokenNo ? 0 : 0], color: '#4A4A47', border: '1px solid #E3E2DF' }}>
                          {a.status}
                        </span>
                      </td>
                      <td>
                        {!a.tokenNo ? (
                          <button
                            className="appt-btn appt-btn-sm appt-btn-primary"
                            onClick={() => handleIssueToken(a.id)}
                            disabled={issueToken.isPending}
                          >
                            <Ticket size={12} strokeWidth={1.6} /> Issue Token
                          </button>
                        ) : (
                          <button
                            className="appt-btn appt-btn-sm"
                            style={{ background: '#F0FDF4', color: '#16A34A', borderColor: '#BBF7D0' }}
                            onClick={() => addToWaitlist.mutateAsync({ patientId: a.patientId!, appointmentId: a.id, doctorId: a.doctorId ?? undefined })}
                            disabled={addToWaitlist.isPending}
                          >
                            <Plus size={12} strokeWidth={1.6} /> Check In
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }`}</style>
    </div>
  );
}
