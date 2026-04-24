import React, { useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { usePublicClinicalData, usePatientAppointments, useBookAppointment, useCancelAppointment } from '../hooks/use-public-api';
import { PatientHeader } from '../components/patient-header';
import { PatientBottomNav } from '../components/patient-bottom-nav';
import { CalendarDays, Plus, X, Clock, ChevronLeft, ChevronRight, ChevronDown, Video, User, MapPin, FlaskConical, Activity, Sparkles, PhoneCall, AlertTriangle, Filter, Search, Building2 } from 'lucide-react';

export function PatientAppointments() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
  const { data: clinicalData, isLoading: clinicalLoading, error: clinicalError } = usePublicClinicalData(phone || '');
  const { data: appointments, isLoading: apptsLoading, refetch } = usePatientAppointments(phone || '');
  const bookMutation = useBookAppointment();
  const cancelMutation = useCancelAppointment();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [showBooking, setShowBooking] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All Status');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [cancelConfirmId, setCancelConfirmId] = useState<number | null>(null);
  const [bookForm, setBookForm] = useState({
    date: '',
    time: '10:00',
    reason: '',
  });
  const [bookSuccess, setBookSuccess] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  if (clinicalLoading) {
    return (
      <div className="patient-shell">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid #dcfce7', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  if (clinicalError || !clinicalData) {
    return <Navigate to="/verify-otp" />;
  }

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bookMutation.mutateAsync({
        phone: phone!,
        patientName: clinicalData.patientInfo.name,
        bookingDate: bookForm.date,
        bookingTime: bookForm.time,
        notes: bookForm.reason,
      });
      setBookSuccess(true);
      setShowBooking(false);
      setBookForm({ date: '', time: '10:00', reason: '' });
      refetch();
      setTimeout(() => setBookSuccess(false), 3000);
    } catch (err) {
      console.error('Booking failed:', err);
    }
  };

  // Helper: is the appointment within 6 hours?
  const isWithin6Hours = (appt: any): boolean => {
    if (!appt.bookingDate || !appt.bookingTime) return false;
    const apptDateTime = new Date(`${appt.bookingDate}T${convertTo24h(appt.bookingTime)}`);
    const diffMs = apptDateTime.getTime() - Date.now();
    return diffMs > 0 && diffMs < 6 * 3600 * 1000;
  };

  // Helper: convert "01:40 PM" -> "13:40" for Date parsing
  const convertTo24h = (time12: string): string => {
    const [time, period] = time12.split(' ');
    const [hStr, mStr] = (time || '').split(':');
    let h = parseInt(hStr || '0', 10);
    const m = mStr || '00';
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}:00`;
  };

  // Helper: parse consultation mode from notes
  const parseMode = (notes: string = ''): 'video' | 'audio' | 'in-person' => {
    if (notes.includes('Mode: video')) return 'video';
    if (notes.includes('Mode: audio')) return 'audio';
    return 'in-person';
  };

  // Parse doctor/clinic from notes field
  const parseDoctor = (notes: string = '') => {
    const m = notes.match(/Doctor: ([^,]+)/);
    return m ? m[1].trim() : 'Dr. neeraj verma';
  };
  const parseClinic = (notes: string = '') => {
    const m = notes.match(/Clinic: ([^,]+)/);
    return m ? m[1].trim() : 'homeo clinic';
  };

  const handleCancelConfirm = async (id: number) => {
    try {
      await cancelMutation.mutateAsync(id);
      setCancelConfirmId(null);
      setCancelSuccess(true);
      refetch();
      setTimeout(() => setCancelSuccess(false), 3000);
    } catch (err) {
      console.error('Cancel failed:', err);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = (appointments || []).filter((a: any) => {
    const d = new Date(a.bookingDate);
    return d >= today && a.status !== 'Cancelled';
  });

  const past = (appointments || []).filter((a: any) => {
    const d = new Date(a.bookingDate);
    return d < today || a.status === 'Cancelled';
  });

  // Apply Status Filter
  const filteredUpcoming = upcoming.filter(a => {
    if (statusFilter === 'All Status') return true;
    if (statusFilter === 'Waiting' && a.status === 'Pending') return true;
    return a.status === statusFilter;
  });

  const filteredPast = past.filter(a => {
    if (statusFilter === 'All Status') return true;
    if (statusFilter === 'Waiting' && a.status === 'Pending') return true;
    return a.status === statusFilter;
  });

  // Get tomorrow's date as min for the date picker
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0] || '';

  return (
    <div className="patient-shell">
      <PatientHeader patientName={clinicalData.patientInfo.name} />

      <main className="patient-main" style={{ padding: 0, backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '80px' }}>
        <div style={{ background: 'white', padding: '20px 20px 0 20px', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h1 className="patient-page-title" style={{ textAlign: 'center', marginBottom: '24px', fontSize: '1.2rem', fontWeight: 700 }}>My Appointments</h1>
          <div style={{ display: 'flex', borderBottom: '2px solid #f1f5f9' }}>
            <button
              onClick={() => setActiveTab('upcoming')}
              style={{ flex: 1, padding: '12px 0', border: 'none', background: 'none', fontSize: '0.95rem', fontWeight: 600, color: activeTab === 'upcoming' ? 'var(--primary)' : '#64748b', borderBottom: activeTab === 'upcoming' ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: '-2px', cursor: 'pointer', transition: 'all 0.2s' }}
            >Upcoming</button>
            <button
              onClick={() => setActiveTab('past')}
              style={{ flex: 1, padding: '12px 0', border: 'none', background: 'none', fontSize: '0.95rem', fontWeight: 600, color: activeTab === 'past' ? 'var(--primary)' : '#64748b', borderBottom: activeTab === 'past' ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: '-2px', cursor: 'pointer', transition: 'all 0.2s' }}
            >Past</button>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '8px', padding: '12px 0 16px 0', position: 'relative' }}>
            <div style={{ position: 'relative', minWidth: '110px' }}>
              <button 
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                style={{ width: '100%', padding: '8px 12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontSize: '0.85rem', color: statusFilter === 'All Status' ? '#334155' : 'var(--primary)', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Filter size={14} color={statusFilter === 'All Status' ? "#64748b" : "var(--primary)"} /> 
                  {statusFilter}
                </div>
                <ChevronDown size={14} color="#94a3b8" />
              </button>
              
              {showStatusMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setShowStatusMenu(false)} />
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', zIndex: 101, width: '150px', overflow: 'hidden' }}>
                    {['All Status', 'Waiting', 'Confirmed', 'Completed', 'Cancelled'].map(s => (
                      <button 
                        key={s}
                        onClick={() => { setStatusFilter(s); setShowStatusMenu(false); }}
                        style={{ width: '100%', padding: '12px 16px', background: statusFilter === s ? '#f8fafc' : 'white', border: 'none', borderBottom: '1px solid #f1f5f9', textAlign: 'left', fontSize: '0.9rem', color: s === 'All Status' ? 'var(--primary)' : '#1e293b', fontWeight: s === 'All Status' || statusFilter === s ? 600 : 400, cursor: 'pointer' }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={{ position: 'relative', flex: 1 }}>
              <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#1e293b' }}>
                <Search size={14} />
              </div>
              <input type="text" placeholder="Doctor..." style={{ width: '100%', padding: '8px 12px 8px 30px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div style={{ position: 'relative', flex: 1 }}>
              <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#1e293b' }}>
                <Building2 size={14} />
              </div>
              <input type="text" placeholder="Clinic..." style={{ width: '100%', padding: '8px 12px 8px 30px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {bookSuccess && (
            <div className="alert alert-success" style={{ borderRadius: '14px', marginBottom: '16px' }}>
              ✓ Appointment booked successfully!
            </div>
          )}
          {cancelSuccess && (
            <div style={{ borderRadius: '14px', marginBottom: '16px', padding: '12px 16px', background: '#fee2e2', color: '#dc2626', fontWeight: 600, fontSize: '0.9rem' }}>
              ✓ Appointment cancelled successfully
            </div>
          )}
          
          <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b', marginBottom: '16px', fontWeight: 500 }}>
            {activeTab === 'upcoming' ? filteredUpcoming.length : filteredPast.length} appointments
          </div>

          <div className="appt-card-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {((activeTab === 'upcoming' ? filteredUpcoming : filteredPast).length === 0) ? (
              <div className="patient-empty-state">
                <div className="patient-empty-state-icon"><CalendarDays size={28} /></div>
                <div className="patient-empty-state-title">No appointments in {activeTab}</div>
                <div className="patient-empty-state-text">Book your next consultation</div>
              </div>
            ) : (
              (activeTab === 'upcoming' ? filteredUpcoming : filteredPast).map((appt: any) => {
                 const d = new Date(appt.bookingDate);
                 const isUpcoming = d >= today && appt.status !== 'Cancelled';
                 const isConfirmed = appt.status === 'Confirmed' || appt.status === 'Pending';
                 const within6h = isWithin6Hours(appt);
                 const mode = parseMode(appt.notes);
                 const doctorName = parseDoctor(appt.notes);
                 const clinicName = parseClinic(appt.notes);
                 
                 let statusLabel = appt.status === 'Cancelled' ? 'Cancelled' : 'Completed';
                 let statusColor = '#64748b';
                 let statusBg = '#f1f5f9';
                 if (appt.status === 'Cancelled') { statusColor = '#dc2626'; statusBg = '#fee2e2'; }

                 if (isUpcoming) {
                   statusLabel = appt.status === 'Confirmed' ? 'Confirmed' : 'Pending';
                   statusColor = '#16a34a';
                   statusBg = '#dcfce7';
                 }

                 return (
                   <div key={appt.id} className="appt-card-v2" style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                       <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1.05rem' }}>
                          {d.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                       </div>
                       <div style={{ padding: '4px 10px', borderRadius: '20px', background: statusBg, color: statusColor, fontSize: '0.75rem', fontWeight: 700 }}>
                         {statusLabel}
                       </div>
                     </div>

                     <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#334155', marginBottom: '16px', fontWeight: 600 }}>
                       <Clock size={16} color="var(--primary)" />
                       {appt.bookingTime || 'TBD'} • 15 min
                       <span style={{ marginLeft: '4px', display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700 }}>
                         {mode === 'video' && <><Video size={12} /> Video</>}
                         {mode === 'audio' && <><PhoneCall size={12} /> Audio</>}
                         {mode === 'in-person' && <><User size={12} /> In-Person</>}
                       </span>
                     </div>

                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#475569', marginBottom: '20px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><User size={16} />{doctorName}</div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><MapPin size={16} />{clinicName}</div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><CalendarDays size={16} />{appt.visitType || 'New'}</div>
                     </div>

                     {isUpcoming ? (
                       <>
                         {/* Cancel confirm dialog */}
                         {cancelConfirmId === appt.id && (
                           <div style={{ marginBottom: '12px', padding: '14px', borderRadius: '12px', background: '#fff7ed', border: '1px solid #fed7aa' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#ea580c', fontWeight: 700, fontSize: '0.9rem' }}>
                               <AlertTriangle size={16} /> Cancel this appointment?
                             </div>
                             <div style={{ display: 'flex', gap: '8px' }}>
                               <button onClick={() => handleCancelConfirm(appt.id)} disabled={cancelMutation.isPending} style={{ flex: 1, padding: '8px', borderRadius: '8px', background: '#dc2626', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                                 {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel'}
                               </button>
                               <button onClick={() => setCancelConfirmId(null)} style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'white', color: '#64748b', border: '1px solid #e2e8f0', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                                 Keep It
                               </button>
                             </div>
                           </div>
                         )}

                         <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                           {/* Call button by mode */}
                           {mode === 'in-person' ? (
                             <button style={{ flex: 1, padding: '10px 0', borderRadius: '10px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}>
                               <MapPin size={15} /> Check In
                             </button>
                           ) : mode === 'audio' ? (
                             <button style={{ flex: 1, padding: '10px 0', borderRadius: '10px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}>
                               <PhoneCall size={15} /> Join Audio Call
                             </button>
                           ) : (
                             <button style={{ flex: 1, padding: '10px 0', borderRadius: '10px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}>
                               <Video size={15} /> Join Video Call
                             </button>
                           )}

                           {/* Reschedule */}
                           <button
                             onClick={() => !within6h && navigate(`/patient/${phone}/book`)}
                             disabled={within6h}
                             title={within6h ? 'Unavailable within 6 hours of appointment' : 'Reschedule'}
                             style={{ flex: 1, padding: '10px 0', borderRadius: '10px', background: 'transparent', color: within6h ? '#cbd5e1' : '#6366f1', border: `1px solid ${within6h ? '#e2e8f0' : '#6366f1'}`, fontWeight: 600, fontSize: '0.85rem', cursor: within6h ? 'not-allowed' : 'pointer' }}
                           >Reschedule</button>

                           {/* Cancel */}
                           <button
                             onClick={() => !within6h && setCancelConfirmId(appt.id)}
                             disabled={within6h}
                             title={within6h ? 'Unavailable within 6 hours of appointment' : 'Cancel'}
                             style={{ flex: 1, padding: '10px 0', borderRadius: '10px', background: 'transparent', color: within6h ? '#cbd5e1' : '#dc2626', border: `1px solid ${within6h ? '#e2e8f0' : '#fca5a5'}`, fontWeight: 600, fontSize: '0.85rem', cursor: within6h ? 'not-allowed' : 'pointer' }}
                           >Cancel</button>
                         </div>

                         {within6h && (
                           <div style={{ fontSize: '0.7rem', color: '#f97316', textAlign: 'center', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                             <AlertTriangle size={12} /> Reschedule & cancellation unavailable within 6 hours of appointment
                           </div>
                         )}
                       </>
                     ) : (
                       <button style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'transparent', color: '#84cc16', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                         <Activity size={16} /> View Details
                       </button>
                     )}
                   </div>
                 );
               })
             )}
          </div>
        </div>

      </main>

      {/* Booking Modal */}
      {showBooking && (
        <div className="patient-modal-overlay" onClick={() => setShowBooking(false)}>
          <div className="patient-modal" onClick={e => e.stopPropagation()}>
            <div className="patient-modal-header">
              <h2 className="patient-modal-title">Book Appointment</h2>
              <button className="patient-modal-close" onClick={() => setShowBooking(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBook}>
              <div className="patient-form-group">
                <label className="patient-form-label">Preferred Date</label>
                <CustomDatePicker 
                  value={bookForm.date} 
                  onChange={date => setBookForm(f => ({ ...f, date }))} 
                  minDateStr={minDateStr} 
                />
              </div>

              <div className="patient-form-group">
                <label className="patient-form-label">Preferred Time</label>
                <select
                  className="patient-form-input"
                  value={bookForm.time}
                  onChange={e => setBookForm(f => ({ ...f, time: e.target.value }))}
                  id="patient-book-time"
                >
                  <option value="09:00">09:00 AM</option>
                  <option value="09:30">09:30 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="10:30">10:30 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="11:30">11:30 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="14:30">02:30 PM</option>
                  <option value="15:00">03:00 PM</option>
                  <option value="15:30">03:30 PM</option>
                  <option value="16:00">04:00 PM</option>
                  <option value="16:30">04:30 PM</option>
                  <option value="17:00">05:00 PM</option>
                </select>
              </div>

              <div className="patient-form-group">
                <label className="patient-form-label">Reason (Optional)</label>
                <textarea
                  className="patient-form-input patient-form-textarea"
                  value={bookForm.reason}
                  onChange={e => setBookForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Briefly describe your reason for visit..."
                  id="patient-book-reason"
                />
              </div>

              <button
                type="submit"
                className="patient-form-submit"
                disabled={bookMutation.isPending}
                id="patient-book-submit"
              >
                {bookMutation.isPending ? 'Booking...' : 'Confirm Appointment'}
              </button>
            </form>
          </div>
        </div>
      )}

      <PatientBottomNav />
    </div>
  );
}

/* ─── Custom Date Picker Component ─── */
function CustomDatePicker({ value, onChange, minDateStr }: { value: string, onChange: (v: string) => void, minDateStr: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'days'|'months'|'years'>('days');
  
  // Date we are currently viewing/navigating
  const [viewDate, setViewDate] = useState(() => {
    return value ? new Date(value) : new Date();
  });

  const minDate = new Date(minDateStr);
  minDate.setHours(0,0,0,0);

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  
  const handleDaySelect = (d: number) => {
    const nd = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
    if (nd < minDate) return;
    
    // Format YYYY-MM-DD
    const y = nd.getFullYear();
    const m = String(nd.getMonth() + 1).padStart(2, '0');
    const dStr = String(nd.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${dStr}`);
    setIsOpen(false);
  };

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  // Grid of days
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  // Year range (current decade)
  const startYear = Math.floor(currentYear / 10) * 10;
  const years = Array.from({ length: 12 }, (_, i) => startYear - 1 + i);

  return (
    <div className="cdp-container" style={{ position: 'relative' }}>
      <div className="patient-form-input" style={{ display: 'flex', alignItems: 'center', padding: 0, overflow: 'hidden' }}>
        <input 
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            const d = new Date(e.target.value);
            if (!isNaN(d.getTime())) setViewDate(d);
          }}
          placeholder="YYYY-MM-DD"
          style={{ flex: 1, border: 'none', padding: '10px 14px', outline: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '0.95rem' }}
          onClick={() => setIsOpen(true)}
        />
        <button type="button" onClick={() => setIsOpen(!isOpen)} style={{ border: 'none', background: 'transparent', padding: '0 14px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
          <CalendarDays size={18} />
        </button>
      </div>

      {isOpen && (
        <div className="cdp-dropdown" style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8, 
          background: 'white', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', 
          zIndex: 100, border: '1px solid #e2e8f0', overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <button type="button" onClick={() => {
              if (view === 'days') setViewDate(new Date(currentYear, currentMonth - 1, 1));
              if (view === 'months') setViewDate(new Date(currentYear - 1, 0, 1));
              if (view === 'years') setViewDate(new Date(currentYear - 10, 0, 1));
            }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <ChevronLeft size={20} />
            </button>
            
            <button type="button" onClick={() => {
              if (view === 'days') setView('months');
              else if (view === 'months') setView('years');
            }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem' }}>
              {view === 'days' && `${monthNames[currentMonth]} ${currentYear}`}
              {view === 'months' && currentYear}
              {view === 'years' && `${startYear} - ${startYear + 9}`}
            </button>

            <button type="button" onClick={() => {
              if (view === 'days') setViewDate(new Date(currentYear, currentMonth + 1, 1));
              if (view === 'months') setViewDate(new Date(currentYear + 1, 0, 1));
              if (view === 'years') setViewDate(new Date(currentYear + 10, 0, 1));
            }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: 16 }}>
            {view === 'days' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8, textAlign: 'center', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
                  {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                  {blanks.map(b => <div key={`blank-${b}`} />)}
                  {days.map(d => {
                    const checkDate = new Date(currentYear, currentMonth, d);
                    const disabled = checkDate < minDate;
                    const isSelected = value === `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleDaySelect(d)}
                        style={{
                          aspectRatio: '1', borderRadius: '50%', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
                          background: isSelected ? 'var(--primary)' : 'transparent',
                          color: isSelected ? 'white' : disabled ? '#cbd5e1' : '#334155',
                          fontWeight: isSelected ? 600 : 400
                        }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {view === 'months' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {monthNames.map((m, i) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setViewDate(new Date(currentYear, i, 1)); setView('days'); }}
                    style={{ padding: '12px 0', borderRadius: 8, border: 'none', background: currentMonth === i ? 'var(--primary-light)' : '#f8fafc', color: currentMonth === i ? 'var(--primary)' : '#475569', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}

            {view === 'years' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {years.map(y => {
                  const isCurrentYear = y === new Date().getFullYear();
                  return (
                  <button
                    key={y}
                    type="button"
                    disabled={!isCurrentYear}
                    onClick={() => { setViewDate(new Date(y, currentMonth, 1)); setView('months'); }}
                    style={{ padding: '12px 0', borderRadius: 8, border: 'none', background: currentYear === y ? 'var(--primary-light)' : '#f8fafc', color: !isCurrentYear ? '#cbd5e1' : currentYear === y ? 'var(--primary)' : '#475569', fontWeight: 600, cursor: !isCurrentYear ? 'not-allowed' : 'pointer' }}
                  >
                    {y}
                  </button>
                )})}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Click outside backdrop */}
      {isOpen && <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, zIndex: 90}} onClick={()=>setIsOpen(false)} />}
    </div>
  );
}

export default PatientAppointments;
