import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/auth-store';
import {
  Calendar, Stethoscope, ArrowRight, LogOut, Sparkles,
  User, ChevronRight, RotateCw, PartyPopper, Gift, Star, Cake,
  Home, FileText, Activity, Video, Phone, CheckCircle2, Clock, Check,
  Heart, CreditCard
} from 'lucide-react';
import { useAppointments } from '@/features/appointments/hooks/use-appointments';
import { AppointmentStatus } from '@mmc/types';
import { VisitClinicWizard } from '../components/visit-clinic-wizard';
import { FollowUpWizard } from '../components/follow-up-wizard';
import { useMyMedicalRecords } from '@/features/medical-case/hooks/use-medical-cases';
import mmcLogo from '@/assets/mmc-logo-full.png';

type TrackView = 'selection' | 'visit-clinic' | 'follow-up';

export default function PatientTrackSelection() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [view, setView] = useState<TrackView>('selection');

  const { data: records } = useMyMedicalRecords();
  const medicalCase = records?.medicalCase;
  const latestVitals = records?.vitals?.[0];
  const activePackage = records?.activePackage;

  const { data: appointmentsResponse } = useAppointments({ refetchInterval: 10000 });

  const todaysAppointment = useMemo(() => {
    const appointments = appointmentsResponse?.data;
    if (!appointments || !Array.isArray(appointments)) return null;
    
    const ACTIVE_STATUSES = ['Scheduled', 'Confirmed', 'Arrived', 'Consultation', 'InProgress'];
    
    const activeAppts = appointments.filter((a: any) => 
      ACTIVE_STATUSES.includes(a.status)
    );
    
    if (activeAppts.length === 0) return null;
    
    // Sort by date+time ascending, return the nearest one
    const sorted = [...activeAppts].sort((a: any, b: any) => {
      const da = new Date(`${a.bookingDate}T${a.bookingTime || '00:00:00'}`);
      const db = new Date(`${b.bookingDate}T${b.bookingTime || '00:00:00'}`);
      return da.getTime() - db.getTime();
    });
    
    return sorted[0] || null;
  }, [appointmentsResponse]);

  const isBirthdayToday = useMemo(() => {
    if (!medicalCase?.dateOfBirth) return false;
    let dob = new Date(medicalCase.dateOfBirth);
    if (isNaN(dob.getTime())) {
      const parts = medicalCase.dateOfBirth.split(/[-/]/);
      if (parts.length === 3 && parts[2].length === 4) {
        dob = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // convert DD/MM/YYYY to YYYY-MM-DD
      }
    }
    if (isNaN(dob.getTime())) return false;
    const today = new Date();
    return dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
  }, [medicalCase?.dateOfBirth]);

  const confettiDots = useMemo(() => {
    const CONFETTI_COLORS = ['#7c6af2', '#4e9de8', '#5ac8a0', '#f4b942', '#e87c7c', '#a78bfa'];
    return Array.from({ length: 24 }).map((_, i) => {
      const size = Math.floor(Math.random() * 7) + 4;
      const isCircle = Math.random() > 0.5;
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      const left = Math.floor(Math.random() * 100) + '%';
      const duration = (Math.random() * 3 + 2.5).toFixed(2) + 's';
      const delay = (Math.random() * 3).toFixed(2) + 's';

      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '-20px',
            left,
            width: `${size}px`,
            height: `${size}px`,
            background: color,
            borderRadius: isCircle ? '50%' : '2px',
            animation: `confettiFall ${duration} linear ${delay} infinite`,
            zIndex: 1,
          }}
        />
      );
    });
  }, []);

  // Guard: if session expired, redirect back to portal entry
  if (!isAuthenticated || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '16px', color: '#64748b', marginBottom: '16px' }}>Session expired. Please enter your mobile number again.</p>
          <button
            onClick={() => navigate('/portal', { replace: true })}
            style={{ padding: '12px 24px', borderRadius: '12px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            Go to Portal
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate('/portal', { replace: true });
  };

  // Render wizards as full-page views (birthday banner should NOT appear here)
  if (view === 'visit-clinic') {
    return <VisitClinicWizard onBack={() => setView('selection')} />;
  }
  if (view === 'follow-up') {
    return <FollowUpWizard onBack={() => setView('selection')} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative'
    }}>
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.8)', 
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <header className="max-w-[1200px] mx-auto flex items-center justify-between px-4 py-4 md:px-6 bg-transparent">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex items-center justify-center border-r border-slate-200 pr-3 md:pr-4">
              <img src={mmcLogo} alt="MMC Logo" className="h-10 md:h-12 object-contain" />
            </div>
            <div className="text-slate-500 text-sm md:text-[15px] font-medium truncate max-w-[140px] md:max-w-none">
              Patient · <span className="font-semibold text-slate-700 capitalize">{user?.name || 'patient'}</span>
            </div>
          </div>
          
          {/* Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-500">
            <div className="flex items-center gap-2 cursor-pointer text-blue-600 font-semibold hover:bg-blue-50 px-4 py-2 rounded-xl transition-all" onClick={() => navigate('/portal/select-track')}>
              <Home size={16} /> Home
            </div>
            <div className="flex items-center gap-2 cursor-pointer hover:text-blue-600 hover:bg-slate-50 px-4 py-2 rounded-xl transition-all" 
                 onClick={() => navigate('/appointments')}>
              <Calendar size={16} /> Appointments
            </div>
            <div className="flex items-center gap-2 cursor-pointer hover:text-blue-600 hover:bg-slate-50 px-4 py-2 rounded-xl transition-all" 
                 onClick={() => navigate('/reports')}>
              <FileText size={16} /> Reports
            </div>
            <div className="flex items-center gap-2 cursor-pointer hover:text-blue-600 hover:bg-slate-50 px-4 py-2 rounded-xl transition-all" 
                 onClick={() => navigate('/prescriptions')}>
              <Activity size={16} /> Prescriptions
            </div>
            <div className="flex items-center gap-2 cursor-pointer hover:text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl transition-all" 
                 onClick={handleLogout}>
              <LogOut size={16} /> Logout
            </div>
          </div>
          
          {/* Mobile menu logout */}
          <div className="flex md:hidden items-center">
             <button onClick={handleLogout} className="flex items-center gap-1 text-slate-500 hover:text-rose-600 text-xs font-semibold bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200">
               <LogOut size={14} /> <span className="hidden sm:inline">Logout</span>
             </button>
          </div>
        </header>
      </div>

      <main 
        className="px-4 py-4 md:px-6 md:py-6"
        style={{
        maxWidth: '1200px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Greeting Section */}
        <style>{`
          @keyframes wave {
            0%, 100% { transform: rotate(0.0deg) }
            10% { transform: rotate(14.0deg) }
            20% { transform: rotate(-8.0deg) }
            30% { transform: rotate(14.0deg) }
            40% { transform: rotate(-4.0deg) }
            50% { transform: rotate(10.0deg) }
            60% { transform: rotate(0.0deg) }
          }
        `}</style>
        <div className="mb-6 fade-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">
              {new Date().getHours() < 12 ? '🌅' : new Date().getHours() < 17 ? '☀️' : '🌙'}
            </span>
            <span className="text-sm font-bold tracking-widest text-slate-400 uppercase">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-800">
            Welcome back,{' '}
            <span 
              className="drop-shadow-sm"
              style={{
                background: 'linear-gradient(to right, #1a1f6e, #3a2d9e, #5b3ec8, #7c4fd4, #9b5de5)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent'
              }}
            >
              {user?.name?.split(' ')[0] || 'Patient'}
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            Let's manage your health journey today.
          </p>
        </div>

        {isBirthdayToday && (
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            borderRadius: '16px',
            padding: '16px 24px',
            marginBottom: '20px',
            border: '1px solid #bfdbfe',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {confettiDots}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 8px 0', color: '#1e40af' }}>
                Happy Birthday, {user?.name?.split(' ')[0] || 'Patient'}! 🎉
              </h2>
              <p style={{ margin: 0, color: '#3b82f6', fontSize: '14px' }}>
                Special day — your health matters most today. Wishing you a wonderful year ahead.
              </p>
            </div>
          </div>
        )}

        {todaysAppointment && (() => {
          const isAudioCall = todaysAppointment.visitType?.toLowerCase().includes('audio') || todaysAppointment.notes?.toLowerCase().includes('audio');
          
          return (
          <div style={{
            background: 'linear-gradient(to bottom right, #0f172a, #1e293b)',
            borderRadius: '20px',
            padding: '20px 24px',
            marginBottom: '20px',
            color: '#fff',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #334155'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', 
                background: '#10b981', color: '#fff', padding: '6px 12px', 
                borderRadius: '99px', fontSize: '12px', fontWeight: 600 
              }}>
                {isAudioCall ? <Phone size={14} /> : <Video size={14} />}
                {isAudioCall ? 'Audio Call' : (todaysAppointment.visitType || 'Video Call')}
              </div>
              
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', 
                border: '1px solid #3b82f6', color: '#60a5fa', padding: '6px 12px', 
                borderRadius: '99px', fontSize: '12px', fontWeight: 500, background: 'rgba(59, 130, 246, 0.1)' 
              }}>
                <CheckCircle2 size={14} />
                {todaysAppointment.status === AppointmentStatus.Consultation ? 'Live Now' : todaysAppointment.status}
              </div>
            </div>

            <h3 style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 16px 0', fontWeight: 500 }}>
              Today's Appointment
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '50%', background: '#1e3a8a', 
                color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: '18px', fontWeight: 600 
              }}>
                {todaysAppointment.doctorName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'DR'}
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>
                  {todaysAppointment.doctorName || 'Doctor'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', color: '#cbd5e1', fontSize: '14px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} />
                {todaysAppointment.bookingDate}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} />
                {todaysAppointment.bookingTime || 'TBD'}
              </div>
            </div>

            {todaysAppointment.status === AppointmentStatus.Consultation ? (
               <button 
                 onClick={() => navigate(`/meet/${todaysAppointment.id}?mode=${isAudioCall ? 'AUDIO' : 'VIDEO'}`)}
                 style={{
                   width: '100%', background: '#10b981', color: '#fff', 
                   padding: '16px', borderRadius: '12px', border: 'none', 
                   fontSize: '16px', fontWeight: 600, display: 'flex', 
                   alignItems: 'center', justifyContent: 'center', gap: '8px',
                   cursor: 'pointer', transition: 'background 0.2s',
                   boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)'
                 }}
                 onMouseOver={(e) => e.currentTarget.style.background = '#059669'}
                 onMouseOut={(e) => e.currentTarget.style.background = '#10b981'}
               >
                 {isAudioCall ? <Phone size={18} /> : <Video size={18} />}
                 {isAudioCall ? 'Join Audio Call' : 'Join Video Call'}
               </button>
            ) : (
               <div style={{
                 width: '100%', background: '#1e293b', color: '#94a3b8', 
                 padding: '16px', borderRadius: '12px', border: '1px solid #334155', 
                 fontSize: '14px', textAlign: 'center', display: 'flex', 
                 flexDirection: 'column', gap: '4px'
               }}>
                 <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b' }}>
                   Status
                 </span>
                 <span style={{ fontWeight: 500, color: '#cbd5e1', fontSize: '16px' }}>
                   Waiting for doctor to start...
                 </span>
               </div>
            )}
          </div>
          );
        })()}

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Main Card: Visit Clinic */}
          <div
            onClick={() => setView('visit-clinic')}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 0 3px rgba(0,0,0,0.02)',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#bfdbfe';
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 25px -5px rgba(37, 99, 235, 0.1), 0 8px 10px -6px rgba(37, 99, 235, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 0 3px rgba(0,0,0,0.02)';
            }}
          >
            {/* Decorative background glow */}
            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
            
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px', 
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              marginBottom: '20px', color: '#2563eb',
              border: '1px solid #bfdbfe'
            }}>
              <Calendar size={28} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--pp-ink, #0f172a)', margin: '0 0 8px 0' }}>
              Book an Appointment
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--pp-text-3, #64748b)', margin: '0 0 24px 0' }}>
              Book a consultation with your doctor whenever you're ready.
            </p>
            <button style={{
              background: 'var(--pp-blue, #2563eb)',
              color: '#fff',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'var(--pp-blue-hover, #1d4ed8)'}
            onMouseOut={e => e.currentTarget.style.background = 'var(--pp-blue, #2563eb)'}
            >
              <span style={{ fontSize: '18px', fontWeight: 300, lineHeight: 1 }}>+</span> Book appointment
            </button>
          </div>

          {/* Secondary Card: Follow-up */}
          <div
            onClick={() => setView('follow-up')}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#c7d2fe';
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 25px -5px rgba(99, 102, 241, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px -2px rgba(0, 0, 0, 0.05)';
            }}
          >
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
            
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px', 
              background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              marginBottom: '20px', color: '#6366f1',
              border: '1px solid #c7d2fe'
            }}>
              <RotateCw size={28} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 500, color: 'var(--pp-ink, #0f172a)', margin: '0 0 8px 0' }}>
              Follow-Up / Refill
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--pp-text-3, #64748b)', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              Request medicine refill, report health progress & upload reports.
            </p>
            <button style={{
              background: 'var(--bg-card, #ffffff)',
              color: 'var(--pp-blue, #2563eb)',
              border: '1px solid var(--pp-blue-tint, #bfdbfe)',
              padding: '10px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'var(--pp-blue-tint, #eff6ff)'}
            onMouseOut={e => e.currentTarget.style.background = 'var(--bg-card, #ffffff)'}
            >
              <ArrowRight size={16} /> Start
            </button>
          </div>
        </div>

        {/* New Additional Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* Left Column (Span 2) */}
          <div className="lg:col-span-2">
            {/* Latest Vital Parameters */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '20px 24px',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02)',
              height: '100%'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                <Heart size={18} className="text-rose-500" />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Latest Vital Parameters</h3>
              </div>
              {latestVitals ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(latestVitals.systolicBp || latestVitals.diastolicBp) && (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Blood Pressure</div>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>{latestVitals.systolicBp || '--'}/{latestVitals.diastolicBp || '--'} <span style={{fontSize:'12px',color:'#94a3b8',fontWeight:400}}>mmHg</span></div>
                    </div>
                  )}
                  {latestVitals.temperatureF && (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Temperature</div>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>{latestVitals.temperatureF} <span style={{fontSize:'12px',color:'#94a3b8',fontWeight:400}}>°F</span></div>
                    </div>
                  )}
                  {latestVitals.pulseRate && (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Pulse</div>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>{latestVitals.pulseRate} <span style={{fontSize:'12px',color:'#94a3b8',fontWeight:400}}>bpm</span></div>
                    </div>
                  )}
                  {latestVitals.weightKg && (
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Weight</div>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>{latestVitals.weightKg} <span style={{fontSize:'12px',color:'#94a3b8',fontWeight:400}}>kg</span></div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>Vitals parameters are not registered in your file yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Span 1) */}
          <div className="lg:col-span-1">
            {/* Active Health Package */}
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '20px 24px',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.02)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                <CreditCard size={18} className="text-indigo-500" />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Active Health Package</h3>
              </div>
              <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                  <CreditCard size={20} />
                </div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: '0 0 8px 0' }}>
                  {activePackage ? activePackage.name || 'Premium Health Package' : 'No Active Package Plan'}
                </h4>
                <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.6, margin: '0 0 20px 0' }}>
                  {activePackage && activePackage.expiryDate
                    ? `Your package is active. Valid until ${new Date(activePackage.expiryDate).toLocaleDateString()}.`
                    : 'Subscribe to clinic packages for premium benefits, free refills, and priority queues.'
                  }
                </p>
                <div style={{ marginTop: 'auto' }}>
                  <button style={{
                    width: '100%', background: '#eff6ff', color: '#2563eb', border: 'none', padding: '10px',
                    borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#dbeafe'}
                  onMouseOut={e => e.currentTarget.style.background = '#eff6ff'}
                  >
                    {activePackage ? 'View Plan Details' : 'Inquire about Memberships'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around items-center py-2 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)]">
        <div onClick={() => navigate('/portal/select-track')} className="flex flex-col items-center gap-1 cursor-pointer text-blue-600 px-4 py-2 hover:bg-blue-50/50 rounded-xl transition-all">
          <Home size={22} className="stroke-[2.5px]" />
          <span className="text-[10px] font-bold">Home</span>
        </div>
        <div onClick={() => navigate('/appointments')} className="flex flex-col items-center gap-1 cursor-pointer text-slate-500 hover:text-blue-600 px-4 py-2 hover:bg-blue-50/50 rounded-xl transition-all">
          <Calendar size={22} className="stroke-[2px]" />
          <span className="text-[10px] font-semibold">Appts</span>
        </div>
        <div onClick={() => navigate('/reports')} className="flex flex-col items-center gap-1 cursor-pointer text-slate-500 hover:text-blue-600 px-4 py-2 hover:bg-blue-50/50 rounded-xl transition-all">
          <FileText size={22} className="stroke-[2px]" />
          <span className="text-[10px] font-semibold">Reports</span>
        </div>
        <div onClick={() => navigate('/prescriptions')} className="flex flex-col items-center gap-1 cursor-pointer text-slate-500 hover:text-blue-600 px-4 py-2 hover:bg-blue-50/50 rounded-xl transition-all">
          <Activity size={22} className="stroke-[2px]" />
          <span className="text-[10px] font-semibold">Rx</span>
        </div>
      </div>
      
      {/* Padding for bottom nav on mobile */}
      <div className="h-16 md:hidden"></div>
    </div>
  );
}
