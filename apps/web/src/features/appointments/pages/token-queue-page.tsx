import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Clock, UserCheck, CheckCircle2, Users, RefreshCw, Plus, Ticket,
  ChevronRight, Activity, Search, CreditCard, IndianRupee, X,
  Wallet, Package, Calendar, PlusCircle
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
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
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
            Active waiting room — {today} • <span style={{ color: 'var(--pp-blue)', fontWeight: 700, fontFamily: 'var(--pp-font-mono)' }}>{currentTime.toLocaleTimeString()}</span>
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
          Active Queue ({waiting.length + inProgress.length})
        </button>
        <button className={`appt-tab ${tab === 'tokens' ? 'active' : ''}`} onClick={() => setTab('tokens')}>
          Token Management ({todayAppts.length})
        </button>
        <button className={`appt-tab ${tab === 'collection' ? 'active' : ''}`} onClick={() => setTab('collection')}>
          Daily Collection Ledger
        </button>
      </div>

      {/* ─── LIVE QUEUE TAB ───────────────────────────────────────────────────── */}
      {/* ─── LIVE QUEUE TAB ───────────────────────────────────────────────────── */}
      {tab === 'queue' && (
        <div className="appt-queue-layout">
          {/* Main Queue Column */}
          <div className="appt-queue-main">
            {/* In Progress */}
            {inProgress.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div className="appt-section-label">Now In Consultation</div>
                <div className="appt-queue-board">
                  {inProgress.map(w => (
                    <WaitlistCard 
                      key={w.id} 
                      entry={w} 
                      onStartConsult={handleStartConsult} 
                      onComplete={handleComplete} 
                      onVitals={() => setActiveVitals({ visitId: w.appointmentId || w.id, regid: w.patientId ?? 0 })}
                      isPending={completeVisit.isPending}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Waiting */}
            <div className="appt-section-label">Queue Listing ({waiting.length})</div>
            <div className="appt-queue-table-wrap">
              <table className="appt-legacy-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>#</th>
                    <th style={{ width: '100px' }}>RegID</th>
                    <th>Patient Name</th>
                    <th>Doctor</th>
                    <th style={{ width: '120px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Wallet size={12} /> Balance</div></th>
                    <th><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Package size={12} /> Package</div></th>
                    <th><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={12} /> Expiry</div></th>
                    <th style={{ width: '100px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={12} /> Wait</div></th>
                    <th style={{ width: '100px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {wLoading ? (
                    <tr><td colSpan={9} className="text-center py-8"><RefreshCw className="spin" size={20} /></td></tr>
                  ) : waiting.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-8 text-muted">No patients waiting</td></tr>
                  ) : (
                    waiting.map((w, idx) => {
                      // Legacy color logic: 
                      // 1 = Blue/Teal (Processed), 2 = Yellow (Pending Action), 0 = Red (New)
                      const rowClass = w.rowcolor === 1 ? 'row-teal' : w.rowcolor === 2 ? 'row-yellow' : 'row-red';
                      
                      return (
                        <tr key={w.id} className={rowClass}>
                          <td style={{ fontWeight: 800, color: 'var(--pp-blue)' }}>{w.waitingNumber}</td>
                          <td style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.75rem', opacity: 0.7 }}>{w.patientId}</td>
                          <td style={{ fontWeight: 700 }}>{w.patientName ?? `Patient #${w.patientId}`}</td>
                          <td style={{ opacity: 0.8 }}>{w.doctorName ?? 'Practitioner'}</td>
                          <td>
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '4px', 
                              fontWeight: 700, 
                              color: Number(w.balance) > 0 ? '#ef4444' : 'inherit'
                            }}>
                              <IndianRupee size={12} />{w.balance || '0'}
                            </span>
                          </td>
                          <td><span className="appt-badge">{w.packageName || 'Regular'}</span></td>
                          <td style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                            {w.packageExpiry ? format(new Date(w.packageExpiry), 'dd/MM/yyyy') : '-'}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--pp-text-3)' }}>{formatWaitTime(w.checkedInAt)}</td>
                          <td>
                            <div className="flex gap-1">
                              <button className="appt-btn-icon" title="Call Next" onClick={() => handleCall(w.id)} disabled={callNext.isPending}>
                                <ChevronRight size={14} />
                              </button>
                              <button className="appt-btn-icon" title="Vitals" onClick={() => setActiveVitals({ visitId: w.appointmentId || w.id, regid: w.patientId ?? 0 })}>
                                <Activity size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Done */}
            {done.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div className="appt-section-label">Completed Today ({done.length})</div>
                <div className="appt-queue-board">
                  {done.map(w => (
                    <div key={w.id} className="appt-token-card done">
                      <div className="appt-token-num" style={{ color: 'var(--pp-success-fg)' }}>W{w.waitingNumber}</div>
                      <div className="appt-token-label" style={{ color: 'var(--pp-success-fg)' }}>Done</div>
                      <div className="appt-token-patient">{w.patientName ?? `Patient #${w.patientId}`}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Search & Add Sidebar */}
          <div className="appt-queue-sidebar">
            <div className="appt-sidebar-panel">
              <h3 className="appt-panel-title"><PlusCircle size={18} color="var(--pp-blue)" /> Add to Queue</h3>
              <div className="appt-search-box">
                <Search className="appt-search-icon" size={16} />
                <input 
                  type="text" 
                  placeholder="Search by Name, RegID or Mobile..." 
                  className="appt-search-input"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && <X size={16} className="appt-clear-icon" onClick={() => setSearchQuery('')} />}
              </div>

              <div className="appt-search-results">
                {lLoading ? (
                  <div className="p-4 text-center"><RefreshCw className="spin" size={18} /></div>
                ) : lookupResults.length === 0 ? (
                  searchQuery.length >= 2 && <div className="p-4 text-center text-muted text-sm">No patients found</div>
                ) : (
                  <div className="appt-results-list">
                    {lookupResults.map((p: any) => (
                      <div 
                        key={p.id} 
                        className={`appt-result-item ${selectedResult?.id === p.id ? 'active' : ''}`}
                        onClick={() => setSelectedResult(p)}
                      >
                        <div className="appt-result-info">
                          <div className="appt-result-name">{p.fullName}</div>
                          <div className="appt-result-meta">ID: {p.regid} • {p.mobile1 || 'No Phone'}</div>
                        </div>
                        <button 
                          className="appt-add-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToWaitlist.mutate({ patientId: p.id, doctorId: doctorFilter ? Number(doctorFilter) : undefined });
                            setSearchQuery('');
                            setSelectedResult(null);
                          }}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="appt-sidebar-footer">
                <p className="text-xs text-muted">
                  Use the search above to quickly add walk-in patients to today's queue.
                </p>
              </div>
            </div>
          </div>
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

function WaitlistCard({ entry, onStartConsult, onComplete, onVitals, isPending }: any) {
  return (
    <div className="appt-token-card calling">
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <span className="appt-calling-dot" />
      </div>
      <div className="appt-token-num">W{entry.waitingNumber}</div>
      <div className="appt-token-label">In Consultation</div>
      
      <div className="appt-token-patient">{entry.patientName ?? `Patient #${entry.patientId}`}</div>
      <div className="appt-token-doctor">{entry.doctorName ?? 'Practitioner'}</div>
      
      <div className="appt-token-actions">
        <button className="appt-btn-icon" title="Start Consultation" onClick={() => onStartConsult(entry)}>
          <Activity size={16} />
        </button>
        <button className="appt-btn-icon" title="Mark Done" onClick={() => onComplete(entry.id)} disabled={isPending} style={{ color: 'var(--pp-success-fg)' }}>
          <CheckCircle2 size={16} />
        </button>
        <button className="appt-btn-icon" title="Vitals" onClick={onVitals} style={{ color: 'var(--pp-purple)' }}>
          <Activity size={16} />
        </button>
      </div>
    </div>
  );
}
