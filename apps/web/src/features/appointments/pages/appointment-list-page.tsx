import { useState } from 'react';
import {
  List, Grid, Plus, Search, Filter, Calendar, Clock, User,
  Trash2, Edit2, RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppointmentStatus } from '@mmc/types';
import type { Appointment } from '@mmc/types';
import {
  useAppointments, useTodayAppointments,
  useUpdateStatus, useDeleteAppointment,
} from '../hooks/use-appointments';
import { AppointmentForm } from '../components/appointment-form';
import { StatusBadge } from '../components/status-badge';
import '../styles/appointments.css';

const STATUS_OPTIONS = ['', ...Object.values(AppointmentStatus)];
type Tab = 'all' | 'today' | 'pending';

export default function AppointmentListPage() {
  const today = new Date().toISOString().split('T')[0];

  const [tab,        setTab]        = useState<Tab>('today');
  const [search,     setSearch]     = useState('');
  const [status,     setStatus]     = useState('');
  const [fromDate,   setFromDate]   = useState('');
  const [toDate,     setToDate]     = useState('');
  const [page,       setPage]       = useState(1);
  const [showForm,   setShowForm]   = useState(false);
  const [editAppt,   setEditAppt]   = useState<Appointment | null>(null);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const [viewMode,   setViewMode]   = useState<'list' | 'grid'>('list');

  const todayQuery = useTodayAppointments();
  const listQuery  = useAppointments({
    search:    search  || undefined,
    status:    status  || undefined,
    from_date: fromDate || (tab === 'all' ? undefined : today),
    to_date:   toDate  || (tab === 'all' ? undefined : today),
    page, limit: 40,
  });

  const updateStatus = useUpdateStatus();
  const deleteMut    = useDeleteAppointment();

  const data      = tab === 'today' ? (todayQuery.data ?? []) : (listQuery.data?.data ?? []);
  const total     = tab === 'today' ? data.length : (listQuery.data?.total ?? 0);
  const isPending = tab === 'today' ? todayQuery.isLoading : listQuery.isLoading;

  const handleStatusChange = async (id: number, newStatus: string) => {
    await updateStatus.mutateAsync({ id, status: newStatus });
  };
  const handleDelete = async (id: number) => {
    await deleteMut.mutateAsync(id);
    setConfirmDel(null);
  };
  const openEdit  = (a: Appointment) => { setEditAppt(a); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditAppt(null); };

  const quickStatuses = [
    { s: AppointmentStatus.Confirmed,    label: 'Confirm',   color: 'var(--pp-blue)' },
    { s: AppointmentStatus.Arrived,     label: 'Arrived',   color: 'var(--pp-green-mid)' },
    { s: AppointmentStatus.Consultation,label: 'In Room',  color: 'var(--pp-purple)' },
    { s: AppointmentStatus.Done,        label: 'Done',      color: 'var(--pp-success-fg)' },
    { s: AppointmentStatus.Absent,      label: 'Absent',    color: 'var(--pp-text-3)' },
    { s: AppointmentStatus.Cancelled,   label: 'Cancel',   color: 'var(--pp-danger-fg)' },
  ];

  return (
    <div className="appt-page">
      {/* Header */}
      <div className="appt-header">
        <div>
          <h1 className="appt-header-title">
            <List size={20} strokeWidth={1.6} className="appt-panel-title-icon" />
            Appointments
          </h1>
          <p className="appt-header-sub">{total} appointment{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="appt-header-actions">
          <Link to="/appointments/calendar" className="appt-btn">
            <Calendar size={14} strokeWidth={1.6} /> Calendar
          </Link>
          <Link to="/appointments/queue" className="appt-btn">
            <Clock size={14} strokeWidth={1.6} /> Queue
          </Link>
          <div className="appt-view-toggle">
            <button type="button" className={`appt-view-btn${viewMode === 'list' ? ' is-active' : ''}`} onClick={() => setViewMode('list')}>
              <List size={14} strokeWidth={1.6} /> List
            </button>
            <button type="button" className={`appt-view-btn${viewMode === 'grid' ? ' is-active' : ''}`} onClick={() => setViewMode('grid')}>
              <Grid size={14} strokeWidth={1.6} /> Grid
            </button>
          </div>
          <button className="appt-btn appt-btn-primary" onClick={() => { setEditAppt(null); setShowForm(true); }}>
            <Plus size={14} strokeWidth={1.6} /> New Booking
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="appt-tabs">
        {([['today','Today'], ['all','All Appointments'], ['pending','Pending Queue']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} className={`appt-tab ${tab === key ? 'active' : ''}`} onClick={() => { setTab(key); setPage(1); }}>
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {tab !== 'today' && (
        <div className="appt-filters">
          <div className="appt-search-wrap">
            <Search size={14} className="appt-search-icon" strokeWidth={1.6} />
            <input
              className="appt-filter-input appt-search-input"
              placeholder="Search patient / phone…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select className="appt-filter-input" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="appt-filter-input" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} title="From Date" />
          <input className="appt-filter-input" type="date" value={toDate} onChange={e => setToDate(e.target.value)} title="To Date" />
          <button className="appt-btn appt-btn-sm" onClick={() => { setSearch(''); setStatus(''); setFromDate(''); setToDate(''); setPage(1); }}>
            <Filter size={13} strokeWidth={1.6} /> Clear
          </button>
        </div>
      )}

      {/* Table / Grid */}
      <div className="appt-card">
        {isPending ? (
          <div className="appt-empty">
            <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
          </div>
        ) : data.length === 0 ? (
          <div className="appt-empty">
            <Calendar size={28} className="appt-empty-icon" />
            <p className="appt-empty-text">No appointments found</p>
            <button className="appt-btn appt-btn-primary appt-btn-sm" style={{ marginTop: 12 }}
              onClick={() => setShowForm(true)}>
              + New Booking
            </button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="appt-table-scroll">
            <table className="appt-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date &amp; Time</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Token</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map(a => (
                  <tr key={a.id}>
                    <td><span className="appt-cell-id">#{a.id}</span></td>
                    <td>
                      <div className="appt-cell-name">{a.patientNameFromCase ?? a.patientName ?? '—'}</div>
                      {a.phone && <div className="appt-cell-phone">{a.phone}</div>}
                    </td>
                    <td>
                      {a.doctorName
                        ? <span className="appt-doctor-badge"><User size={11} strokeWidth={1.6} />{a.doctorName}</span>
                        : <span className="appt-cell-slash">—</span>}
                    </td>
                    <td>
                      <div className="appt-cell-name">{a.bookingDate ?? '—'}</div>
                      {a.bookingTime && <div className="appt-cell-phone">{a.bookingTime}</div>}
                    </td>
                    <td className="appt-cell-muted">{a.visitType ?? '—'}</td>
                    <td><StatusBadge status={a.status} size="sm" /></td>
                    <td>
                      {a.tokenNo
                        ? <span className="appt-cell-token">T{a.tokenNo}</span>
                        : <span className="appt-cell-slash">—</span>}
                    </td>
                    <td>
                      <div className="appt-row-actions">
                        {quickStatuses
                          .filter(q => q.s !== a.status)
                          .slice(0, 2)
                          .map(q => (
                            <button
                              key={q.s}
                              className="appt-btn appt-btn-sm"
                              style={{ fontSize: '0.7rem', padding: '3px 8px', color: q.color, borderColor: q.color + '44', background: q.color + '0F' }}
                              onClick={() => handleStatusChange(a.id, q.s)}
                            >
                              {q.label}
                            </button>
                          ))}
                        <button className="appt-btn appt-btn-icon appt-btn-sm" title="Edit" onClick={() => openEdit(a)}>
                          <Edit2 size={13} strokeWidth={1.6} />
                        </button>
                        {confirmDel === a.id ? (
                          <>
                            <button className="appt-btn appt-btn-sm appt-btn-danger" onClick={() => handleDelete(a.id)}>
                              Confirm
                            </button>
                            <button className="appt-btn appt-btn-sm" onClick={() => setConfirmDel(null)}>✕</button>
                          </>
                        ) : (
                          <button className="appt-btn appt-btn-icon appt-btn-sm" title="Delete" onClick={() => setConfirmDel(a.id)}>
                            <Trash2 size={13} strokeWidth={1.6} className="appt-btn-danger-text" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="appt-card-grid">
            {data.map(a => (
              <div key={a.id} className="appt-card appt-grid-card">
                <div className="appt-grid-card-header">
                  <div>
                    <div className="appt-grid-card-patient">{a.patientNameFromCase ?? a.patientName ?? 'Unknown Patient'}</div>
                    {a.phone && <div className="appt-grid-card-phone">{a.phone}</div>}
                  </div>
                  <StatusBadge status={a.status} size="sm" />
                </div>
                <div className="appt-grid-card-detail">
                  <div><strong>Doctor:</strong> {a.doctorName ?? 'N/A'}</div>
                  <div><strong>Date:</strong> {a.bookingDate ?? '—'} {a.bookingTime ? `at ${a.bookingTime}` : ''}</div>
                  <div><strong>Type:</strong> {a.visitType ?? '—'}</div>
                  <div><strong>Token:</strong> {a.tokenNo ? `T${a.tokenNo}` : '—'}</div>
                </div>
                <div className="appt-grid-card-actions">
                  <button className="appt-btn appt-btn-sm" onClick={() => openEdit(a)}>Edit</button>
                  {confirmDel === a.id ? (
                    <>
                      <button className="appt-btn appt-btn-sm appt-btn-danger" onClick={() => handleDelete(a.id)}>Confirm Delete</button>
                      <button className="appt-btn appt-btn-sm" onClick={() => setConfirmDel(null)}>Cancel</button>
                    </>
                  ) : (
                    <button className="appt-btn appt-btn-sm appt-btn-danger" onClick={() => setConfirmDel(a.id)}>Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {tab !== 'today' && total > 40 && (
          <div className="appt-pagination">
            <span className="appt-page-info">Page {page} · {total} total</span>
            <button className="appt-btn appt-btn-sm appt-btn-icon" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            <button className="appt-btn appt-btn-sm appt-btn-icon" disabled={page * 40 >= total} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}
      </div>

      {showForm && (
        <AppointmentForm
          editAppointment={editAppt}
          onClose={closeForm}
        />
      )}
    </div>
  );
}
