import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Plus, List as ListIcon, Grid, Edit2, Trash2, Calendar,
  Clock, UserCheck, MoreVertical, X, Filter, Stethoscope, Activity, Tag, User, Printer, RefreshCw, CalendarDays
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppointmentStatus } from '@mmc/types';
import type { Appointment } from '@mmc/types';
import {
  useAppointments, useTodayAppointments,
  useUpdateStatus, useDeleteAppointment,
} from '../hooks/use-appointments';
import { useAuthStore } from '@/shared/stores/auth-store';
import { StatusBadge } from '../components/status-badge';
import { AppointmentFormDrawer } from '../components/appointment-form-drawer';
import { printAppointmentSlip } from '@/shared/utils/print';
import { useOrganizations } from '@/features/platform/hooks/use-organizations';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { Pagination } from '@/components/shared/pagination';
import '../styles/appointments.css';

const STATUS_OPTIONS = ['', ...Object.values(AppointmentStatus)];
type Tab = 'all' | 'today' | 'pending';

export default function AppointmentListPage() {
  const today = new Date().toISOString().split('T')[0] || '';
  const user = useAuthStore((s) => s.user);
  const rawRole = ((user as any)?.type || (user as any)?.role || (user as any)?.roleName || '').toLowerCase();
  const isDoctor = rawRole === 'doctor' || rawRole === 'medical practitioner' || ((user as any)?.name || '').toLowerCase().startsWith('dr');

  const { data: orgs = [] } = useOrganizations();
  const currentOrg = orgs[0];

  const [tab, setTab] = useState<Tab>('today');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerApptId, setDrawerApptId] = useState<number | null>(null);

  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [openMenuId, setOpenMenuId] = useState<number | string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const MENU_W = 180;
  const MENU_H = 290;

  const toggleMenu = useCallback((id: number, btn: HTMLButtonElement) => {
    if (openMenuId === id) { setOpenMenuId(null); setMenuPos(null); return; }
    const r = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const top = spaceBelow >= MENU_H ? r.bottom + 4 : r.top - MENU_H - 4;
    let left = r.right - MENU_W;
    if (left < 8) left = 8;
    if (left + MENU_W > window.innerWidth - 8) left = window.innerWidth - MENU_W - 8;
    setMenuPos({ top: Math.max(8, top), left });
    setOpenMenuId(id);
  }, [openMenuId]);

  useEffect(() => {
    if (openMenuId === null) return;
    const close = () => { setOpenMenuId(null); setMenuPos(null); };
    const onMouse = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
    };
    const onScroll = (e: Event) => {
      // Don't close if scrolling inside the dropdown menu itself
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener('mousedown', onMouse);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [openMenuId]);

  const todayQuery = useTodayAppointments();
  const listQuery = useAppointments({
    search: search || undefined,
    status: status || undefined,
    from_date: fromDate || (tab === 'all' ? undefined : today),
    to_date: toDate || (tab === 'all' ? undefined : today),
    doctor_id: undefined,
    page,
    limit: pageSize,
  });

  const updateStatus = useUpdateStatus();
  const deleteMut = useDeleteAppointment();

  const todayData = todayQuery.data ?? [];
  const listData = listQuery.data?.data ?? [];
  
  let data = listData;
  let totalEntries = listQuery.data?.total ?? 0;
  let isPending = listQuery.isLoading;

  if (tab === 'today') {
    totalEntries = todayData.length;
    isPending = todayQuery.isLoading;
    const startIndex = (page - 1) * pageSize;
    data = todayData.slice(startIndex, startIndex + pageSize);
  } else if (tab === 'pending') {
    const pendingData = todayData.filter(a => ['Pending', 'Waitlist', 'Scheduled'].includes(a.status));
    totalEntries = pendingData.length;
    isPending = todayQuery.isLoading;
    const startIndex = (page - 1) * pageSize;
    data = pendingData.slice(startIndex, startIndex + pageSize);
  }

  const totalPages = Math.ceil(totalEntries / pageSize);

  const handleStatusChange = async (id: number, newStatus: string) => {
    await updateStatus.mutateAsync({ id, status: newStatus });
  };
  const handlePrintSlip = (a: Appointment) => {
    if (currentOrg) {
      printAppointmentSlip({
        patientName: a.patientNameFromCase ?? a.patientName ?? 'Patient',
        phone: a.phone ?? '',
        doctorName: a.doctorName ?? 'N/A',
        bookingDate: (a.bookingDate || today) as string,
        bookingTime: a.bookingTime ?? '',
        consultationFee: String(a.consultationFee ?? 0),
        visitType: a.visitType as any,
        tokenNo: a.tokenNo ?? undefined,
        notes: a.notes ?? '',
      }, currentOrg);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteMut.mutateAsync(id);
    setConfirmDel(null);
  };

  const quickStatuses = [
    { s: AppointmentStatus.Confirmed, label: 'Confirm', color: 'var(--pp-blue)' },
    { s: AppointmentStatus.Arrived, label: 'Arrived', color: 'var(--pp-green-mid)' },
    { s: AppointmentStatus.Consultation, label: 'In Room', color: 'var(--pp-purple)' },
    { s: AppointmentStatus.Done, label: 'Done', color: 'var(--pp-success-fg)' },
    { s: AppointmentStatus.Absent, label: 'Absent', color: 'var(--pp-text-3)' },
    { s: AppointmentStatus.Cancelled, label: 'Cancel', color: 'var(--pp-danger-fg)' },
  ];

  return (
    <div className="pp-page-container appt-page animate-fade-in">
      {/* Hero Header */}
      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            <CalendarDays size={22} strokeWidth={1.8} />
            Appointments
          </h1>
          <p className="pp-page-hero-sub">{totalEntries} appointment{totalEntries !== 1 ? 's' : ''} managed</p>
        </div>
        <div className="pp-page-hero-actions">
          <div className="appt-segmented-toggle">
            <button type="button" className={`appt-segmented-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
              <ListIcon size={16} strokeWidth={1.6} /> List
            </button>
            <button type="button" className={`appt-segmented-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
              <Grid size={16} strokeWidth={1.6} /> Grid
            </button>
          </div>
          <button className="btn-primary" onClick={() => { setDrawerApptId(null); setIsDrawerOpen(true); }}>
            <Plus size={14} strokeWidth={1.6} /> New Booking
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="appt-tabs">
        {([['today', 'Today'], ['all', 'All Appointments'], ['pending', 'Pending Queue']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} className={`appt-tab ${tab === key ? 'active' : ''}`} onClick={() => { setTab(key); setPage(1); }}>
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {tab !== 'pending' && (
        <div className="pp-filter-card">
          <div className="pp-filter-search-wrap">
            <Search size={14} strokeWidth={1.6} />
            <input
              className="pp-filter-search-input"
              placeholder="Search patient / phone…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="pp-filter-controls">
            <select className="pp-select" style={{ width: 'auto', minWidth: 130 }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input className="pp-input" style={{ width: 'auto' }} type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} title="From Date" />
            <input className="pp-input" style={{ width: 'auto' }} type="date" value={toDate} onChange={e => setToDate(e.target.value)} title="To Date" />
            <button className="btn-secondary" onClick={() => { setSearch(''); setStatus(''); setFromDate(''); setToDate(''); setPage(1); }}>
              <Filter size={13} strokeWidth={1.6} /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Table / Grid */}
      <div className={viewMode === 'list' ? "appt-card" : "appt-grid-view-container"}>
        {isPending ? (
          <TableSkeleton rows={10} cols={7} />
        ) : data.length === 0 ? (
          <div className="pp-empty-enhanced">
            <div className="pp-empty-icon-circle">
              <CalendarDays size={32} />
            </div>
            <p className="pp-empty-title">No appointments found</p>
            <p className="pp-empty-sub">Try adjusting filters or create a new booking.</p>
            <button className="btn-primary" onClick={() => { setDrawerApptId(null); setIsDrawerOpen(true); }}>
              <Plus size={14} /> New Booking
            </button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="pp-table-scroll">
            <table className="pp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date &amp; Time</th>
                  <th>Type</th>
                  <th>Package</th>
                  <th>Status</th>
                  <th>Token</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map(a => (
                  <tr key={a.id}>
                    <td data-label="#"><span className="appt-cell-id">#{a.id}</span></td>
                    <td data-label="PATIENT">
                      <div className="appt-cell-name">{(a.patientNameFromCase || a.patientName || '').trim() || '—'}</div>
                      {a.phone && <div className="appt-cell-phone">{a.phone}</div>}
                    </td>
                    <td data-label="DOCTOR">
                      {(a.doctorName || '').trim()
                        ? <span className="appt-doctor-badge"><User size={11} strokeWidth={1.6} />{a.doctorName}</span>
                        : <span className="appt-cell-slash">—</span>}
                    </td>
                    <td data-label="DATE & TIME">
                      <div className="appt-cell-name">{(a.bookingDate || '').trim() || '—'}</div>
                      {a.bookingTime && <div className="appt-cell-phone">{a.bookingTime}</div>}
                    </td>
                    <td data-label="TYPE" className="appt-cell-muted">{(a.visitType || '').trim() || '—'}</td>
                    <td data-label="PACKAGE">
                      {a.packageName ? (
                        <span className="appt-metadata-badge appt-metadata-package" title={`Expires: ${a.packageExpiry ?? 'N/A'}`}>
                          {a.packageName}
                        </span>
                      ) : (
                        <span className="appt-cell-slash">—</span>
                      )}
                    </td>
                    <td data-label="STATUS"><StatusBadge status={a.status} size="sm" /></td>
                    <td data-label="TOKEN">
                      {a.tokenNo
                        ? <span className="appt-cell-token">T{a.tokenNo}</span>
                        : <span className="appt-cell-slash">—</span>}
                    </td>
                    <td data-label="ACTIONS">
                      {/* ── Kebab trigger ── */}
                      <div className="appt-kebab-wrap">
                        <button
                          className="appt-kebab-btn"
                          title="Actions"
                          onClick={(e) => toggleMenu(a.id, e.currentTarget)}
                        >
                          <MoreVertical size={15} strokeWidth={2} />
                        </button>
                      </div>

                      {/* ── Portal menu — always fully visible ── */}
                      {openMenuId === a.id && menuPos && createPortal(
                        <div
                          ref={menuRef}
                          className="appt-kebab-menu"
                          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
                        >
                          {quickStatuses.filter(q => q.s !== a.status).map(q => (
                            <button
                              key={q.s}
                              className="appt-kebab-item"
                              style={{ color: q.color }}
                              onClick={() => { handleStatusChange(a.id, q.s); setOpenMenuId(null); setMenuPos(null); }}
                            >
                              {q.label}
                            </button>
                          ))}
                          <div className="appt-kebab-divider" />
                          <button className="appt-kebab-item" onClick={() => { handlePrintSlip(a); setOpenMenuId(null); setMenuPos(null); }}>
                            <Printer size={13} strokeWidth={1.6} /> Print Slip
                          </button>
                          <button
                            className="appt-kebab-item"
                            onClick={() => { setDrawerApptId(a.id); setIsDrawerOpen(true); setOpenMenuId(null); }}
                          >
                            <Edit2 size={13} strokeWidth={1.6} /> Edit
                          </button>
                          {confirmDel === a.id ? (
                            <>
                              <button className="appt-kebab-item is-confirm" onClick={() => { handleDelete(a.id); setOpenMenuId(null); setMenuPos(null); }}>
                                ✓ Confirm Delete
                              </button>
                              <button className="appt-kebab-item" onClick={() => { setConfirmDel(null); setOpenMenuId(null); setMenuPos(null); }}>
                                ✕ Cancel
                              </button>
                            </>
                          ) : (
                            <button className="appt-kebab-item is-danger" onClick={() => setConfirmDel(a.id)}>
                              <Trash2 size={13} strokeWidth={1.6} /> Delete
                            </button>
                          )}
                        </div>,
                        document.body
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="appt-card-grid">
            {data.map(a => (
              <div key={a.id} className="appt-grid-card-minimal animate-fade-in">
                <div className="appt-grid-card-header">
                  <div className="pat-avatar pat-avatar--md">
                    {(a.patientNameFromCase?.[0] || a.patientName?.[0] || '?').toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="appt-grid-card-patient">{a.patientNameFromCase ?? a.patientName ?? '—'}</div>
                    <div className="appt-grid-card-phone">{a.phone ?? 'No phone'}</div>
                  </div>
                  <StatusBadge status={a.status} size="sm" />
                </div>

                <div className="appt-grid-card-body-minimal">
                  <div className="appt-grid-detail-item">
                    <span className="label"><Stethoscope size={14} /> Doctor</span>
                    <span className="value">{a.doctorName ?? '—'}</span>
                  </div>
                  <div className="appt-grid-detail-item">
                    <span className="label"><Clock size={14} /> Time</span>
                    <span className="value">{a.bookingDate} at {a.bookingTime ?? '—'}</span>
                  </div>
                  <div className="appt-grid-detail-item">
                    <span className="label"><Activity size={14} /> Visit Type</span>
                    <span className="value">{a.visitType ?? '—'}</span>
                  </div>
                  <div className="appt-grid-detail-item">
                    <span className="label"><Tag size={14} /> Token</span>
                    <span className="value">{a.tokenNo ? `T${a.tokenNo}` : '—'}</span>
                  </div>
                </div>
                <div className="appt-grid-card-actions-minimal">
                  <button className="appt-btn-minimal white-pill" style={{ flex: '0 0 auto' }} onClick={() => handlePrintSlip(a)}>
                    <Printer size={14} />
                  </button>
                  <button
                    className="appt-btn-minimal white-pill"
                    onClick={() => { setDrawerApptId(a.id); setIsDrawerOpen(true); }}
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  {confirmDel === a.id ? (
                    <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                      <button className="appt-btn-minimal danger-bg" style={{ flex: 1, borderRadius: 8 }} onClick={() => handleDelete(a.id)}>Confirm</button>
                      <button className="appt-btn-minimal white-pill" style={{ flex: 0 }} onClick={() => setConfirmDel(null)}><X size={14} /></button>
                    </div>
                  ) : (
                    <button className="appt-btn-minimal danger-text-only" onClick={() => setConfirmDel(a.id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Pagination */}
      {totalEntries > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={totalEntries}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      <AppointmentFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        appointmentId={drawerApptId}
        onSuccess={() => {
          listQuery.refetch();
          todayQuery.refetch();
        }}
      />
      <style>{`
        @media (max-width: 768px) {
          .appt-page .pp-table-scroll {
            overflow: visible !important;
            border: none !important;
            background: transparent !important;
          }
          .appt-page .pp-table {
            display: block !important;
            width: 100% !important;
          }
          .appt-page .pp-table thead {
            display: none !important;
          }
          .appt-page .pp-table tbody {
            display: block !important;
            width: 100% !important;
          }
          .appt-page .pp-table tr {
            display: block !important;
            margin-bottom: 20px !important;
            background: var(--bg-card) !important;
            border: 1px solid var(--border-main) !important;
            border-radius: 18px !important;
            padding: 8px 0 !important;
            box-shadow: var(--pp-shadow-sm) !important;
            position: relative !important;
            overflow: hidden !important;
          }
          .appt-page .pp-table td {
            display: flex !important;
            flex-direction: column !important;
            gap: 4px !important;
            padding: 12px 20px !important;
            border-bottom: 1px dashed var(--border-main) !important;
            min-height: auto !important;
            text-align: left !important;
            width: 100% !important;
            align-items: flex-start !important;
            background: transparent !important;
          }
          .appt-page .pp-table td:last-child {
            border-bottom: none !important;
            background: var(--bg-surface-2) !important;
            padding: 16px 20px !important;
            margin-top: 0 !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .appt-page .pp-table td::before {
            content: attr(data-label) !important;
            display: block !important;
            font-size: 10px !important;
            font-weight: 800 !important;
            color: var(--text-muted) !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
            margin-bottom: 4px !important;
          }
          .appt-page .pp-table td:last-child::before {
            content: 'QUICK ACTIONS' !important;
            margin-bottom: 0 !important;
          }
          .appt-page .pp-table td > *:not(::before) {
            display: block !important;
            width: 100% !important;
            text-align: left !important;
          }
          .appt-page .pp-table td:last-child > *:not(::before) {
            width: auto !important;
            text-align: right !important;
          }
          .appt-cell-name {
            font-size: 0.95rem !important;
            font-weight: 700 !important;
            color: var(--pp-ink) !important;
            text-align: left !important;
          }
          .appt-cell-phone {
            font-size: 0.8rem !important;
            color: var(--pp-text-3) !important;
            display: block !important;
            text-align: left !important;
          }
        }
      `}</style>
    </div>
  );
}
