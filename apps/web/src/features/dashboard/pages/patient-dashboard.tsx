import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/shared/stores/auth-store';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Calendar, Stethoscope, ChevronRight, Activity, Clock, FileText, 
  MapPin, CreditCard, UploadCloud, User, Plus, Phone, Heart, 
  Thermometer, ShieldCheck, CheckCircle2, MessageCircle, RotateCw, 
  AlertCircle, AlertTriangle, Sparkles, Scale, Info
} from 'lucide-react';
import { FollowUpWizard } from '../components/follow-up-wizard';
import { VisitClinicWizard } from '../components/visit-clinic-wizard';
import { useMyMedicalRecords } from '@/features/medical-case/hooks/use-medical-cases';
import { useAppointments, useUpdateStatus } from '@/features/appointments/hooks/use-appointments';
import { useOrganizations } from '@/features/platform/hooks/use-organizations';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function PatientDashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  
  // View state: 'dashboard' | 'visit-clinic' | 'follow-up'
  const [view, setView] = useState<'dashboard' | 'visit-clinic' | 'follow-up'>('dashboard');

  // Queries
  const { data: records, isLoading: recordsLoading } = useMyMedicalRecords();
  const { data: apptsResult, isLoading: apptsLoading, refetch: refetchAppts } = useAppointments();
  const { data: orgs = [] } = useOrganizations();
  const updateStatus = useUpdateStatus();

  // Local state for cancellation confirmation
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Local state for interactive medicine checklist (day tracking)
  const [takenMeds, setTakenMeds] = useState<Record<string, boolean>>({});

  const currentOrg = orgs[0];
  const helplinePhone = currentOrg?.phone || '';
  const whatsappLink = helplinePhone 
    ? `https://wa.me/${helplinePhone.replace(/\D/g, '')}?text=Hello,%20I%20need%20help%20with%20my%20treatment.` 
    : 'https://wa.me/';

  // Toggle med tracking
  const toggleMed = (medId: string) => {
    setTakenMeds(prev => ({
      ...prev,
      [medId]: !prev[medId]
    }));
  };

  // Upcoming appointment resolution
  const activeAppts = apptsResult?.data?.filter((a: any) => 
    ['Scheduled', 'Confirmed', 'Arrived', 'Consultation', 'Pending', 'Waitlist'].includes(a.status)
  ) || [];

  const sortedActive = [...activeAppts].sort((a: any, b: any) => {
    const da = new Date(`${a.bookingDate}T${a.bookingTime || '00:00:00'}`);
    const db = new Date(`${b.bookingDate}T${b.bookingTime || '00:00:00'}`);
    return da.getTime() - db.getTime();
  });

  const nextAppt = sortedActive[0];

  const handleCancelAppointment = async (id: number) => {
    setIsCancelling(true);
    try {
      await updateStatus.mutateAsync({ id, status: 'Cancelled' });
      toast({
        title: 'Appointment Cancelled',
        description: 'Your appointment has been successfully cancelled.',
      });
      setIsConfirmingCancel(false);
      refetchAppts();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to cancel the appointment.',
        variant: 'error',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (view === 'follow-up') {
    return <FollowUpWizard onBack={() => setView('dashboard')} />;
  }

  if (view === 'visit-clinic') {
    return <VisitClinicWizard onBack={() => setView('dashboard')} />;
  }

  // Loading state
  const isPageLoading = recordsLoading || apptsLoading;

  if (isPageLoading) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 animate-pulse">
        {/* Hero skeleton */}
        <div className="h-64 bg-slate-100 rounded-3xl" />
        {/* Quick Actions skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-2xl" />
          ))}
        </div>
        {/* Main Grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="h-48 bg-slate-100 rounded-3xl" />
            <div className="h-64 bg-slate-100 rounded-3xl" />
          </div>
          <div className="space-y-8">
            <div className="h-56 bg-slate-100 rounded-3xl" />
            <div className="h-56 bg-slate-100 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  const medicalCase = records?.medicalCase;
  const vitals = records?.vitals || [];
  const latestVitals = vitals[0];
  const prescriptions = records?.prescriptions || [];
  const activePackage = records?.activePackage;

  // Age calculations
  const calculateAge = (dobString?: string | null) => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };
  const age = calculateAge(medicalCase?.dateOfBirth);

  // Vitals evaluations
  const getBpStatus = (sys?: number | null, dia?: number | null) => {
    if (!sys || !dia) return { label: 'Normal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (sys < 120 && dia < 80) return { label: 'Normal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (sys < 130 && dia < 80) return { label: 'Elevated', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'High', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const getTempStatus = (temp?: number | null) => {
    if (!temp) return { label: 'Normal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (temp < 99.1) return { label: 'Normal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (temp <= 100.4) return { label: 'Low Grade Fever', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'Fever', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const getPulseStatus = (pulse?: number | null) => {
    if (!pulse) return { label: 'Normal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (pulse >= 60 && pulse <= 100) return { label: 'Normal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    return { label: 'Out of Range', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const getSpO2Status = (spo2?: number | null) => {
    if (!spo2) return { label: 'Normal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (spo2 >= 95) return { label: 'Normal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    return { label: 'Low Oxygen', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  const getBmiStatus = (bmi?: number | null) => {
    if (!bmi) return { label: 'Normal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    if (bmi < 25) return { label: 'Normal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'Obese', color: 'text-rose-700 bg-rose-50 border-rose-200' };
  };

  // Generate Vitals Insight Statement
  const generateVitalsInsight = () => {
    if (!latestVitals) return "No vitals recorded yet. Your vitals will be tracked during your next clinic visit.";
    const warnings: string[] = [];
    
    const bp = getBpStatus(latestVitals.systolicBp, latestVitals.diastolicBp);
    if (bp.label === 'High') warnings.push('blood pressure is elevated');
    
    const temp = getTempStatus(latestVitals.temperatureF);
    if (temp.label === 'Fever') warnings.push('body temperature indicates a fever');
    
    const spo2 = getSpO2Status(latestVitals.oxygenSaturation);
    if (spo2.label === 'Low Oxygen') warnings.push('oxygen levels are below optimal range');
    
    if (warnings.length > 0) {
      return `Your latest vitals show that your ${warnings.join(' and ')}. Please take your remedies as directed and stay well hydrated. Contact your practitioner if you feel unwell.`;
    }
    return "All your vitals checked during your last visit are in the optimal normal range. Keep up the healthy habits!";
  };

  // Formatted date string for next appointment
  const getFormattedApptDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'EEEE, MMMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  // Expiry Calculation for packages
  const getPackageExpiryDays = (expiryStr?: string) => {
    if (!expiryStr) return null;
    const diff = new Date(expiryStr).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };
  const packageDaysRemaining = getPackageExpiryDays(activePackage?.expiryDate);

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-8 fade-in text-slate-700">
      
      {/* Premium Hero Banner */}
      <div className="relative rounded-3xl p-6 md:p-10 text-white shadow-xl overflow-hidden bg-gradient-to-tr from-blue-700 via-indigo-700 to-violet-700">
        <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-10 w-96 h-96 bg-sky-400 rounded-full mix-blend-screen filter blur-3xl opacity-20" />
        <div className="absolute -bottom-24 -right-32 w-96 h-96 bg-purple-400 rounded-full mix-blend-screen filter blur-3xl opacity-25" />
        
        <div className="relative z-10 flex flex-col gap-6 md:gap-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-sky-100 border border-white/10 mb-4">
              <Sparkles size={12} className="text-yellow-300 animate-pulse" />
              {user?.clinicName || 'MMC Clinic Portal'}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 text-white">
              Welcome back, <span className="text-sky-300">{user?.name?.split(' ')[0] || 'Patient'}</span>
            </h1>
            <p className="text-sm md:text-base text-indigo-100 font-light max-w-xl">
              Track your treatment plans, view vitals history, and manage clinic appointments seamlessly from your dashboard.
            </p>
          </div>

          {/* Glassmorphism Profile details block */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-sm">
            <div className="space-y-1">
              <span className="text-indigo-200 text-xs uppercase font-semibold tracking-wider">Patient ID</span>
              <p className="font-mono font-bold text-white text-base">PT-{user?.regid || user?.id || '—'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-indigo-200 text-xs uppercase font-semibold tracking-wider">Age / Gender</span>
              <p className="font-bold text-white text-base">
                {age ? `${age} yrs` : '—'} • {medicalCase?.gender || '—'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-indigo-200 text-xs uppercase font-semibold tracking-wider">Primary Doctor</span>
              <p className="font-bold text-white text-base truncate">
                {medicalCase?.doctorName || 'Practitioner'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-indigo-200 text-xs uppercase font-semibold tracking-wider">Registered On</span>
              <p className="font-bold text-white text-base">
                {medicalCase?.registeredAt ? format(new Date(medicalCase.registeredAt), 'dd MMM yyyy') : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        <div 
          onClick={() => setView('visit-clinic')}
          className="group cursor-pointer bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 flex flex-col justify-between"
        >
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
            <Calendar size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">Schedule Visit</h3>
            <p className="text-xs text-slate-400 mt-1">Book an in-person consultation slot</p>
          </div>
        </div>

        <div 
          onClick={() => setView('follow-up')}
          className="group cursor-pointer bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 flex flex-col justify-between"
        >
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
            <Stethoscope size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">Request Refill</h3>
            <p className="text-xs text-slate-400 mt-1">Follow-up progress & medicine repeat</p>
          </div>
        </div>

        <div 
          onClick={() => navigate('/reports')}
          className="group cursor-pointer bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all duration-300 flex flex-col justify-between"
        >
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
            <UploadCloud size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm group-hover:text-purple-600 transition-colors">Upload Reports</h3>
            <p className="text-xs text-slate-400 mt-1">Upload files, scans or medical media</p>
          </div>
        </div>

        <a 
          href={whatsappLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="group bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-teal-200 transition-all duration-300 flex flex-col justify-between text-left decoration-transparent"
        >
          <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-teal-600 group-hover:text-white transition-all duration-300">
            <MessageCircle size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm group-hover:text-teal-600 transition-colors">Clinic Helpline</h3>
            <p className="text-xs text-slate-400 mt-1">Get quick support via WhatsApp chat</p>
          </div>
        </a>

      </div>

      {/* Main Core Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Double Columns: Appt, Vitals & Remedies */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Upcoming Appointment tracker */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Calendar size={18} className="text-indigo-600" />
                Upcoming Consultations
              </h2>
              {nextAppt && (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {nextAppt.status}
                </span>
              )}
            </div>

            {nextAppt ? (
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/55 p-5 rounded-2xl border border-slate-100/80">
                <div className="space-y-2">
                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Practitioner</div>
                  <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <User size={16} className="text-indigo-500" />
                    Dr. {nextAppt.doctorName || 'Resident Doctor'}
                  </h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 text-xs">
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} className="text-slate-400" />
                      {getFormattedApptDate(nextAppt.bookingDate)} at {nextAppt.bookingTime}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Activity size={13} className="text-slate-400" />
                      {nextAppt.visitType || 'General Consultation'}
                    </span>
                    {nextAppt.tokenNo && (
                      <span className="font-semibold text-indigo-600">
                        Token: #{nextAppt.tokenNo}
                      </span>
                    )}
                  </div>
                </div>

                <div className="self-stretch md:self-auto flex items-center gap-3">
                  {isConfirmingCancel ? (
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <button
                        onClick={() => handleCancelAppointment(nextAppt.id)}
                        disabled={isCancelling}
                        className="flex-1 md:flex-none px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors"
                      >
                        {isCancelling ? 'Cancelling...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setIsConfirmingCancel(false)}
                        className="flex-1 md:flex-none px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                      >
                        Keep Visit
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsConfirmingCancel(true)}
                      className="w-full md:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-all duration-200"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Calendar size={20} />
                </div>
                <h4 className="font-semibold text-slate-700 text-sm">No scheduled clinic visits</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Stay on top of your healing progress. Book a fresh consultation today.</p>
                <button
                  onClick={() => setView('visit-clinic')}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={14} /> Book Consultation
                </button>
              </div>
            )}
          </div>

          {/* Vitals Widget */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Heart size={18} className="text-rose-500" />
                Latest Vital Parameters
              </h2>
              {latestVitals && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock size={12} />
                  Measured on {format(new Date(latestVitals.recordedAt || new Date()), 'dd MMM yyyy')}
                </span>
              )}
            </div>

            {latestVitals ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {/* BP */}
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                    <span className="text-xs text-slate-400 font-medium">Blood Pressure</span>
                    <div className="font-bold text-slate-800 text-lg">
                      {latestVitals.systolicBp || '—'}/{latestVitals.diastolicBp || '—'}
                      <span className="text-xs text-slate-400 font-light block">mmHg</span>
                    </div>
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border ${getBpStatus(latestVitals.systolicBp, latestVitals.diastolicBp).color}`}>
                      {getBpStatus(latestVitals.systolicBp, latestVitals.diastolicBp).label}
                    </span>
                  </div>

                  {/* Temp */}
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <Thermometer size={12} className="text-orange-500" /> Temp
                    </span>
                    <div className="font-bold text-slate-800 text-lg">
                      {latestVitals.temperatureF ? `${latestVitals.temperatureF}°F` : '—'}
                    </div>
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border ${getTempStatus(latestVitals.temperatureF).color}`}>
                      {getTempStatus(latestVitals.temperatureF).label}
                    </span>
                  </div>

                  {/* Pulse */}
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                    <span className="text-xs text-slate-400 font-medium">Pulse Rate</span>
                    <div className="font-bold text-slate-800 text-lg">
                      {latestVitals.pulseRate ? `${latestVitals.pulseRate} bpm` : '—'}
                    </div>
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border ${getPulseStatus(latestVitals.pulseRate).color}`}>
                      {getPulseStatus(latestVitals.pulseRate).label}
                    </span>
                  </div>

                  {/* SpO2 */}
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                    <span className="text-xs text-slate-400 font-medium">SpO2 (Oxygen)</span>
                    <div className="font-bold text-slate-800 text-lg">
                      {latestVitals.oxygenSaturation ? `${latestVitals.oxygenSaturation}%` : '—'}
                    </div>
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border ${getSpO2Status(latestVitals.oxygenSaturation).color}`}>
                      {getSpO2Status(latestVitals.oxygenSaturation).label}
                    </span>
                  </div>

                  {/* BMI / Weight */}
                  <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2 col-span-2 md:col-span-1">
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <Scale size={12} className="text-blue-500" /> Weight & BMI
                    </span>
                    <div className="font-bold text-slate-800 text-lg leading-tight">
                      {latestVitals.weightKg ? `${latestVitals.weightKg} kg` : '—'}
                      <span className="text-xs text-slate-400 font-light block">
                        BMI: {latestVitals.bmi || '—'}
                      </span>
                    </div>
                    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full border ${getBmiStatus(latestVitals.bmi).color}`}>
                      {getBmiStatus(latestVitals.bmi).label}
                    </span>
                  </div>
                </div>

                {/* Vitals Insight banner */}
                <div className="flex items-start gap-3 p-4 bg-sky-50 rounded-xl border border-sky-100 text-sky-800 text-sm">
                  <Info size={16} className="text-sky-500 shrink-0 mt-0.5" />
                  <p className="font-medium text-sky-900/80 leading-relaxed">
                    {generateVitalsInsight()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400">Vitals parameters are not registered in your file yet.</p>
              </div>
            )}
          </div>

          {/* Active Remedies checklist */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <RotateCw size={18} className="text-emerald-500" />
                Active Remedies & Prescription
              </h2>
              <span className="text-xs text-slate-400 font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                {prescriptions.length} Active Remedies
              </span>
            </div>

            {prescriptions.length > 0 ? (
              <div className="space-y-4">
                {prescriptions.map((rx: any) => {
                  const medKey = `${rx.id}-${rx.remedyName}`;
                  const isChecked = !!takenMeds[medKey];

                  return (
                    <div 
                      key={rx.id} 
                      className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border transition-all duration-200 ${
                        isChecked 
                          ? 'border-emerald-100 bg-emerald-50/20 opacity-80' 
                          : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <button 
                          onClick={() => toggleMed(medKey)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border mt-1 transition-colors duration-200 ${
                            isChecked 
                              ? 'bg-emerald-600 border-emerald-600 text-white' 
                              : 'bg-white border-slate-200 text-transparent hover:border-slate-300'
                          }`}
                        >
                          <CheckCircle2 size={16} className="stroke-[3px]" />
                        </button>
                        
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-2">
                            <h4 className={`font-bold text-base transition-all duration-200 ${isChecked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {rx.remedyName || rx.remedy_name}
                            </h4>
                            <span className="text-xs text-indigo-600 font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100/50">
                              {rx.potencyName || rx.potency_name || rx.potency || '30C'}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 text-xs">
                            <span className="font-semibold text-slate-600">
                              Frequency: {rx.frequencyTitle || rx.frequency_name || rx.frequency || 'As directed'}
                            </span>
                            <span>•</span>
                            <span className="text-slate-400">
                              Duration: {rx.days || rx.rx_days ? `${rx.days || rx.rx_days} days` : 'As advised'}
                            </span>
                          </div>

                          {(rx.instructions || rx.prescription) && (
                            <p className="text-xs italic text-slate-400 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100/50 max-w-xl">
                              "{rx.instructions || rx.prescription}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end md:self-auto text-xs font-semibold">
                        {isChecked ? (
                          <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Dose Completed Today
                          </span>
                        ) : (
                          <span className="text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200 flex items-center gap-1">
                            Dose Pending Today
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <RotateCw size={16} />
                </div>
                <h4 className="font-semibold text-slate-600 text-sm">No active prescriptions</h4>
                <p className="text-xs text-slate-400 mt-1">Your doctor will prescribe remedies during your clinic sessions.</p>
              </div>
            )}
          </div>

        </div>

        {/* Right Single Column: Active Package & Health Tips */}
        <div className="space-y-8">
          
          {/* Active Package card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <CreditCard size={18} className="text-indigo-500" />
                Active Health Package
              </h2>
            </div>

            {activePackage ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{activePackage.packageName}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Valid till {format(new Date(activePackage.expiryDate), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wide">
                    Active
                  </span>
                </div>

                {/* Progress bar of days remaining */}
                {packageDaysRemaining !== null && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">Validity Progress</span>
                      <span className="text-slate-600">{packageDaysRemaining} Days Left</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, (packageDaysRemaining / 365) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Cover details */}
                <div className="pt-2 border-t border-slate-50 space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-500" /> Clinic Consultation Cover
                    </span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">100% Covered</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-500" /> Homeopathy Medicine Cover
                    </span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">100% Covered</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-3 text-indigo-500">
                    <CreditCard size={18} />
                  </div>
                  <h4 className="font-semibold text-slate-700 text-sm">No Active Package Plan</h4>
                  <p className="text-xs text-slate-400 mt-1.5 max-w-[220px] mx-auto">
                    Subscribe to clinic packages for premium benefits, free refills, and priority queues.
                  </p>
                </div>
                
                <button
                  onClick={() => window.open(whatsappLink, '_blank')}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5"
                >
                  Inquire about Memberships
                </button>
              </div>
            )}
          </div>

          {/* Smart Wellness Tips */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100/40 p-6 shadow-sm space-y-5">
            <h2 className="font-bold text-indigo-900 text-base flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-600" />
              Treatment Guidelines
            </h2>

            <ul className="space-y-3.5 text-xs text-indigo-800 leading-relaxed font-medium">
              <li className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 text-indigo-600 shadow-sm font-bold text-[10px]">
                  1
                </div>
                <span>Avoid food, water, or strong substances (like toothpaste or coffee) for 20 minutes before and after taking remedies.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 text-indigo-600 shadow-sm font-bold text-[10px]">
                  2
                </div>
                <span>Store your homeopathic pills in a cool, dry place away from direct sunlight, camphor, or strong perfumes.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0 text-indigo-600 shadow-sm font-bold text-[10px]">
                  3
                </div>
                <span>Try to take your remedies at consistent times daily. Mark your dosage checklist here to maintain habit progress.</span>
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
