import { useState } from 'react';
import {
  List, Grid, Plus, Search, Filter, Calendar, Clock, User,
  ChevronRight, Trash2, Edit2, CheckCircle, XCircle, RefreshCw,
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
    page,
    limit: 40,
  });

  const updateStatus = useUpdateStatus();
  const deleteMut    = useDeleteAppointment();

  const data   = tab === 'today' ? (todayQuery.data ?? []) : (listQuery.data?.data ?? []);
  const total  = tab === 'today' ? data.length : (listQuery.data?.total ?? 0);
  const isPending = (tab === 'today' ? todayQuery.isLoading : listQuery.isLoading);

  const handleStatusChange = async (id: number, newStatus: string) => {
    await updateStatus.mutateAsync({ id, status: newStatus });
  };

  const handleDelete = async (id: number) => {
    await deleteMut.mutateAsync(id);
    setConfirmDel(null);
  };

  const openEdit = (a: Appointment) => { setEditAppt(a); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditAppt(null); };

  const quickStatuses = [
    { s: AppointmentStatus.Confirmed,    label: 'Confirm',   color: '#2563EB' },
    { s: AppointmentStatus.Arrived,      label: 'Arrived',   color: '#059669' },
    { s: AppointmentStatus.Consultation, label: 'In Room',   color: '#7C3AED' },
    { s: AppointmentStatus.Done,         label: 'Done',      color: '#16A34A' },
    { s: AppointmentStatus.Absent,       label: 'Absent',    color: '#94A3B8' },
    { s: AppointmentStatus.Cancelled,    label: 'Cancel',    color: '#DC2626' },
  ];

  return (
    <div className="appt-page">
      {/* Header */}
      <div className="appt-header">
        <div>
          <h1 className="appt-header-title">
            <List size={20} strokeWidth={1.6} style={{ color: '#2563EB' }} />
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
          <div style={{ display: 'inline-flex', border: '1px solid #e2e8f0', borderRadius: 999, overflow: 'hidden', background: 'white' }}>
            <button
              type="button"
              className="appt-btn"
              onClick={() => setViewMode('list')}
              style={{ border: 'none', borderRadius: 0, background: viewMode === 'list' ? '#eff6ff' : 'transparent', color: viewMode === 'list' ? '#1d4ed8' : '#64748b', padding: '8px 12px' }}
            >
              <List size={14} strokeWidth={1.6} /> List
            </button>
            <button
              type="button"
              className="appt-btn"
              onClick={() => setViewMode('grid')}
              style={{ border: 'none', borderRadius: 0, background: viewMode === 'grid' ? '#eff6ff' : 'transparent', color: viewMode === 'grid' ? '#1d4ed8' : '#64748b', padding: '8px 12px' }}
            >
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
        <div className="appt-filters" style={{ marginBottom: 16 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} strokeWidth={1.6} style={{ position: 'absolute', left: 9, color: '#888786' }} />
            <input
              className="appt-filter-input"
              style={{ paddingLeft: 30, width: 200 }}
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

      {/* Table */}
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
          <div style={{ overflowX: 'auto' }}>
            <table className="appt-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date & Time</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Token</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map(a => (
                  <tr key={a.id}>
                    <td style={{ color: '#888786', fontFamily: 'monospace', fontSize: '0.78rem' }}>#{a.id}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0F0F0E' }}>{a.patientNameFromCase ?? a.patientName ?? '—'}</div>
                      {a.phone && <div style={{ fontSize: '0.75rem', color: '#888786' }}>{a.phone}</div>}
                    </td>
                    <td>
                      {a.doctorName
                        ? <span className="appt-doctor-badge"><User size={11} strokeWidth={1.6} />{a.doctorName}</span>
                        : <span style={{ color: '#888786' }}>—</span>}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', color: '#0F0F0E' }}>{a.bookingDate ?? '—'}</div>
                      {a.bookingTime && <div style={{ fontSize: '0.72rem', color: '#888786' }}>{a.bookingTime}</div>}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: '#4A4A47' }}>{a.visitType ?? '—'}</td>
                    <td><StatusBadge status={a.status} size="sm" /></td>
                    <td>
                      {a.tokenNo
                        ? <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563EB', fontSize: '0.88rem' }}>T{a.tokenNo}</span>
                        : <span style={{ color: '#888786', fontSize: '0.75rem' }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
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
                            <button
                              className="appt-btn appt-btn-sm"
                              style={{ color: '#DC2626', borderColor: '#FECACA', background: '#FEF2F2' }}
                              onClick={() => handleDelete(a.id)}
                            >
                              Confirm
                            </button>
                            <button className="appt-btn appt-btn-sm" onClick={() => setConfirmDel(null)}>✕</button>
                          </>
                        ) : (
                          <button className="appt-btn appt-btn-icon appt-btn-sm" title="Delete" onClick={() => setConfirmDel(a.id)}>
                            <Trash2 size={13} strokeWidth={1.6} style={{ color: '#DC2626' }} />
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
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            {data.map((a) => (
              <div key={a.id} className="appt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{a.patientNameFromCase ?? a.patientName ?? 'Unknown Patient'}</div>
                    {a.phone && <div style={{ fontSize: 12, color: '#64748b' }}>{a.phone}</div>}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', background: '#eff6ff', borderRadius: 999, padding: '6px 10px' }}>{a.status}</span>
                </div>
                <div style={{ display: 'grid', gap: 8, color: '#475569', fontSize: 13 }}>
                  <div><strong>Doctor:</strong> {a.doctorName ?? 'N/A'}</div>
                  <div><strong>Date:</strong> {a.bookingDate ?? '—'} {a.bookingTime ? `at ${a.bookingTime}` : ''}</div>
                  <div><strong>Type:</strong> {a.visitType ?? '—'}</div>
                  <div><strong>Token:</strong> {a.tokenNo ? `T${a.tokenNo}` : '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button className="appt-btn appt-btn-sm" onClick={() => openEdit(a)}>Edit</button>
                  <button className="appt-btn appt-btn-sm" onClick={() => setConfirmDel(a.id === confirmDel ? null : a.id)} style={{ background: '#fee2e2', borderColor: '#fecaca', color: '#dc2626' }}>Delete</button>
                  {confirmDel === a.id && (
                    <button className="appt-btn appt-btn-sm" onClick={() => handleDelete(a.id)} style={{ background: '#fde8e8', borderColor: '#fca5a5', color: '#b91c1c' }}>Confirm Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {tab !== 'today' && total > 40 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #E3E2DF', display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#888786' }}>Page {page} · {total} total</span>
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
