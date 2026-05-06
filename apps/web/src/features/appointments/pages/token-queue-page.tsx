import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import {
  Clock, UserCheck, CheckCircle2, Users, RefreshCw, Plus, Ticket,
  ChevronRight, Activity, IndianRupee, ChevronLeft, LayoutGrid, List, Search, X, MoreVertical, Printer, MessageCircle
} from 'lucide-react';
import { StickerPrint } from '@/shared/components/StickerPrint';
import { useWaitlist, useCallNext, useCompleteVisit, useTodayAppointments, useIssueToken, useAddToWaitlist } from '../hooks/use-appointments';
import { useDailyCollection } from '@/features/billing/hooks/use-billing';
import { apiClient } from '@/infrastructure/api-client';
import { useAuthStore } from '@/shared/stores/auth-store';
import { VitalsFormModal } from '../../medical-case/components/vitals-form-modal';
import { Pagination } from '@/components/shared/pagination';
import '../styles/appointments.css';

const WAIT_STATUS = { 0: 'Waiting', 1: 'Called', 2: 'Done' } as Record<number, string>;
const WAIT_COLOR = { 0: 'var(--pp-warning-fg)', 1: 'var(--pp-blue)', 2: 'var(--pp-success-fg)' } as Record<number, string>;

function formatWaitTime(checkedInAt: Date | string | null) {
  if (!checkedInAt) return null;
  const start = new Date(checkedInAt);
  const diff = Math.floor((new Date().getTime() - start.getTime()) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m wait`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m wait`;
}

import { useNavigate } from 'react-router-dom';

export default function TokenQueuePage() {
  const navigate = useNavigate();
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
  const [openMenuId, setOpenMenuId] = useState<number | string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [printData, setPrintData] = useState<any>(null);
  const stickerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerBtnRef = useRef<HTMLButtonElement | null>(null);

  const MENU_W = 180;

  const toggleMenu = useCallback((id: number | string, btn: HTMLButtonElement) => {
    if (openMenuId === id) { setOpenMenuId(null); setMenuPos(null); triggerBtnRef.current = null; return; }
    triggerBtnRef.current = btn;
    const r = btn.getBoundingClientRect();

    // Position right-aligned to button, below by default
    let left = r.right - MENU_W;
    if (left < 8) left = 8;
    if (left + MENU_W > window.innerWidth - 8) left = window.innerWidth - MENU_W - 8;

    setMenuPos({ top: r.bottom + 4, left });
    setOpenMenuId(id);
  }, [openMenuId]);

  // After the portal mounts, measure actual menu and clamp within viewport
  useEffect(() => {
    if (!menuRef.current || !menuPos) return;
    const menu = menuRef.current;
    const mRect = menu.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    let { top, left } = menuPos;
    let changed = false;

    // If menu goes below viewport → flip above the button
    if (mRect.bottom > vh - 8) {
      if (triggerBtnRef.current) {
        const br = triggerBtnRef.current.getBoundingClientRect();
        top = br.top - mRect.height - 4;
      } else {
        top = vh - mRect.height - 8;
      }
      if (top < 8) top = 8;
      changed = true;
    }

    // Clamp left within viewport
    if (left + mRect.width > vw - 8) { left = vw - mRect.width - 8; changed = true; }
    if (left < 8) { left = 8; changed = true; }

    if (changed) setMenuPos({ top, left });
  });

  useEffect(() => {
    if (openMenuId === null) return;
    const close = () => { setOpenMenuId(null); setMenuPos(null); };
    const onMouse = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      // Don't close if clicking inside the menu OR on a kebab trigger button
      if (menuRef.current && menuRef.current.contains(t)) return;
      if (t.closest('.appt-kebab-btn')) return;
      close();
    };
    const onScroll = (e: Event) => {
      // Don't close if scrolling inside the dropdown menu itself
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onMouse);
    window.addEventListener('scroll', onScroll, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenuId]);

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
      }).catch(() => { });
    }
  }, [isDoctor]);

  const { data: waitlist = [], isLoading: wLoading, refetch: wRefetch } = useWaitlist(today, doctorFilter ? Number(doctorFilter) : undefined);
  const { data: todayAppts = [], isLoading: aLoading, refetch: aRefetch } = useTodayAppointments(doctorFilter ? Number(doctorFilter) : undefined);
  const { data: collection, isLoading: cLoading, refetch: cRefetch } = useDailyCollection(today);

  const callNext = useCallNext();
  const completeVisit = useCompleteVisit();
  const issueToken = useIssueToken();
  const addToWaitlist = useAddToWaitlist();

  const totalReceived = collection?.totalReceived ?? 0;

  const waiting = waitlist.filter(w => w.status === 0);
  const inProgress = waitlist.filter(w => w.status === 1);
  const withToken = todayAppts.filter(a => a.tokenNo);

  // Data selection based on tab
  const currentDataList = useMemo(() => {
    let base: any[] = [];
    if (tab === 'queue') base = [...inProgress, ...waiting];
    else if (tab === 'tokens') base = todayAppts;
    else if (tab === 'collection') base = collection?.records || [];

    if (!searchQuery) return base;
    const q = searchQuery.toLowerCase();
    return base.filter((item: any) =>
      (item.patientName || '').toLowerCase().includes(q) ||
      (item.patientNameFromCase || '').toLowerCase().includes(q) ||
      (item.phone || '').toLowerCase().includes(q) ||
      String(item.patientId || '').includes(q) ||
      String(item.waitingNumber || '').includes(q) ||
      String(item.tokenNo || '').includes(q)
    );
  }, [tab, inProgress, waiting, todayAppts, collection, searchQuery]);

  // Pagination Logic
  const totalItems = currentDataList.length;
  const totalPages = Math.ceil(totalItems / limit);
  const paginatedData = currentDataList.slice((page - 1) * limit, page * limit);

  const fromEntry = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const toEntry = Math.min(page * limit, totalItems);

  const handleCall = async (id: number) => { await callNext.mutateAsync(id); wRefetch(); };
  const handleComplete = async (id: number) => { await completeVisit.mutateAsync(id); wRefetch(); aRefetch(); };
  const handleIssueToken = async (appointmentId: number) => { await issueToken.mutateAsync(appointmentId); aRefetch(); };

  const handlePrint = (token: any) => {
    setPrintData({
      patientName: token.patientName || 'N/A',
      regId: token.regid,
      date: new Date().toLocaleDateString(),
      age: token.age,
      gender: token.gender
    });

    setTimeout(() => {
      if (stickerRef.current) {
        const printContent = stickerRef.current.innerHTML;
        const printWindow = window.open('', '_blank', 'width=600,height=600');
        if (printWindow) {
          printWindow.document.write('<html><head><title>Print Sticker</title>');
          document.querySelectorAll('style').forEach(style => { printWindow.document.write(style.outerHTML); });
          document.querySelectorAll('link[rel="stylesheet"]').forEach(link => { printWindow.document.write(link.outerHTML); });
          printWindow.document.write('</head><body>');
          printWindow.document.write(printContent);
          printWindow.document.write('</body></html>');
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
        }
      }
    }, 100);
  };

  const handleStartConsult = (w: any) => {
    navigate(`/consultation/${w.appointmentId || w.id}`);
  };

  const renderSharedPagination = () => {
    if (totalItems === 0) return null;
    return (
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        pageSize={limit}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setLimit(size); setPage(1); }}
      />
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
                <button className="appt-btn appt-btn-xs appt-btn-primary" onClick={() => handleStartConsult(w)}>
                  <Activity size={13} strokeWidth={2} /> Consult
                </button>
                <button className="appt-btn appt-btn-xs appt-btn-success" onClick={() => handleComplete(w.id)} disabled={completeVisit.isPending}>
                  <CheckCircle2 size={13} strokeWidth={1.6} /> Done
                </button>
              </>
            ) : (
              <button className="appt-btn appt-btn-xs appt-btn-primary" onClick={() => handleCall(w.id)} disabled={callNext.isPending}>
                <ChevronRight size={13} strokeWidth={1.6} /> Call Next
              </button>
            )}
            <button className="appt-btn appt-btn-xs appt-btn-purple" onClick={() => setActiveVitals({ visitId: w.appointmentId || w.id, regid: w.patientId ?? 0 })}>
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
              <th style={{ textAlign: 'left', paddingLeft: 16, width: 70 }}>TOKEN</th>
              <th style={{ textAlign: 'left', width: 180 }}>PATIENT</th>
              <th style={{ textAlign: 'left', width: 140 }}>DOCTOR</th>
              <th style={{ textAlign: 'left', width: 100 }}>WAITING</th>
              <th style={{ textAlign: 'center', width: 110 }}>PACKAGE</th>
              <th style={{ textAlign: 'center', width: 90 }}>STATUS</th>
              <th style={{ textAlign: 'left', width: 180 }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((w: any) => (
              <tr key={w.id} className={`appt-table-row-minimal ${w.status === 1 ? 'is-active-row' : ''}`}>
                <td data-label="TOKEN" style={{ paddingLeft: 16 }}>
                  <span className="appt-token-pill" style={{ color: WAIT_COLOR[w.status] }}>W{w.waitingNumber}</span>
                </td>
                <td data-label="PATIENT">
                  <div style={{ fontWeight: 600, color: 'var(--pp-ink)' }}>{w.patientName || 'Unknown'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--pp-text-3)', fontWeight: 500 }}>
                    {w.regid ? `ID: ${w.regid}` : '—'} • {w.mobile || 'No Mobile'}
                  </div>
                </td>
                <td data-label="DOCTOR">
                  <div style={{ fontWeight: 500 }}>{w.doctorName || 'General Staff'}</div>
                </td>
                <td data-label="WAIT TIME" className="appt-cell-muted">{formatWaitTime(w.checkedInAt || w.createdAt)}</td>
                <td data-label="PACKAGE" style={{ textAlign: 'center' }}>
                  <span className="appt-metadata-badge appt-metadata-package" style={{ display: 'inline-flex', justifyContent: 'center' }}>
                    {w.packageName || 'Regular'}
                  </span>
                </td>
                <td data-label="STATUS" style={{ textAlign: 'center' }}>
                  <span className={`appt-status-pill-minimal ${w.status === 1 ? 'success' : 'waiting'}`}>
                    {WAIT_STATUS[w.status]}
                  </span>
                </td>
                <td data-label="ACTION" style={{ paddingRight: 24 }}>
                  <div className="appt-kebab-wrap">
                    <button
                      className="appt-kebab-btn"
                      onClick={(e) => { e.stopPropagation(); toggleMenu(w.id, e.currentTarget); }}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  {openMenuId === w.id && menuPos && createPortal(
                    <div
                      ref={menuRef}
                      className="appt-kebab-menu"
                      style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
                    >
                      {w.status === 1 ? (
                        <>
                          <button className="appt-kebab-item" style={{ color: 'var(--pp-blue)' }} onClick={() => { handleStartConsult(w); setOpenMenuId(null); setMenuPos(null); }}>
                            <Activity size={14} /> Consult
                          </button>
                          <button className="appt-kebab-item" style={{ color: 'var(--pp-success-fg)' }} onClick={() => { handleComplete(w.id); setOpenMenuId(null); setMenuPos(null); }} disabled={completeVisit.isPending}>
                            <CheckCircle2 size={14} /> Done
                          </button>
                        </>
                      ) : (
                        <button className="appt-kebab-item" style={{ color: 'var(--pp-blue)' }} onClick={() => { handleCall(w.id); setOpenMenuId(null); setMenuPos(null); }} disabled={callNext.isPending}>
                          <ChevronRight size={14} /> Call
                        </button>
                      )}
                      <div className="appt-kebab-divider" />
                      <button className="appt-kebab-item" style={{ color: 'var(--pp-purple)' }} onClick={() => { setActiveVitals({ visitId: w.appointmentId || w.id, regid: w.patientId ?? 0 }); setOpenMenuId(null); setMenuPos(null); }}>
                        <Activity size={14} /> Vitals
                      </button>
                    </div>,
                    document.body
                  )}
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
        </div>
      </div>

      {/* Stats bar */}
      <div className="appt-stats-bar">
        {([
          { label: 'Waiting', value: waiting.length, bg: 'var(--pp-warning-bg)', ic: '#d97706', icon: <Clock size={20} strokeWidth={2} /> },
          { label: 'In Progress', value: inProgress.length, bg: 'rgba(124, 58, 237, 0.1)', ic: '#7c3aed', icon: <UserCheck size={20} strokeWidth={2} /> },
          { label: 'Realized Revenue', value: `₹${totalReceived.toLocaleString()}`, bg: 'var(--pp-success-bg)', ic: '#059669', icon: <IndianRupee size={20} strokeWidth={2} /> },
          { label: 'Tokens Issued', value: withToken.length, bg: 'var(--pp-blue-tint)', ic: 'var(--pp-blue)', icon: <Ticket size={20} strokeWidth={2} /> },
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
      {tab === 'queue' && (
        <div className="animate-fade-in">
          <div className="appt-action-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, background: 'var(--bg-surface-2)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-main)' }}>
            <div className="appt-search-wrapper" style={{ position: 'relative', width: 320 }}>
              <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search patient, ID, or phone..."
                className="appt-filter-input"
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 42px',
                  height: '42px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--border-main)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  boxShadow: 'var(--pp-shadow-sm)'
                }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <X
                  size={16}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer' }}
                  onClick={() => setSearchQuery('')}
                />
              )}
            </div>
            <div className="appt-segmented-toggle" style={{ background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
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
              {renderSharedPagination()}
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
                        <th style={{ textAlign: 'left', paddingLeft: 24, width: 100 }}>TOKEN</th>
                        <th style={{ textAlign: 'left', minWidth: 200 }}>PATIENT</th>
                        <th style={{ textAlign: 'left', width: 160 }}>DOCTOR</th>
                        <th style={{ textAlign: 'left', width: 140 }}>TIME</th>
                        <th style={{ textAlign: 'center', width: 150 }}>PACKAGE</th>
                        <th style={{ textAlign: 'center', width: 120 }}>STATUS</th>
                        <th style={{ textAlign: 'left', paddingLeft: 14, width: 200 }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((a: any) => (
                        <tr key={a.id} className="appt-table-row-minimal">
                          <td data-label="TOKEN" style={{ paddingLeft: 24 }}>
                            {a.tokenNo ? (
                              <span className="appt-token-pill">T{a.tokenNo}</span>
                            ) : (
                              <span className="appt-cell-slash">None</span>
                            )}
                          </td>
                          <td data-label="PATIENT">
                            <div style={{ fontWeight: 600, color: 'var(--pp-ink)' }}>{a.patientName || 'Unknown'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--pp-text-3)', fontWeight: 500 }}>
                              {a.regid ? `ID: ${a.regid}` : '—'} • {a.mobile || 'No Mobile'}
                            </div>
                          </td>
                          <td data-label="DOCTOR">
                            <div style={{ fontWeight: 500 }}>{a.doctorName || 'General Staff'}</div>
                          </td>
                          <td data-label="TIME" className="appt-cell-muted">{a.bookingTime ?? '—'}</td>
                          <td data-label="PACKAGE" style={{ textAlign: 'center' }}>
                            <span className="appt-metadata-badge appt-metadata-package" style={{ display: 'inline-flex', justifyContent: 'center' }}>
                              {a.packageName || 'Regular'}
                            </span>
                          </td>
                          <td data-label="STATUS" style={{ textAlign: 'center' }}>
                            <span className={`appt-status-pill-minimal ${a.status.toLowerCase()}`}>
                              {a.status}
                            </span>
                          </td>
                          <td data-label="ACTION" style={{ paddingRight: 24 }}>
                            <div className="appt-kebab-wrap">
                              <button
                                className="appt-kebab-btn"
                                onClick={(e) => { e.stopPropagation(); toggleMenu(`token-${a.id}`, e.currentTarget); }}
                              >
                                <MoreVertical size={16} />
                              </button>
                            </div>
                            {openMenuId === `token-${a.id}` && menuPos && createPortal(
                              <div
                                ref={menuRef}
                                className="appt-kebab-menu"
                                style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
                              >
                                {!a.tokenNo ? (
                                  <button className="appt-kebab-item" style={{ color: 'var(--pp-blue)' }} onClick={() => { handleIssueToken(a.id); setOpenMenuId(null); setMenuPos(null); }} disabled={issueToken.isPending}>
                                    <Ticket size={14} /> Issue Token
                                  </button>
                                ) : ['Completed', 'Consultation', 'Waitlist', 'Absent', 'Cancelled'].includes(a.status) ? (
                                  <div className="appt-kebab-item" style={{ color: 'var(--pp-text-3)', cursor: 'default', opacity: 0.6 }}>
                                    <CheckCircle2 size={14} /> {a.status === 'Completed' ? 'Done' : a.status}
                                  </div>
                                ) : (
                                  <button className="appt-kebab-item" style={{ color: 'var(--pp-success-fg)' }} onClick={() => { addToWaitlist.mutateAsync({ patientId: a.patientId!, appointmentId: a.id, doctorId: a.doctorId ?? undefined }); setOpenMenuId(null); setMenuPos(null); }} disabled={addToWaitlist.isPending}>
                                    <Plus size={14} /> Check In
                                  </button>
                                )}
                                <div className="appt-kebab-divider" />
                                <button className="appt-kebab-item" style={{ color: 'var(--pp-purple)' }} onClick={() => { setActiveVitals({ visitId: a.id, regid: a.patientId ?? 0 }); setOpenMenuId(null); setMenuPos(null); }}>
                                  <Activity size={14} /> Vitals
                                </button>
                              </div>,
                              document.body
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {renderSharedPagination()}
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
                          <td data-label="RECEIPT ID" style={{ padding: '12px 16px', textAlign: 'left' }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pp-blue)' }}>#{r.billNo || r.id}</div>
                            <div style={{ fontSize: 10, color: 'var(--pp-text-3)', fontWeight: 600 }}>{r.billDate || 'Live Sync'}</div>
                          </td>
                          <td data-label="PATIENT">
                            <div className="appt-cell-name">{r.patientName}</div>
                            <div className="appt-cell-phone">{r.phone || 'No Contact Linked'}</div>
                          </td>
                          <td data-label="CHANNEL" style={{ textAlign: 'center' }}>
                            <span className={`appt-badge ${r.paymentMode === 'Cash' ? 'appt-badge-visited' : 'appt-badge-confirmed'}`} style={{ fontSize: 10 }}>
                              {r.paymentMode?.toUpperCase() || 'CASH'}
                            </span>
                          </td>
                          <td data-label="NET VALUE" style={{ textAlign: 'right', paddingRight: 16, fontWeight: 800, color: 'var(--pp-success-fg)', fontSize: 15 }}>
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
          {printData && (
            <StickerPrint
              ref={stickerRef}
              {...printData}
            />
          )}
          {renderSharedPagination()}
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
