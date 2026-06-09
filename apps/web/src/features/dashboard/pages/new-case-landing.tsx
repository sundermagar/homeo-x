import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Video, Headphones, MessageSquare, 
  Sparkles, ShieldCheck, Clock, AlertCircle
} from 'lucide-react';
import { OnlineConsultationWizard } from '../components/online-consultation-wizard';

export default function NewCaseLanding() {
  const navigate = useNavigate();
  const location = useLocation();
  const phone = (location.state as any)?.phone || '';
  const [selectedTrack, setSelectedTrack] = useState<'Video' | 'Audio' | null>(null);

  React.useEffect(() => {
    if (!phone) {
      navigate('/portal', { replace: true });
    }
  }, [phone, navigate]);

  if (!phone) return null;

  if (selectedTrack) {
    return <OnlineConsultationWizard type={selectedTrack} phone={phone} onBack={() => setSelectedTrack(null)} />;
  }

  return (
    <div className="h-screen flex flex-col font-sans selection:bg-orange-500 selection:text-white relative overflow-hidden" 
         style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 50%, #fce7f3 100%)' }}>
      
      {/* Top Navigation Bar */}
      <nav className="relative z-10 flex-none flex items-center gap-3 px-4 md:px-6 py-3 bg-white/60 backdrop-blur-xl border-b border-white shadow-sm">
        <button
          onClick={() => navigate('/portal', { replace: true })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Back</span>
        </button>
        <div className="flex items-center gap-2">
           <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-[11px]">MMC</span>
           </div>
           <h3 className="m-0 text-sm font-bold text-slate-800">
             New Patient
           </h3>
        </div>
      </nav>

      {/* Main Content Area - Scrollable on very small mobiles, but fits desktop/tablet without scroll */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-start pt-12 md:pt-20 px-4 md:px-6 overflow-y-auto">
        
        {/* No Patient Record Card */}
        <div className="bg-white rounded-[24px] p-5 mb-6 w-full max-w-3xl border border-orange-200 shadow-sm flex items-start sm:items-center gap-4 fade-in">
          <div className="w-12 h-12 rounded-[14px] bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <AlertCircle size={22} strokeWidth={2} />
          </div>
          <div className="text-left">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              No Patient Record Found
            </h3>
            <p className="text-[13px] text-slate-500 leading-relaxed m-0">
              The mobile number <strong className="text-slate-900">+91 {phone}</strong> is not registered in our system. You can start a new online consultation below.
            </p>
          </div>
        </div>

        {/* Welcome Header */}
        <div className="text-center mb-6 max-w-xl mx-auto space-y-2 fade-in">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Select Consultation Type
          </h1>
          <p className="text-sm text-slate-500">
            Choose how you'd like to consult with our doctor
          </p>
        </div>

        {/* Consultation Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-4xl fade-in" style={{ animationDelay: '0.1s' }}>
          {[
            {
              icon: <Video size={24} strokeWidth={1.5} />,
              title: 'Video',
              desc: 'Face-to-face evaluation',
              color: 'text-indigo-600',
              bg: 'bg-indigo-50',
              hoverRing: 'sm:group-hover:ring-indigo-500/50',
              active: true
            },
            {
              icon: <Headphones size={24} strokeWidth={1.5} />,
              title: 'Audio',
              desc: 'Quick voice session',
              color: 'text-sky-600',
              bg: 'bg-sky-50',
              hoverRing: 'sm:group-hover:ring-sky-500/50',
              active: true
            }
          ].map((item, idx) => {
            return (
              <button
                key={item.title}
                onClick={() => item.active ? setSelectedTrack(item.title as 'Video' | 'Audio') : null}
                className={`group relative flex sm:flex-col items-center sm:items-start bg-white rounded-2xl p-4 sm:p-5 text-left transition-all duration-300 border border-slate-100 shadow-sm
                  ${item.active 
                    ? `cursor-pointer sm:hover:-translate-y-1 sm:hover:shadow-lg ring-2 ring-transparent ${item.hoverRing}` 
                    : 'cursor-not-allowed opacity-60 grayscale-[0.2]'
                  }`}
              >
                {!item.active && (
                   <div className="absolute top-2 right-2 px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded-full uppercase tracking-wider">
                     Soon
                   </div>
                )}
                
                <div className={`w-12 h-12 rounded-xl flex shrink-0 items-center justify-center sm:mb-4 mr-4 sm:mr-0 transition-transform duration-300 ${item.active ? 'sm:group-hover:scale-110' : ''} ${item.bg} ${item.color}`}>
                  {item.icon}
                </div>
                
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-0.5 sm:mb-1">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Trust Indicators */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-8 fade-in" style={{ animationDelay: '0.2s' }}>
           <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
             <ShieldCheck className="text-emerald-500" size={16} />
             100% Secure
           </div>
           <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
             <Clock className="text-blue-500" size={16} />
             No Wait
           </div>
        </div>

      </div>
    </div>
  );
}
