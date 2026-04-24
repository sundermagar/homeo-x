import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, MapPin, Sparkles, ChevronRight, Clock, Phone, Mail, User, Video, PhoneCall, CalendarDays } from 'lucide-react';
import { PatientBottomNav } from '../components/patient-bottom-nav';
import { useBookAppointment, usePublicClinicalData, useBookedSlots } from '../hooks/use-public-api';

export default function PatientBookWizard() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();

  // Booking Flow State
  const [step, setStep] = useState<number>(1);
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [consultMode, setConsultMode] = useState<'in-person' | 'video' | 'audio'>('in-person');
  const [chiefComplaint, setChiefComplaint] = useState<string>('');
  const [visitType, setVisitType] = useState<'New' | 'Follow-up'>('New');

  const bookMutation = useBookAppointment();
  const { data: patientData } = usePublicClinicalData(phone || '');
  const dateStr = selectedDate.toLocaleDateString('en-CA');
  const { data: bookedSlots = [] } = useBookedSlots(dateStr);

  // Hardcoded UI Mock Data from Request
  const clinics = [
    { id: 1, name: 'homeo clinic', location: 'kurukshetra, haryana', verified: true }
  ];

  const doctors = [
    { id: 1, name: 'Dr. neeraj verma', specialization: 'Homeopathy' }
  ];

  const generateSlots = () => {
    const times = [];
    let startMinutes = 9 * 60 + 40; // 9:40 AM
    const endMinutes = 22 * 60 + 40; // 10:40 PM

    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    while (startMinutes <= endMinutes) {
      const h = Math.floor(startMinutes / 60);
      const m = startMinutes % 60;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hours12 = h % 12 || 12;
      const timeStr = `${hours12}:${m.toString().padStart(2, '0')} ${ampm}`;
      
      // Calculate end time (+15 mins)
      const endMins = startMinutes + 15;
      const endH = Math.floor(endMins / 60);
      const endM = endMins % 60;
      const endAmpm = endH >= 12 ? 'PM' : 'AM';
      const endHours12 = endH % 12 || 12;
      const endTimeStr = `${endHours12}:${endM.toString().padStart(2, '0')} ${endAmpm}`;

      times.push({
        label: timeStr,
        period: `${timeStr} - ${endTimeStr}`,
        // Disable past slots or already-booked slots
        available: (isToday ? startMinutes > currentMinutes : true) && !bookedSlots.includes(timeStr)
      });
      startMinutes += 20; // 20 min interval (from image)
    }
    return times;
  };

  const slots = useMemo(() => generateSlots(), [selectedDate]);

  const handlePrevDay = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize today

    const checkDate = new Date(selectedDate);
    checkDate.setHours(0, 0, 0, 0); // normalize selected

    if (checkDate <= today) return; // Disallow moving to past dates

    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
    setSelectedSlot(null);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
    setSelectedSlot(null);
  };

  const handleBack = () => {
    if (step === 1) navigate(`/patient/${phone}`);
    else setStep(step - 1);
  };

  // Step 3: slot selected → go to step 4 (confirm)
  const handleProceedToConfirm = () => {
    if (selectedSlot) setStep(4);
  };

  // Step 4: confirmed → actually book
  const handleBookSlot = async () => {
    if (!phone || !selectedSlot) return;
    try {
      await bookMutation.mutateAsync({
        phone,
        patientName: patientData?.patientInfo?.firstName || 'Patient',
        bookingDate: selectedDate.toLocaleDateString('en-CA'),
        bookingTime: selectedSlot,
        doctorId: selectedDoctor?.id || 1, // Fallback to 1 if missing for safety
        visitType,
        notes: `Clinic: ${selectedClinic?.name || 'Homeo'}, Doctor: ${selectedDoctor?.name || 'N/A'}, Mode: ${consultMode}, Type: ${visitType}${chiefComplaint ? `, Complaint: ${chiefComplaint}` : ''}`
      });
      navigate(`/patient/${phone}/appointments`);
    } catch (err) {
      console.error('Failed to book appointment', err);
    }
  };

  return (
    <div className="patient-shell" style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '90px' }}>
      
      {/* Dynamic Header */}
      <div style={{ background: 'white', padding: '16px', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <button onClick={handleBack} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#1e293b', display: 'flex' }}>
          <ArrowLeft size={24} />
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          {step === 1 && <h1 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: '#1e293b' }}>My Clinics</h1>}
          {step === 2 && <h1 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: '#1e293b' }}>{selectedClinic?.name}</h1>}
          {step === 3 && (
            <div>
              <h1 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: '#1e293b' }}>Select a Slot</h1>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedDoctor?.name}</div>
            </div>
          )}
          {step === 4 && <h1 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: '#1e293b' }}>Confirm Booking</h1>}
        </div>
        <div style={{ width: '24px' }} /> {/* Spacer */}
      </div>

      <main style={{ padding: '0' }}>
        
        {/* STEP 1: Clinics List */}
        {step === 1 && (
          <div style={{ padding: '16px' }}>
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <Search size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Search by name, city..." 
                style={{ width: '100%', padding: '14px 12px 14px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.95rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {clinics.map((clinic, idx) => (
                <div 
                  key={idx} 
                  onClick={() => { setSelectedClinic(clinic); setStep(2); }}
                  style={{ background: 'white', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #f1f5f9', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}>+</div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '1rem' }}>{clinic.name}</div>
                        {clinic.verified && (
                          <div style={{ color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '50%', padding: '2px', display: 'flex' }}>
                             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                        <MapPin size={12} /> {clinic.location}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={20} color="#cbd5e1" />
                </div>
              ))}
            </div>

          </div>
        )}

        {/* STEP 2: Clinic Profile */}
        {step === 2 && (
          <div>
            <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.8), var(--primary))', padding: '24px 20px', borderRadius: '0 0 24px 24px', color: 'white', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, lineHeight: 1 }}>+</div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>{selectedClinic?.name}</div>
                    <div style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      Verified
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', marginTop: '6px', opacity: 0.9 }}>
                    <MapPin size={14} /> {selectedClinic?.location}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', marginTop: '4px', fontWeight: 700 }}>
                    <Clock size={14} /> Open now
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '0 20px' }}>
              <div style={{ fontWeight: 800, color: '#334155', marginBottom: '12px', fontSize: '0.95rem' }}>Working Hours</div>
              <div style={{ background: 'white', borderRadius: '16px', padding: '16px', fontSize: '0.85rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {[
                  { day: 'Sun', hours: 'Closed', label: '' },
                  { day: 'Mon', hours: '09:00-18:00, 18:00-23:00', label: 'Open' },
                  { day: 'Tue', hours: '09:00-18:00, 18:00-23:00', label: 'Open' },
                  { day: 'Wed', hours: '09:00-18:00, 18:00-23:00', label: 'Open' },
                  { day: 'Thu', hours: '09:00-18:00, 18:00-23:00', label: 'Open' },
                  { day: 'Fri', hours: '09:00-18:00, 18:00-23:00', label: 'Open' },
                  { day: 'Sat', hours: '09:00-18:00, 18:00-23:00', label: 'Open' },
                ].map((s, idx) => {
                  const isToday = new Date().getDay() === idx;
                  return (
                    <div key={idx} style={{ display: 'flex', color: isToday ? 'var(--primary)' : 'inherit', fontWeight: isToday ? 700 : 'inherit' }}>
                      <div style={{ width: '60px' }}>{s.day}</div>
                      <div style={{ flex: 1 }}>{s.hours}</div>
                      {isToday && s.label && (
                        <div style={{ padding: '2px 8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px', fontSize: '0.75rem' }}>{s.label}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ fontWeight: 800, color: '#334155', marginBottom: '12px', fontSize: '0.95rem' }}>Our Doctors</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {doctors.map(doc => (
                  <div key={doc.id} style={{ background: 'white', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        <User size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.95rem' }}>{doc.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{doc.specialization}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setSelectedDoctor(doc); setStep(3); }}
                      style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      Book
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ fontWeight: 800, color: '#334155', marginBottom: '12px', fontSize: '0.95rem' }}>Contact</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: '#475569' }}>
                  <Phone size={18} color="var(--primary)" /> +919870000123
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: '#475569' }}>
                  <Mail size={18} color="var(--primary)" /> info@homeoclinic.com
                </div>
              </div>

            </div>

          </div>
        )}

        {/* STEP 3: Select Slot */}
        {step === 3 && (
          <div style={{ padding: '0 20px', paddingTop: '16px' }}>
            {/* Header calendar nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <button 
                onClick={handlePrevDay}
                disabled={new Date(selectedDate).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0)}
                style={{ 
                  padding: '8px', 
                  background: 'white', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px', 
                  cursor: new Date(selectedDate).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0) ? 'not-allowed' : 'pointer',
                  opacity: new Date(selectedDate).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0) ? 0.3 : 1
                }}
              >
                <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
              </button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                  {selectedDate.toLocaleDateString('en-GB', { weekday: 'short' })}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>
                  {selectedDate.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <button 
                onClick={handleNextDay}
                style={{ padding: '8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Grid of Slots */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {slots.map((s, i) => (
                <button
                  key={i}
                  disabled={!s.available}
                  onClick={() => setSelectedSlot(s.label)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    cursor: s.available ? 'pointer' : 'not-allowed',
                    background: s.available 
                      ? (selectedSlot === s.label ? 'rgba(99, 102, 241, 0.1)' : 'white')
                      : '#f8fafc',
                    border: `1.5px solid ${s.available 
                      ? (selectedSlot === s.label ? 'var(--primary)' : '#1e293b') 
                      : '#e2e8f0'}`,
                    opacity: s.available ? 1 : 0.4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px'
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: selectedSlot === s.label ? 'var(--primary)' : '#1e293b' }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, opacity: s.available ? 1 : 0.6 }}>
                    {s.period.split(' - ')[1]}
                  </div>
                </button>
              ))}
            </div>

              {/* Confirm Book Button Wrapper */}
            {selectedSlot && (
              <div style={{ position: 'fixed', bottom: '80px', left: 0, right: 0, background: 'white', padding: '16px 20px', borderTop: '1px solid #e2e8f0', zIndex: 100 }}>
                <button 
                  onClick={handleProceedToConfirm}
                  style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)' }}
                >
                  Proceed to Confirm
                </button>
              </div>
            )}
            
            {/* Extended padding for scroll */}
            <div style={{ height: '100px' }} />
          </div>
        )}

        {/* STEP 4: Confirm Booking */}
        {step === 4 && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Booking Summary Card */}
            <div style={{ background: '#eef2ff', borderRadius: '20px', padding: '20px', border: '1px solid #c7d2fe' }}>
              <div style={{ fontWeight: 800, color: '#1e293b', marginBottom: '16px', fontSize: '1rem' }}>Booking Summary</div>
              {[
                { icon: <User size={18} />, label: 'Doctor', value: selectedDoctor?.name },
                { icon: <MapPin size={18} />, label: 'Clinic', value: selectedClinic?.name },
                { icon: <CalendarDays size={18} />, label: 'Date', value: selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                { icon: <Clock size={18} />, label: 'Time', value: selectedSlot },
                { icon: <CalendarDays size={18} />, label: 'Type', value: visitType },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: i < 4 ? '14px' : 0 }}>
                  <div style={{ color: 'var(--primary)', flexShrink: 0 }}>{row.icon}</div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{row.label}</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>{row.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Visit Type */}
            <div>
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '12px', fontSize: '0.95rem' }}>Visit Type</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {(['New', 'Follow-up'] as const).map(vt => (
                  <button
                    key={vt}
                    onClick={() => setVisitType(vt)}
                    style={{ padding: '12px', borderRadius: '12px', border: `2px solid ${visitType === vt ? 'var(--primary)' : '#e2e8f0'}`, background: visitType === vt ? 'rgba(99, 102, 241, 0.1)' : 'white', fontWeight: 700, fontSize: '0.9rem', color: visitType === vt ? 'var(--primary)' : '#64748b', cursor: 'pointer' }}
                  >{vt}</button>
                ))}
              </div>
            </div>

            {/* Consultation Mode */}
            <div>
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '12px', fontSize: '0.95rem' }}>Consultation Mode</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {([
                  { key: 'in-person' as const, label: 'In-Person', icon: <User size={22} /> },
                  { key: 'video' as const, label: 'Video', icon: <Video size={22} /> },
                  { key: 'audio' as const, label: 'Audio', icon: <PhoneCall size={22} /> },
                ]).map(m => (
                  <button
                    key={m.key}
                    onClick={() => setConsultMode(m.key)}
                    style={{ padding: '14px 8px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', border: `2px solid ${consultMode === m.key ? 'var(--primary)' : '#e2e8f0'}`, background: consultMode === m.key ? 'var(--primary)' : 'white', color: consultMode === m.key ? 'white' : '#334155', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chief Complaint */}
            <div>
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '12px', fontSize: '0.95rem' }}>
                Chief Complaint <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.85rem' }}>(optional)</span>
              </div>
              <textarea
                value={chiefComplaint}
                onChange={e => { if (e.target.value.length <= 500) setChiefComplaint(e.target.value); }}
                placeholder="Briefly describe your symptoms or reason for visit..."
                rows={4}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.9rem', resize: 'none', outline: 'none', background: 'white', color: '#334155', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>{chiefComplaint.length}/500</div>
            </div>

            {/* Payment */}
            <div>
              <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '12px', fontSize: '0.95rem' }}>Payment</div>
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Consultation Fee</span>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>₹ 300</span>
                </div>
                <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>Total</span>
                  <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.1rem' }}>₹ 300</span>
                </div>
              </div>
              <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                Payment collected at clinic during visit
              </div>
            </div>

            {/* Confirm Button */}
            <button
              onClick={handleBookSlot}
              disabled={bookMutation.isPending}
              style={{ width: '100%', padding: '18px', borderRadius: '14px', background: bookMutation.isPending ? '#cbd5e1' : 'var(--primary)', color: 'white', border: 'none', fontWeight: 800, fontSize: '1.05rem', cursor: bookMutation.isPending ? 'not-allowed' : 'pointer', marginBottom: '20px', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)' }}
            >
              {bookMutation.isPending ? 'Confirming...' : '✓  Confirm Appointment'}
            </button>
          </div>
        )}

      </main>
      <PatientBottomNav />
    </div>
  );
}
