import { useState, useEffect, useMemo } from 'react';
import {
  Clock, UserCheck, CheckCircle2, Users, RefreshCw, Ticket,
  ChevronRight, Activity, ChevronLeft, LayoutGrid, List, Volume2
} from 'lucide-react';
import { useWaitlist, useCallNext, useCompleteVisit } from '@/features/appointments/hooks/use-appointments';
import { useDoctors } from '@/features/appointments/hooks/use-doctors';
import { useAuthStore } from '@/shared/stores/auth-store';
import { apiClient } from '@/infrastructure/api-client';
import { VitalsFormModal } from '@/features/medical-case/components/vitals-form-modal';
import { EmptyState } from '@/components/shared/empty-state';
import '@/features/appointments/styles/appointments.css';

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

export default function PatientQueuePage() {
  const today = new Date().toISOString().split('T')[0]!;
  const user = useAuthStore((s) => s.user);
  const rawRole = ((user as any)?.type || (user as any)?.role || (user as any)?.roleName || '').toLowerCase();
  const isDoctor = rawRole === 'doctor' || rawRole === 'medical practitioner' || ((user as any)?.name || '').toLowerCase().startsWith('dr');

  const [doctorFilter, setDoctorFilter] = useState(() => isDoctor ? String((user as any)?.id ?? '') : '');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [activeVitals, setActiveVitals] = useState<{ visitId: number, regid: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // View & Pagination State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: doctorsList = [] } = useDoctors();

  useEffect(() => {
    if (doctorsList.length > 0) {
      setDoctors(doctorsList);
    }
  }, [doctorsList]);

  useEffect(() => {
    if (isDoctor) setDoctorFilter(String((user as any)?.id ?? ''));
  }, [isDoctor, (user as any)?.id]);

  useEffect(() => {
    setPage(1);
  }, [doctorFilter, limit, viewMode]);


  const { data: waitlist = [], isLoading: wLoading, refetch: wRefetch } = useWaitlist(today, doctorFilter ? Number(doctorFilter) : undefined);

  const callNext = useCallNext();
  const completeVisit = useCompleteVisit();

  const waiting = waitlist.filter(w => w.status === 0);
  const inProgress = waitlist.filter(w => w.status === 1);
  const done = waitlist.filter(w => w.status === 2);

  const totalItems = waiting.length;
  const totalPages = Math.ceil(totalItems / limit);
  const paginatedWaiting = waiting.slice((page - 1) * limit, page * limit);

  const fromEntry = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const toEntry = Math.min(page * limit, totalItems);

  const handleCall = async (id: number) => { await callNext.mutateAsync(id); wRefetch(); };
  const handleComplete = async (id: number) => { await completeVisit.mutateAsync(id); wRefetch(); };

  const handleStartConsult = (w: any) => {
    window.location.href = `/medical-case/entry?regid=${w.patientId}&visitId=${w.appointmentId || w.id}`;
  };

  const renderPagination = () => {
    if (totalItems === 0) return null;
    return (
      <div className="pp-pagination-bar" style={{ marginTop: 24 }}>
        <div className="pp-pagination-info-wrap">
          <div className="pp-pagination-info">
            Showing {fromEntry}-{toEntry} of {totalItems}
          </div>
          <select
            className="pp-pagination-limit"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            {[6, 12, 24, 48].map((l) => (
              <option key={l} value={l}>
                {l} per page
              </option>
            ))}
          </select>
        </div>

        <div className="pp-pagination-controls">
          <button
            className="pp-pagination-btn"
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
                  className={`pp-pagination-page ${page === p ? 'is-active' : ''}`}
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
            className="pp-pagination-btn"
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
      {paginatedWaiting.map(w => (
        <div key={w.id} className="appt-token-card-minimal">
          <div className="appt-token-header-minimal">
            <div className="appt-token-badge-wrap">
              <div className="appt-token-num-minimal" style={{ color: WAIT_COLOR[w.status] }}>W{w.waitingNumber}</div>
              <div className="appt-token-status-label" style={{ color: WAIT_COLOR[w.status] }}>{WAIT_STATUS[w.status]}</div>
            </div>
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
            <button className="appt-btn appt-btn-sm appt-btn-primary" onClick={() => handleCall(w.id)} disabled={callNext.isPending}>
              <ChevronRight size={13} strokeWidth={1.6} /> Call Patient
            </button>
            <button
              className="appt-btn appt-btn-sm appt-btn-purple"
              onClick={() => setActiveVitals({ visitId: w.appointmentId || w.id, regid: w.patientId ?? 0 })}
            >
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
              <th style={{ textAlign: 'center' }}>TOKEN</th>
              <th style={{ textAlign: 'center' }}>PATIENT</th>
              <th style={{ textAlign: 'center' }}>DOCTOR</th>
              <th style={{ textAlign: 'center' }}>WAIT TIME</th>
              <th style={{ textAlign: 'center' }}>STATUS</th>
              <th style={{ textAlign: 'center' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {paginatedWaiting.map(w => (
              <tr key={w.id} className="appt-table-row-minimal">
                <td data-label="TOKEN" style={{ textAlign: 'center' }}>
                  <span className="appt-token-pill" style={{ color: WAIT_COLOR[w.status] }}>W{w.waitingNumber}</span>
                </td>
                <td data-label="PATIENT" style={{ textAlign: 'center' }}>
                  <div className="appt-patient-info" style={{ display: 'flex', justifyContent: 'center' }}>
                    <div className="appt-cell-name">{w.patientName ?? `Patient #${w.patientId}`}</div>
                  </div>
                </td>
                <td data-label="DOCTOR" className="appt-cell-muted" style={{ textAlign: 'center' }}>{w.doctorName ?? '—'}</td>
                <td data-label="WAIT TIME" className="appt-cell-muted" style={{ textAlign: 'center' }}>{formatWaitTime(w.checkedInAt || w.createdAt)}</td>
                <td data-label="STATUS" style={{ textAlign: 'center' }}>
                  <span className={`appt-status-pill-minimal waiting`}>
                    {WAIT_STATUS[w.status]}
                  </span>
                </td>
                <td data-label="ACTION" style={{ textAlign: 'center' }}>
                  <div className="appt-row-actions-minimal" style={{ display: 'flex', justifyContent: 'center' }}>
                    <button className="appt-btn appt-btn-xs appt-btn-primary" onClick={() => handleCall(w.id)} disabled={callNext.isPending}>
                      <Volume2 size={13} /> Call
                    </button>
                    <button className="appt-btn appt-btn-xs appt-btn-purple" onClick={() => setActiveVitals({ visitId: w.appointmentId || w.id, regid: w.patientId ?? 0 })}>
                      <Activity size={13} /> Vitals
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {renderPagination()}
    </div>
  );

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
          {isDoctor ? (
            <span style={{ fontSize: 13, color: 'var(--pp-muted)', padding: '0 8px' }}>
              Showing: <strong>{(user as any)?.name ?? 'My Queue'}</strong>
            </span>
          ) : (
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
        </div>
      </div>

      {/* Quick Stats */}
      <div className="appt-stats-bar" style={{ marginBottom: '32px' }}>
        {[
          { label: 'Waiting', value: waiting.length, bg: 'var(--pp-warning-bg)', ic: '#d97706', icon: <Clock size={20} strokeWidth={2} /> },
          { label: 'Consulting', value: inProgress.length, bg: 'var(--pp-blue-tint)', ic: 'var(--pp-blue)', icon: <UserCheck size={20} strokeWidth={2} /> },
          { label: 'Completed', value: done.length, bg: 'var(--pp-success-bg)', ic: '#059669', icon: <CheckCircle2 size={20} strokeWidth={2} /> },
        ].map(item => (
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
                <div key={w.id} className="appt-token-card-minimal calling">
                  <div className="appt-token-header-minimal">
                    <div className="appt-token-badge-wrap">
                      <div className="appt-token-num-minimal" style={{ color: WAIT_COLOR[w.status] }}>W{w.waitingNumber}</div>
                      <div className="appt-token-status-label" style={{ color: WAIT_COLOR[w.status] }}>{WAIT_STATUS[w.status]}</div>
                    </div>
                    <span className="appt-calling-dot" />
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
                    <button className="appt-btn appt-btn-sm appt-btn-primary" onClick={() => handleStartConsult(w)}>
                      <Activity size={13} strokeWidth={2} /> Consult
                    </button>
                    <button className="appt-btn appt-btn-sm appt-btn-success" onClick={() => handleComplete(w.id)} disabled={completeVisit.isPending}>
                      <CheckCircle2 size={13} strokeWidth={1.6} /> Finish
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waiting List */}
        <div className="appt-section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Waiting Queue ({waiting.length})</span>
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
        ) : waiting.length === 0 ? (
          <EmptyState 
            icon={Users}
            title="Waiting room is empty"
            description="There are no patients currently in the waiting queue. All checked-in patients have been addressed."
            variant="card"
            className="my-8"
          />
        ) : (
          <>
            {viewMode === 'grid' ? (
              <>
                {renderGridView()}
                {renderPagination()}
              </>
            ) : renderListView()}
          </>
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
