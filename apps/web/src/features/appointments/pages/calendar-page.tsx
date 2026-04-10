import { useState, useCallback, useEffect } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, List,
  Stethoscope, CalendarDays, Users, RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppointments } from '../hooks/use-appointments';
import { AppointmentForm } from '../components/appointment-form';
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
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState<string | undefined>();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow    = new Date(year, month, 1).getDay();
  const fromDate    = fmtDate(year, month, 1);
  const toDate      = fmtDate(year, month, daysInMonth);
  const todayISO    = fmtDate(now.getFullYear(), now.getMonth(), now.getDate());

  const { data, isLoading, refetch } = useAppointments({
    from_date: fromDate,
    to_date:   toDate,
    doctor_id: doctorFilter ? Number(doctorFilter) : undefined,
    limit:     500,
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
      // Interceptor now returns the payload directly
      setDoctors(Array.isArray(d) ? d : []);
    }).catch(() => {});
  }, []);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); setSelectedDay(null); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); setSelectedDay(null); };

  // Calendar cells
  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(fmtDate(year, month, d));

  const selectedAppts = selectedDay ? (apptMap[selectedDay] ?? []) : [];
  const totalAppts    = data?.total ?? 0;

  return (
    <div className="appt-page">
      {/* Header */}
      <div className="appt-header">
        <div>
          <h1 className="appt-header-title">
            <Calendar size={20} strokeWidth={1.6} style={{ color: '#2563EB' }} />
            Appointment Calendar
          </h1>
          <p className="appt-header-sub">Manage practitioner schedules and availability</p>
        </div>
        <div className="appt-header-actions">
          <select
            className="appt-filter-input"
            style={{ width: 180 }}
            value={doctorFilter}
            onChange={e => { setDoctorFilter(e.target.value); setSelectedDay(null); }}
          >
            <option value="">All Practitioners</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button className="appt-btn appt-btn-sm" onClick={() => refetch()} title="Refresh">
            <RefreshCw size={14} strokeWidth={1.6} />
          </button>
          <button
            className="appt-btn appt-btn-primary"
            onClick={() => { setFormDate(selectedDay ?? todayISO); setShowForm(true); }}
          >
            <Plus size={15} strokeWidth={1.6} /> New Booking
          </button>
          <Link to="/appointments" className="appt-btn" title="List View">
            <List size={15} strokeWidth={1.6} />
          </Link>
        </div>
      </div>

      {/* Main grid */}
      <div className="appt-cal-wrap">
        {/* Calendar card */}
        <div className="appt-card">
          {/* Nav */}
          <div className="appt-card-header">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <button className="appt-btn appt-btn-icon" onClick={prevMonth}><ChevronLeft size={15} strokeWidth={1.6} /></button>
              <span style={{ fontWeight:700, fontSize:'0.95rem', color:'#0F0F0E', minWidth:140, textAlign:'center' }}>
                {MONTHS[month]} {year}
              </span>
              <button className="appt-btn appt-btn-icon" onClick={nextMonth}><ChevronRight size={15} strokeWidth={1.6} /></button>
            </div>
            <button
              className="appt-btn appt-btn-sm"
              onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelectedDay(todayISO); }}
            >
              Today
            </button>
          </div>

          <div style={{ padding:'16px 20px' }}>
            {/* Day headers */}
            <div className="appt-cal-grid-header">
              {DAYS.map(d => <div key={d} className="appt-cal-dow">{d}</div>)}
            </div>

            {/* Cells */}
            {isLoading ? (
              <div className="appt-empty"><RefreshCw size={22} className="appt-empty-icon" style={{ animation:'spin 1s linear infinite' }} /></div>
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
                      className={`appt-cal-cell ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''}`}
                      onClick={() => setSelectedDay(isSel ? null : iso)}
                    >
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                        <span
                          className={isToday ? 'appt-cal-day-today' : ''}
                          style={{ fontSize:'0.82rem', fontWeight: isToday ? 800 : 600, color: isToday ? '#2563EB' : '#0F0F0E' }}
                        >
                          {dNum}
                        </span>
                        {isToday && <div className="appt-cal-dot" />}
                      </div>
                      <div className="appt-cal-bars">
                        {dayAppts.slice(0,3).map((a, i) => (
                          <div key={i} className="appt-cal-bar" style={{ background: STATUS_COLOR[a.status] ?? '#E3E2DF' }} />
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
            <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginTop:16, paddingTop:16, borderTop:'1px solid #E3E2DF' }}>
              {Object.entries(STATUS_COLOR).map(([label, color]) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:color }} />
                  <span style={{ fontSize:'0.68rem', fontWeight:600, color:'#888786' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Schedule panel */}
          <div className="appt-card">
            <div className="appt-card-header">
              <h3 className="appt-card-title" style={{ display:'flex', alignItems:'center', gap:6 }}>
                <CalendarDays size={14} strokeWidth={1.6} style={{ color:'#2563EB' }} />
                {selectedDay ? new Date(selectedDay + 'T12:00').toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }) : 'Schedule'}
              </h3>
            </div>
            <div className="appt-card-body">
              {!selectedDay ? (
                <div className="appt-empty">
                  <CalendarDays size={22} className="appt-empty-icon" />
                  <p className="appt-empty-text">Select a date to view</p>
                </div>
              ) : selectedAppts.length === 0 ? (
                <div className="appt-empty">
                  <p className="appt-empty-text">No appointments</p>
                  <button className="appt-btn appt-btn-sm" style={{ marginTop:10 }}
                    onClick={() => { setFormDate(selectedDay); setShowForm(true); }}>
                    + Add Slot
                  </button>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {selectedAppts.map(a => (
                    <div key={a.id} style={{ padding:'10px 12px', border:'1px solid #E3E2DF', borderRadius:8, display:'flex', gap:8, alignItems:'center' }}>
                      <div style={{ fontSize:'0.75rem', fontWeight:700, color:'#888786', minWidth:52 }}>{a.bookingTime ?? '—'}</div>
                      <div style={{ flex:1, overflow:'hidden' }}>
                        <div style={{ fontSize:'0.82rem', fontWeight:600, color:'#0F0F0E', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {a.patientNameFromCase ?? a.patientName ?? '—'}
                        </div>
                        {a.doctorName && <div style={{ fontSize:'0.72rem', color:'#888786' }}>{a.doctorName}</div>}
                      </div>
                      <StatusBadge status={a.status} size="sm" />
                    </div>
                  ))}
                  <button className="appt-btn appt-btn-sm" style={{ width:'100%', marginTop:4 }}
                    onClick={() => { setFormDate(selectedDay); setShowForm(true); }}>
                    + Add Slot
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Insights */}
          <div className="appt-card">
            <div className="appt-card-header">
              <h3 className="appt-card-title" style={{ display:'flex', alignItems:'center', gap:6 }}>
                <Stethoscope size={14} strokeWidth={1.6} style={{ color:'#2563EB' }} /> Insights
              </h3>
            </div>
            <div className="appt-card-body" style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { label:'Total This Month', value: totalAppts, icon: <CalendarDays size={15} strokeWidth={1.6} />, color:'#EFF6FF', ic:'#2563EB' },
                { label:'Avg Daily Load', value: `${daysInMonth > 0 ? Math.round((totalAppts / daysInMonth) * 10) / 10 : 0} / day`, icon: <Users size={15} strokeWidth={1.6} />, color:'#F0FDF4', ic:'#16A34A' },
              ].map(item => (
                <div key={item.label} style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:32, height:32, borderRadius:6, background:item.color, color:item.ic, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontSize:'0.68rem', fontWeight:700, color:'#888786', textTransform:'uppercase', letterSpacing:'0.05em' }}>{item.label}</div>
                    <div style={{ fontSize:'1rem', fontWeight:800, color:'#0F0F0E' }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <AppointmentForm
          initialDate={formDate}
          onClose={() => setShowForm(false)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
