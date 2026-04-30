import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Clock, UserCheck, CheckCircle2, Users, RefreshCw, Plus, Ticket,
  ChevronRight, Activity, IndianRupee, ChevronLeft, LayoutGrid, List, Search, X, MoreVertical
} from 'lucide-react';
import { useWaitlist, useCallNext, useCompleteVisit, useTodayAppointments, useIssueToken, useAddToWaitlist } from '../hooks/use-appointments';
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

  const [tab, setTab] = useState<'queue' | 'tokens' | 'collection'>('queue');
  const [doctorFilter, setDoctorFilter] = useState(() =>
    isDoctor ? String((user as any)?.id ?? '') : ''
  );
  const [doctors, setDoctors] = useState<any[]>([]);
  const [activeVitals, setActiveVitals] = useState<{ visitId: number, regid: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // View & Pagination State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [tab, doctorFilter, limit, viewMode]);

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

  const callNext      = useCallNext();
  const completeVisit = useCompleteVisit();
  const issueToken    = useIssueToken();
  const addToWaitlist = useAddToWaitlist();

  const totalReceived = collection?.totalReceived ?? 0;
  
  const waiting    = waitlist.filter(w => w.status === 0);
  const inProgress = waitlist.filter(w => w.status === 1);
  const withToken  = todayAppts.filter(a => a.tokenNo);

  // Data selection based on tab
  const currentDataList = useMemo(() => {
    if (tab === 'queue') return [...inProgress, ...waiting];
    if (tab === 'tokens') return todayAppts;
    if (tab === 'collection') return collection?.records || [];
    return [];
  }, [tab, inProgress, waiting, todayAppts, collection]);

  // Pagination Logic
  const totalItems = currentDataList.length;
  const totalPages = Math.ceil(totalItems / limit);
  const paginatedData = currentDataList.slice((page - 1) * limit, page * limit);

  const fromEntry = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const toEntry = Math.min(page * limit, totalItems);

  const handleCall      = async (id: number) => { await callNext.mutateAsync(id); wRefetch(); };
  const handleComplete  = async (id: number) => { await completeVisit.mutateAsync(id); wRefetch(); aRefetch(); };
  const handleIssueToken = async (appointmentId: number) => { await issueToken.mutateAsync(appointmentId); aRefetch(); };

  const handleStartConsult = (w: any) => {
    window.location.href = `/medical-case/entry?regid=${w.patientId}&visitId=${w.appointmentId || w.id}`;
  };

  const renderPagination = () => {
    if (totalItems === 0) return null;
    return (
      <div className="appt-pagination-bar" style={{ marginTop: 24 }}>
        <div className="appt-pagination-info-wrap">
          <div className="appt-pagination-info">
            Showing {fromEntry}-{toEntry} of {totalItems}
          </div>
          <select
            className="appt-pagination-limit"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            {[5, 10, 20, 50].map((l) => (
              <option key={l} value={l}>
                {l} per page
              </option>
            ))}
          </select>
        </div>

        <div className="appt-pagination-controls">
          <button
            className="appt-pagination-btn"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={16} />
          </button>

          {[...Array(totalPages)].map((_, i) => {
            const p = i + 1;
            if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
              return (
                <button
                  key={p}
                  className={`appt-pagination-page ${page === p ? 'is-active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              );
            }
            if (p === page - 2 || p === page + 2) {
              return <span key={p} style={{ color: '#cbd5e1' }}>...</span>;
            }
            return null;
          })}

          <button
            className="appt-pagination-btn"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  const renderSkeletonGrid = () => (
    <div className="appt-queue-board">
      {[...Array(limit)].map((_, i) => (
        <div key={i} className="appt-token-card-minimal" style={{ border: '1px solid #f1f5f9', padding: 24, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="appt-shimmer" style={{ width: 60, height: 28, borderRadius: 4 }}></div>
            <div className="appt-shimmer" style={{ width: 80, height: 20, borderRadius: 4 }}></div>
          </div>
          <div style={{ background: 'var(--pp-warm-1)', padding: 14, borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="appt-shimmer" style={{ width: '70%', height: 20, borderRadius: 4 }}></div>
            <div className="appt-shimmer" style={{ width: '40%', height: 14, borderRadius: 4 }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="appt-shimmer" style={{ width: 40, height: 14, borderRadius: 4 }}></div>
            <div className="appt-shimmer" style={{ width: 60, height: 14, borderRadius: 4 }}></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 8 }}>
            <div className="appt-shimmer" style={{ flex: 1, height: 36, borderRadius: 8 }}></div>
            <div className="appt-shimmer" style={{ flex: 1, height: 36, borderRadius: 8 }}></div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSkeletonList = () => (
    <div className="appt-card">
      <div className="appt-table-scroll">
        <table className="appt-table">
          <tbody>
            {[...Array(limit)].map((_, i) => (
              <tr key={i} className="appt-skeleton-row">
                <td colSpan={6}><div className="appt-skeleton-box" style={{ height: 40, margin: '8px 16px' }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGridView = () => (
    <div className="appt-queue-board">
      {paginatedData.map((w: any) => (
        <div key={w.id} className={`appt-token-card-minimal ${w.status === 1 ? 'calling' : ''}`}>
          <div className="appt-token-header-minimal">
            <div className="appt-token-badge-wrap">
              <div className="appt-token-num-minimal" style={{ color: WAIT_COLOR[w.status] }}>
                W{w.waitingNumber}
              </div>
              <div className="appt-token-status-label" style={{ color: WAIT_COLOR[w.status] }}>
                {WAIT_STATUS[w.status]}
              </div>
            </div>
            {w.status === 1 && <span className="appt-calling-dot" />}
          </div>

          <div className="appt-token-patient-box">
            <div className="appt-token-patient-name">{w.patientName ?? `Patient #${w.patientId}`}</div>
            {w.doctorName && <div className="appt-token-doctor-name">{w.doctorName}</div>}
          </div>

          <div className="appt-token-meta-minimal">
            <div>{w.consultationFee ? `₹${w.consultationFee}` : '—'}</div>
            <div>{formatWaitTime(w.checkedInAt || w.createdAt)}</div>
          </div>

          <div className="appt-token-actions-minimal">
            {w.status === 1 ? (
              <>
                <button className="appt-btn appt-btn-sm appt-btn-primary" onClick={() => handleStartConsult(w)}>
                  <Activity size={13} strokeWidth={2} /> Consult
                </button>
                <button className="appt-btn appt-btn-sm appt-btn-success" onClick={() => handleComplete(w.id)} disabled={completeVisit.isPending}>
                  <CheckCircle2 size={13} strokeWidth={1.6} /> Done
                </button>
              </>
            ) : (
              <button className="appt-btn appt-btn-sm appt-btn-primary" onClick={() => handleCall(w.id)} disabled={callNext.isPending}>
                <ChevronRight size={13} strokeWidth={1.6} /> Call Next
              </button>
            )}
            <button className="appt-btn appt-btn-sm appt-btn-purple" onClick={() => setActiveVitals({ visitId: w.appointmentId || w.id, regid: w.patientId ?? 0 })}>
              <Activity size={13} strokeWidth={1.6} /> Vitals
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="appt-card">
      <div className="appt-table-scroll">
        <table className="appt-table">
          <thead className="appt-table-header-minimal">
            <tr>
              <th style={{ textAlign: 'left', paddingLeft: 24 }}>TOKEN</th>
              <th style={{ textAlign: 'left' }}>PATIENT</th>
              <th style={{ textAlign: 'left' }}>DOCTOR</th>
              <th style={{ textAlign: 'left' }}>WAIT TIME</th>
              <th style={{ textAlign: 'center' }}>STATUS</th>
              <th style={{ textAlign: 'right', paddingRight: 24 }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((w: any) => (
              <tr key={w.id} className={`appt-table-row-minimal ${w.status === 1 ? 'is-active-row' : ''}`}>
                <td style={{ paddingLeft: 24 }}>
                  <span className="appt-token-pill" style={{ color: WAIT_COLOR[w.status] }}>W{w.waitingNumber}</span>
                </td>
                <td>
                  <div className="appt-patient-info">
                    <div className="appt-cell-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {w.patientName ?? `Patient #${w.patientId}`}
                      {w.status === 1 && <span className="appt-calling-dot" style={{ position: 'static' }} />}
                    </div>
                  </div>
                </td>
                <td className="appt-cell-muted">{w.doctorName ?? '—'}</td>
                <td className="appt-cell-muted">{formatWaitTime(w.checkedInAt || w.createdAt)}</td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`appt-status-pill-minimal ${w.status === 1 ? 'success' : 'waiting'}`}>
                    {WAIT_STATUS[w.status]}
                  </span>
                </td>
                <td style={{ paddingRight: 24 }}>
                  <div className="appt-row-actions appt-row-actions-inline">
                    {w.status === 1 ? (
                      <>
                        <button className="appt-btn appt-btn-sm" style={{ background: '#0f172a', color: 'white', borderColor: '#0f172a' }} onClick={() => handleStartConsult(w)}>
                           <Activity size={13} strokeWidth={2} /> Consult
                        </button>
                        <button className="appt-btn appt-btn-sm appt-btn-success" onClick={() => handleComplete(w.id)} disabled={completeVisit.isPending}>
                           <CheckCircle2 size={13} strokeWidth={1.6} /> Done
                        </button>
                      </>
                    ) : (
                      <button className="appt-btn appt-btn-sm" style={{ background: '#0f172a', color: 'white', borderColor: '#0f172a' }} onClick={() => handleCall(w.id)} disabled={callNext.isPending}>
                         <ChevronRight size={13} strokeWidth={1.6} /> Call
                      </button>
                    )}
                    <button className="appt-btn appt-btn-sm appt-btn-purple" onClick={() => setActiveVitals({ visitId: w.appointmentId || w.id, regid: w.patientId ?? 0 })}>
                      <Activity size={14} /> Vitals
                    </button>
                  </div>
                  <div className="appt-kebab-wrap">
                    <button 
                      className="appt-kebab-btn"
                      onClick={() => setOpenMenuId(openMenuId === w.id ? null : w.id)}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === w.id && (
                      <div className="appt-kebab-menu" style={{ right: 24, top: '50%', transform: 'translateY(-50%)', position: 'absolute', zIndex: 100 }}>
                        {w.status === 1 ? (
                          <>
                            <button className="appt-kebab-item" style={{ color: 'var(--pp-blue)' }} onClick={() => { handleStartConsult(w); setOpenMenuId(null); }}>
                              <Activity size={14} /> Consult
                            </button>
                            <button className="appt-kebab-item" style={{ color: 'var(--pp-success-fg)' }} onClick={() => { handleComplete(w.id); setOpenMenuId(null); }} disabled={completeVisit.isPending}>
                              <CheckCircle2 size={14} /> Done
                            </button>
                          </>
                        ) : (
                          <button className="appt-kebab-item" style={{ color: 'var(--pp-blue)' }} onClick={() => { handleCall(w.id); setOpenMenuId(null); }} disabled={callNext.isPending}>
                            <ChevronRight size={14} /> Call
                          </button>
                        )}
                        <div className="appt-kebab-divider" />
                        <button className="appt-kebab-item" style={{ color: 'var(--pp-purple)' }} onClick={() => { setActiveVitals({ visitId: w.appointmentId || w.id, regid: w.patientId ?? 0 }); setOpenMenuId(null); }}>
                          <Activity size={14} /> Vitals
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

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
          <button className="appt-btn appt-btn-sm" onClick={() => { wRefetch(); aRefetch(); cRefetch(); }}>
            <RefreshCw size={14} strokeWidth={1.6} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="appt-stats-bar">
        {([
          { label: 'Waiting',       value: waiting.length,    bg: 'rgba(245, 158, 11, 0.1)', ic: '#d97706', icon: <Clock size={20} strokeWidth={2} /> },
          { label: 'In Progress',   value: inProgress.length, bg: 'rgba(124, 58, 237, 0.1)', ic: '#7c3aed', icon: <UserCheck size={20} strokeWidth={2} /> },
          { label: 'Realized Revenue', value: `₹${totalReceived.toLocaleString()}`, bg: 'rgba(5, 150, 105, 0.1)',  ic: '#059669', icon: <IndianRupee size={20} strokeWidth={2} /> },
          { label: 'Tokens Issued',value: withToken.length,  bg: 'rgba(37, 99, 235, 0.1)',  ic: '#2563eb', icon: <Ticket size={20} strokeWidth={2} /> },
        ] as const).map(item => (
          <div key={item.label} className="appt-stat-card">
            <div className="appt-stat-icon-wrap" style={{ background: item.bg, color: item.ic }}>
              {item.icon}
            </div>
            <div>
              <div className="appt-stat-label">{item.label}</div>
              <div className="appt-stat-value">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="appt-tabs">
        <button className={`appt-tab ${tab === 'queue' ? 'active' : ''}`} onClick={() => setTab('queue')}>
          Active Queue ({inProgress.length + waiting.length})
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
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <div className="appt-segmented-toggle">
              <button 
                className={`appt-segmented-btn ${viewMode === 'list' ? 'active' : ''}`} 
                onClick={() => setViewMode('list')}
              >
                <List size={16} /> List
              </button>
              <button 
                className={`appt-segmented-btn ${viewMode === 'grid' ? 'active' : ''}`} 
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid size={16} /> Grid
              </button>
            </div>
          </div>

          {wLoading ? (
            viewMode === 'grid' ? renderSkeletonGrid() : renderSkeletonList()
          ) : (inProgress.length + waiting.length) === 0 ? (
            <div className="appt-empty" style={{ padding: 60 }}>
              <Users size={28} className="appt-empty-icon" />
              <p className="appt-empty-text">No patients in the waiting room</p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? renderGridView() : renderListView()}
              {renderPagination()}
            </>
          )}
        </div>
      )}

      {/* ─── TOKEN MANAGEMENT TAB ───────────────────────────────────────────── */}
      {tab === 'tokens' && (
        <div className="animate-fade-in">
          {aLoading ? (
            renderSkeletonList()
          ) : todayAppts.length === 0 ? (
            <div className="appt-empty">
              <Ticket size={28} className="appt-empty-icon" />
              <p className="appt-empty-text">No appointments found today</p>
            </div>
          ) : (
            <>
              <div className="appt-card">
                <div className="appt-table-scroll">
                  <table className="appt-table">
                    <thead className="appt-table-header-minimal">
                      <tr>
                        <th style={{ textAlign: 'left', paddingLeft: 24 }}>TOKEN</th>
                        <th style={{ textAlign: 'left' }}>PATIENT</th>
                        <th style={{ textAlign: 'left' }}>DOCTOR</th>
                        <th style={{ textAlign: 'left' }}>TIME</th>
                        <th style={{ textAlign: 'center' }}>STATUS</th>
                        <th style={{ textAlign: 'right', paddingRight: 24 }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((a: any) => (
                        <tr key={a.id} className="appt-table-row-minimal">
                          <td style={{ paddingLeft: 24 }}>
                            {a.tokenNo ? (
                              <span className="appt-token-pill">T{a.tokenNo}</span>
                            ) : (
                              <span className="appt-cell-slash">None</span>
                            )}
                          </td>
                          <td>
                            <div className="appt-patient-info">
                              <div className="appt-cell-name">{a.patientNameFromCase ?? a.patientName ?? `#${a.patientId}`}</div>
                              {a.phone && <div className="appt-cell-phone">{a.phone}</div>}
                            </div>
                          </td>
                          <td className="appt-cell-muted">{a.doctorName ?? '—'}</td>
                          <td className="appt-cell-muted">{a.bookingTime ?? '—'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`appt-status-pill-minimal ${a.status.toLowerCase()}`}>
                              {a.status}
                            </span>
                          </td>
                          <td style={{ paddingRight: 24 }}>
                            <div className="appt-row-actions appt-row-actions-inline">
                              {!a.tokenNo ? (
                                <button className="appt-btn appt-btn-sm" style={{ background: '#0f172a', color: 'white', borderColor: '#0f172a' }} onClick={() => handleIssueToken(a.id)} disabled={issueToken.isPending}>
                                  <Ticket size={14} /> Issue Token
                                </button>
                              ) : (
                                <button className="appt-btn appt-btn-sm appt-btn-success" onClick={() => addToWaitlist.mutateAsync({ patientId: a.patientId!, appointmentId: a.id, doctorId: a.doctorId ?? undefined })} disabled={addToWaitlist.isPending}>
                                  <Plus size={14} /> Check In
                                </button>
                              )}
                              <button className="appt-btn appt-btn-sm appt-btn-purple" onClick={() => setActiveVitals({ visitId: a.id, regid: a.patientId ?? 0 })}>
                                <Activity size={14} /> Vitals
                              </button>
                            </div>
                            <div className="appt-kebab-wrap">
                              <button 
                                className="appt-kebab-btn"
                                onClick={() => setOpenMenuId(openMenuId === `token-${a.id}` ? null : `token-${a.id}` as any)}
                              >
                                <MoreVertical size={16} />
                              </button>
                              {openMenuId === `token-${a.id}` as any && (
                                <div className="appt-kebab-menu" style={{ right: 24, top: '50%', transform: 'translateY(-50%)', position: 'absolute', zIndex: 100 }}>
                                  {!a.tokenNo ? (
                                    <button className="appt-kebab-item" style={{ color: 'var(--pp-blue)' }} onClick={() => { handleIssueToken(a.id); setOpenMenuId(null); }} disabled={issueToken.isPending}>
                                      <Ticket size={14} /> Issue Token
                                    </button>
                                  ) : (
                                    <button className="appt-kebab-item" style={{ color: 'var(--pp-success-fg)' }} onClick={() => { addToWaitlist.mutateAsync({ patientId: a.patientId!, appointmentId: a.id, doctorId: a.doctorId ?? undefined }); setOpenMenuId(null); }} disabled={addToWaitlist.isPending}>
                                      <Plus size={14} /> Check In
                                    </button>
                                  )}
                                  <div className="appt-kebab-divider" />
                                  <button className="appt-kebab-item" style={{ color: 'var(--pp-purple)' }} onClick={() => { setActiveVitals({ visitId: a.id, regid: a.patientId ?? 0 }); setOpenMenuId(null); }}>
                                    <Activity size={14} /> Vitals
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {renderPagination()}
            </>
          )}
        </div>
      )}

      {/* ─── DAILY COLLECTION TAB ─────────────────────────────────────────── */}
      {tab === 'collection' && (
        <div className="animate-fade-in">
          <div className="appt-card">
            <div className="appt-card-header">
              <h3 className="appt-card-title">Institutional Receipt Ledger</h3>
              <div className="appt-badge appt-badge-visited">{(collection?.records.length || 0)} Transactions</div>
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
                    [...Array(limit)].map((_, i) => (
                      <tr key={i} className="appt-skeleton-row">
                        <td colSpan={4}><div className="appt-skeleton-box" style={{ height: 40, margin: '8px 16px' }} /></td>
                      </tr>
                    ))
                  ) : !collection || collection.records.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: 80, textAlign: 'center', color: 'var(--pp-text-3)' }}>No clinical receipts identified for this target date.</td></tr>
                  ) : (
                    <>
                      {paginatedData.map((r: any) => (
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
          {renderPagination()}
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
