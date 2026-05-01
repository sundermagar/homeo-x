import { useState, useEffect } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, List,
  Stethoscope, CalendarDays, Users, RefreshCw, CalendarPlus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppointments } from '../hooks/use-appointments';
import { StatusBadge, STATUS_COLOR } from '../components/status-badge';
import { apiClient } from '@/infrastructure/api-client';
import '../styles/appointments.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

interface Doctor { id: number; name: string; }

function fmtDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

export default function CalendarPage() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [doctorFilter, setDoctorFilter] = useState('');
  const [doctors, setDoctors]  = useState<Doctor[]>([]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow    = new Date(year, month, 1).getDay();
  const fromDate    = fmtDate(year, month, 1);
  const toDate      = fmtDate(year, month, daysInMonth);
  const todayISO    = fmtDate(now.getFullYear(), now.getMonth(), now.getDate());

  const { data, isLoading, refetch } = useAppointments({
    from_date: fromDate,
    to_date:   toDate,
    doctor_id: doctorFilter ? Number(doctorFilter) : undefined,
    limit: 100,
  });

  // Build date→appointments map
  const apptMap: Record<string, NonNullable<typeof data>['data']> = {};
  (data?.data ?? []).forEach(a => {
    const d = a.bookingDate ?? '';
    if (!apptMap[d]) apptMap[d] = [];
    apptMap[d].push(a);
  });

  useEffect(() => {
    apiClient.get('/doctors').then(({ data: d }) => {
      setDoctors(Array.isArray(d) ? d : []);
    }).catch(() => {});
  }, []);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); setSelectedDay(null); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); setSelectedDay(null); };

  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(fmtDate(year, month, d));

  const selectedAppts = selectedDay ? (apptMap[selectedDay] ?? []) : [];
  const totalAppts   = data?.total ?? 0;

  return (
    <div className="appt-page">
      {/* Header */}
      <div className="appt-header">
        <div>
          <h1 className="appt-header-title">
            <Calendar size={20} strokeWidth={1.6} className="appt-panel-title-icon" />
            Appointment Calendar
          </h1>
          <p className="appt-header-sub">Manage practitioner schedules and availability</p>
        </div>
        <div className="appt-header-actions">
          <Link
            to={`/appointments/add?date=${selectedDay ?? todayISO}`}
            className="appt-btn appt-btn-primary"
          >
            <Plus size={15} strokeWidth={1.6} /> New Booking
          </Link>

        </div>
      </div>

      {/* Main grid */}
      <div className="appt-cal-wrap">
        {/* Calendar card */}
        <div className="appt-card">
          {/* Nav */}
          <div className="appt-card-header">
            <div className="appt-cal-nav">
              <button className="appt-btn appt-btn-icon" onClick={prevMonth}><ChevronLeft size={15} strokeWidth={1.6} /></button>
              <span className="appt-cal-month-label">{MONTHS[month]} {year}</span>
              <button className="appt-btn appt-btn-icon" onClick={nextMonth}><ChevronRight size={15} strokeWidth={1.6} /></button>
            </div>
            <button
              className="appt-btn appt-btn-sm"
              onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelectedDay(todayISO); }}
            >
              Today
            </button>
          </div>

          <div className="appt-cal-body">
            {/* Day headers */}
            <div className="appt-cal-grid-header">
              {DAYS.map(d => <div key={d} className="appt-cal-dow">{d}</div>)}
            </div>

            {/* Cells */}
            {isLoading ? (
              <div className="appt-cal-shimmer-cells">
                {[...Array(35)].map((_, i) => (
                  <div key={i} className="appt-cal-shimmer-cell" />
                ))}
              </div>
            ) : (
              <div className="appt-cal-cells">
                {cells.map((iso, idx) => {
                  if (!iso) return <div key={`e-${idx}`} />;
                  const dayAppts = apptMap[iso] ?? [];
                  const isToday  = iso === todayISO;
                  const isSel    = iso === selectedDay;
                  const dNum     = parseInt(iso!.split('-')[2]!, 10);

                  return (
                    <div
                      key={iso}
                      className={`appt-cal-cell${isToday ? ' today' : ''}${isSel ? ' selected' : ''}`}
                      onClick={() => setSelectedDay(isSel ? null : iso)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <span
                          className={isToday ? 'appt-cal-day-num appt-cal-day-today' : 'appt-cal-day-num'}
                          style={{ fontSize: '0.82rem', fontWeight: isToday ? 800 : 600, color: isToday ? 'var(--pp-blue)' : 'var(--pp-ink)' }}
                        >
                          {dNum}
                        </span>
                        {isToday && <div className="appt-cal-dot" />}
                      </div>
                      <div className="appt-cal-bars">
                        {dayAppts.slice(0, 3).map((a, i) => (
                          <div key={i} className="appt-cal-bar" style={{ background: STATUS_COLOR[a.status] ?? 'var(--pp-warm-4)' }} />
                        ))}
                      </div>
                      {dayAppts.length > 0 && (
                        <div className="appt-cal-count">{dayAppts.length} slot{dayAppts.length > 1 ? 's' : ''}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="appt-legend">
              {Object.entries(STATUS_COLOR).map(([label, color]) => (
                <div key={label} className="appt-legend-item">
                  <div className="appt-legend-swatch" style={{ background: color }} />
                  <span className="appt-legend-label">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="appt-side-panel">
          {/* Schedule panel */}
          <div className="appt-card">
            <div className="appt-card-header">
              <h3 className="appt-card-title">
                <CalendarDays size={14} strokeWidth={1.6} className="appt-panel-title-icon" />
                {selectedDay
                  ? new Date(selectedDay + 'T12:00').toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' })
                  : 'Schedule'}
              </h3>
            </div>
            <div className="appt-card-body">
              {isLoading ? (
                <div className="appt-slot-list">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="appt-slot-item appt-shimmer" style={{ height: 62, border: 'none' }} />
                  ))}
                </div>
              ) : !selectedDay ? (
                <div className="appt-empty" style={{ minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarDays size={48} strokeWidth={1} style={{ color: '#e2e8f0', marginBottom: 16 }} />
                  <p style={{ color: '#64748b', fontSize: 16, fontWeight: 500, margin: 0 }}>Select a date to view</p>
                </div>
              ) : selectedAppts.length === 0 ? (
                <div className="appt-empty" style={{ padding: '40px 20px', background: 'var(--pp-warm-1)', borderRadius: 12, border: '1px dashed var(--pp-warm-4)' }}>
                  <CalendarPlus size={32} strokeWidth={1} style={{ color: 'var(--pp-warm-5)', marginBottom: 12 }} />
                  <p className="appt-empty-text" style={{ fontWeight: 600, color: 'var(--pp-ink)' }}>No appointments scheduled</p>
                  <p className="appt-empty-sub" style={{ fontSize: 12, color: 'var(--pp-muted)', marginBottom: 16 }}>Tap the button below to book a new slot for this day.</p>
                  <Link 
                    to={`/appointments/add?date=${selectedDay}`}
                    className="appt-btn appt-btn-primary" 
                    style={{ padding: '10px 20px' }}
                  >
                    <Plus size={16} /> Add First Slot
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="appt-slot-list" style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
                    {selectedAppts.map(a => (
                      <div key={a.id} className="appt-slot-item">
                        <div className="appt-slot-time">{a.bookingTime ?? '—'}</div>
                        <div className="appt-slot-name">
                          <div className="appt-slot-patient">{a.patientNameFromCase ?? a.patientName ?? '—'}</div>
                          {a.doctorName && <div className="appt-slot-doctor">{a.doctorName}</div>}
                        </div>
                        <StatusBadge status={a.status} size="sm" />
                      </div>
                    ))}
                  </div>
                  <div style={{ position: 'sticky', bottom: 0, paddingTop: 12, background: 'linear-gradient(to top, #fff 80%, rgba(255,255,255,0))', marginTop: -4 }}>
                    <Link 
                      to={`/appointments/add?date=${selectedDay}`}
                      className="appt-btn appt-btn-primary" 
                      style={{ width: '100%', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)' }}
                    >
                      <Plus size={16} /> Add Slot
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Insights */}
          <div className="appt-card">
            <div className="appt-card-header">
              <h3 className="appt-card-title">
                <Stethoscope size={14} strokeWidth={1.6} className="appt-panel-title-icon" /> Insights
              </h3>
            </div>
            <div className="appt-card-body">
              {isLoading ? (
                <div className="appt-insights-grid">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="appt-insight-item appt-shimmer" style={{ height: 48, borderRadius: 8 }} />
                  ))}
                </div>
              ) : (
                <div className="appt-insights-grid">
                  {([
                    { label: 'Total This Month', value: totalAppts, icon: <CalendarDays size={15} strokeWidth={1.6} />, bg: 'var(--pp-blue-tint)', ic: 'var(--pp-blue)' },
                    { label: 'Avg Daily Load', value: `${daysInMonth > 0 ? Math.round((totalAppts / daysInMonth) * 10) / 10 : 0} / day`, icon: <Users size={15} strokeWidth={1.6} />, bg: 'var(--pp-success-bg)', ic: 'var(--pp-success-fg)' },
                  ] as const).map(item => (
                    <div key={item.label} className="appt-insight-item">
                      <div className="appt-insight-icon-wrap" style={{ background: item.bg, color: item.ic }}>
                        {item.icon}
                      </div>
                      <div>
                        <div className="appt-insight-label">{item.label}</div>
                        <div className="appt-insight-value">{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
