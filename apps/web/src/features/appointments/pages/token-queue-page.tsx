import { useState, useEffect, useMemo } from 'react';
import {
  Clock, UserCheck, CheckCircle2, Users, RefreshCw, Plus, Ticket,
  ChevronRight, Activity, Search, CreditCard, IndianRupee, X
} from 'lucide-react';
import { useWaitlist, useCallNext, useCompleteVisit, useTodayAppointments, useIssueToken, useAddToWaitlist } from '../hooks/use-appointments';
import { usePatientLookup } from '@/features/patients/hooks/use-patients';
import { useDailyCollection } from '@/features/billing/hooks/use-billing';
import { apiClient } from '@/infrastructure/api-client';
import { useAuthStore } from '@/shared/stores/auth-store';
import { VitalsFormModal } from '../../medical-case/components/vitals-form-modal';
import '../styles/appointments.css';

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

export default function TokenQueuePage() {
  const today = new Date().toISOString().split('T')[0]!;
  const user = useAuthStore((s) => s.user);
  const rawRole = ((user as any)?.type || (user as any)?.role || (user as any)?.roleName || '').toLowerCase();
  const isDoctor = rawRole === 'doctor' || rawRole === 'medical practitioner' || ((user as any)?.name || '').toLowerCase().startsWith('dr');
  // Doctors see only their own queue automatically; admins/receptionists can choose.
  const [tab, setTab] = useState<'queue' | 'tokens' | 'collection'>('queue');
  const [doctorFilter, setDoctorFilter] = useState(() =>
    isDoctor ? String((user as any)?.id ?? '') : ''
  );
  const [doctors, setDoctors] = useState<any[]>([]);
  const [activeVitals, setActiveVitals] = useState<{ visitId: number, regid: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keep filter in sync if user identity changes
  useEffect(() => {
    if (isDoctor) setDoctorFilter(String((user as any)?.id ?? ''));
  }, [(user as any)?.id, isDoctor]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchQuery('');
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
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
  const { data: todayAppts = [], isLoading: aLoading, refetch: aRefetch } = useTodayAppointments(doctorFilter ? Number(doctorFilter) : undefined);
  const { data: collection, isLoading: cLoading, refetch: cRefetch } = useDailyCollection(today);
  const { data: lookupResults = [], isLoading: lLoading } = usePatientLookup(searchQuery);

  const callNext      = useCallNext();
  const completeVisit = useCompleteVisit();
  const issueToken    = useIssueToken();
  const addToWaitlist = useAddToWaitlist();

  const totalReceived = collection?.totalReceived ?? 0;
  const cashTotal = collection?.records.filter((r: any) => r.paymentMode === 'Cash').reduce((acc: number, r: any) => acc + Number(r.received), 0) ?? 0;
  const onlineTotal = totalReceived - cashTotal;
  const avgValue = collection?.records.length ? Math.round(totalReceived / collection.records.length) : 0;

  const waiting    = waitlist.filter(w => w.status === 0);
  const inProgress = waitlist.filter(w => w.status === 1);
  const done       = waitlist.filter(w => w.status === 2);

  const withToken     = todayAppts.filter(a => a.tokenNo);
  const withoutToken  = todayAppts.filter(a => !a.tokenNo);

  const handleCall      = async (id: number) => { await callNext.mutateAsync(id); wRefetch(); };
  const handleComplete  = async (id: number) => { await completeVisit.mutateAsync(id); wRefetch(); aRefetch(); };
  const handleIssueToken = async (appointmentId: number) => { await issueToken.mutateAsync(appointmentId); aRefetch(); };

  const handleStartConsult = (w: any) => {
    // Navigate to medical case entry
    window.location.href = `/medical-case/entry?regid=${w.patientId}&visitId=${w.appointmentId || w.id}`;
  };

  return (
    <div className="appt-page">
      {/* Header */}
      <div className="appt-header">
        <div>
          <h1 className="appt-header-title">
            <Ticket size={20} strokeWidth={1.6} className="appt-panel-title-icon" />
            Token Queue
          </h1>
          <p className="appt-header-sub">
            Live waiting room — {today} • <span style={{ color: 'var(--pp-blue)', fontWeight: 700, fontFamily: 'var(--pp-font-mono)' }}>{currentTime.toLocaleTimeString()}</span>
          </p>
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
          { label: 'Realized Revenue', value: `₹${totalReceived.toLocaleString()}`, bg: 'var(--pp-success-bg)',  ic: 'var(--pp-success-fg)', icon: <IndianRupee size={18} strokeWidth={1.6} /> },
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
          Token Management ({todayAppts.length})
        </button>
        <button className={`appt-tab ${tab === 'collection' ? 'active' : ''}`} onClick={() => setTab('collection')}>
          Daily Collection Ledger
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
                      <button className="appt-btn appt-btn-sm appt-btn-primary" onClick={() => handleStartConsult(w)}>
                        <Activity size={13} strokeWidth={2} /> Start Consult
                      </button>
                      <button className="appt-btn appt-btn-sm appt-btn-success" onClick={() => handleComplete(w.id)} disabled={completeVisit.isPending}>
                        <CheckCircle2 size={13} strokeWidth={1.6} /> Done
                      </button>
                      <button className="appt-btn appt-btn-sm appt-btn-purple" onClick={() => setActiveVitals({ visitId: w.appointmentId || w.id, regid: w.patientId ?? 0 })}>
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
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4 }}>
                          {w.consultationFee && <div className="appt-token-fee">₹{w.consultationFee}</div>}
                          <div style={{ fontSize: 10, color: 'var(--pp-text-3)', fontWeight: 600 }}>{formatWaitTime(w.checkedInAt || w.createdAt)}</div>
                        </div>
                        <div className="appt-token-actions">
                          <button className="appt-btn appt-btn-sm appt-btn-primary" onClick={() => handleCall(w.id)} disabled={callNext.isPending}>
                            <ChevronRight size={13} strokeWidth={1.6} /> Call
                          </button>
                          <button className="appt-btn appt-btn-sm appt-btn-purple" onClick={() => setActiveVitals({ visitId: w.appointmentId || w.id, regid: w.patientId ?? 0 })}>
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
          ) : todayAppts.length === 0 ? (
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
                    {todayAppts.map(a => (
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
                            <button className="appt-btn appt-btn-sm appt-btn-purple" onClick={() => setActiveVitals({ visitId: a.id, regid: a.patientId ?? 0 })}>
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

      {/* ─── DAILY COLLECTION TAB ─────────────────────────────────────────── */}
      {tab === 'collection' && (
        <div className="animate-fade-in">
          <div className="appt-card">
            <div className="appt-card-header">
              <h3 className="appt-card-title">Institutional Receipt Ledger</h3>
              <div className="appt-badge appt-badge-visited">{collection?.records.length || 0} Transactions</div>
            </div>
            <div className="appt-table-scroll">
              <table className="appt-ledger-table">
                <thead className="appt-ledger-header">
                  <tr>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Receipt ID</th>
                    <th style={{ textAlign: 'left' }}>Patient Attribution</th>
                    <th style={{ textAlign: 'center' }}>Channel</th>
                    <th style={{ textAlign: 'right', paddingRight: 16 }}>Net Value</th>
                  </tr>
                </thead>
                <tbody>
                  {cLoading ? (
                    <tr><td colSpan={4} style={{ padding: 80, textAlign: 'center' }}><RefreshCw className="spin" size={24} style={{ opacity: 0.3 }} /></td></tr>
                  ) : !collection || collection.records.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: 80, textAlign: 'center', color: 'var(--pp-text-3)' }}>No clinical receipts identified for this target date.</td></tr>
                  ) : (
                    <>
                      {collection.records.map((r: any) => (
                        <tr key={r.id} className="appt-ledger-row">
                          <td style={{ padding: '12px 16px', textAlign: 'left' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pp-blue)' }}>#{r.billNo || r.id}</div>
                            <div style={{ fontSize: 10, color: 'var(--pp-text-3)', fontWeight: 600 }}>{r.billDate || 'Live Sync'}</div>
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <div className="appt-cell-name">{r.patientName}</div>
                            <div className="appt-cell-phone">{r.phone || 'No Contact Linked'}</div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`appt-badge ${r.paymentMode === 'Cash' ? 'appt-badge-visited' : 'appt-badge-confirmed'}`} style={{ fontSize: 10 }}>
                              {r.paymentMode?.toUpperCase() || 'CASH'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', paddingRight: 16, fontWeight: 800, color: 'var(--pp-success-fg)', fontSize: 15 }}>
                            ₹{Number(r.received).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
