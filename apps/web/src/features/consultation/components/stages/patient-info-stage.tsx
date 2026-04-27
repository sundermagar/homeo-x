import { Zap, RefreshCw, ClipboardList, Monitor, Phone, Video } from 'lucide-react';
import { cn } from '../../../../lib/cn';
import { calculateAge } from '../../../../lib/format';
import type { ConsultationMode } from '../../../../types/ai';
import type { CallMode } from '../../../../components/video-call/call-interface-panel';
import type { Visit } from '../../../../types/visit';
import type { Patient } from '../../../../types/patient';

interface PatientInfoStageProps {
  visit: Visit;
  patient?: Patient | null;
  consultationMode: ConsultationMode;
  onConsultationModeChange: (mode: ConsultationMode) => void;
  callMode: CallMode;
  onCallModeChange: (mode: CallMode) => void;
  onStartConsultation: () => void;
}

const MODE_OPTIONS: {
  key: ConsultationMode;
  icon: React.ReactNode;
  label: string;
  desc: string;
  tagline: string;
}[] = [
  {
    key: 'acute',
    icon: <Zap className="h-4 w-4" />,
    label: 'Acute',
    desc: 'Sudden onset, short duration. Focus on immediate symptoms, sensations, modalities and triggers.',
    tagline: 'Recent onset',
  },
  {
    key: 'chronic',
    icon: <RefreshCw className="h-4 w-4" />,
    label: 'Chronic',
    desc: 'Long-standing illness. Deep constitutional analysis, miasmatic background, life events.',
    tagline: 'Constitutional',
  },
  {
    key: 'followup',
    icon: <ClipboardList className="h-4 w-4" />,
    label: 'Follow-up',
    desc: 'Review response to previous prescription. Assess changes, direction of cure, new symptoms.',
    tagline: 'Post-remedy',
  },
];

const CALL_OPTIONS: {
  key: CallMode;
  icon: React.ReactNode;
  label: string;
  desc: string;
  badge?: string;
}[] = [
  {
    key: 'IN_PERSON',
    icon: <Monitor className="h-4 w-4" />,
    label: 'In-Person',
    desc: 'Patient in clinic. Record answers via voice or typing.',
  },
  {
    key: 'AUDIO',
    icon: <Phone className="h-4 w-4" />,
    label: 'Audio Call',
    desc: 'Voice-only call with live transcription and ambient scribing.',
    badge: 'LIVE',
  },
  {
    key: 'VIDEO',
    icon: <Video className="h-4 w-4" />,
    label: 'Video Call',
    desc: 'Full HD video with camera, screen share, recording & scribing.',
    badge: 'HD',
  },
];

export function PatientInfoStage({
  visit,
  patient,
  consultationMode,
  onConsultationModeChange,
  callMode,
  onCallModeChange,
  onStartConsultation: _onStartConsultation,
}: PatientInfoStageProps) {
  const patientAge = patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : undefined;


  return (
    <div className="space-y-8 pp-fade-in relative container mx-auto">
      {/* Progress Bar */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-[#888786] uppercase tracking-widest">Step 1 of 4</span>
        </div>
        <div className="w-full h-1.5 bg-[#E3E2DF] rounded-full overflow-hidden">
          <div className="h-full bg-[#2563EB] rounded-full" style={{ width: '25%' }} />
        </div>
      </div>

      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-[#0F0F0E] tracking-tight">Patient Setup & Mode</h2>
        <p className="text-sm font-medium text-[#4A4A47] mt-1">Configure consultation parameters and verify patient history.</p>
      </div>

      {/* Patient Details Card */}
      <div className="pp-card p-6">
        <div className="text-[10px] font-extrabold text-[#888786] uppercase tracking-widest mb-4">
          Patient Details
        </div>
        <div className="grid grid-cols-[1fr_80px_110px] gap-4 mb-4">
          <div>
            <label className="text-[11px] font-bold text-[#4A4A47] mb-1.5 block">Full Name *</label>
            <input className="w-full h-9 border border-[#E3E2DF] rounded-md px-3 text-[13px] font-medium text-[#0F0F0E] outline-none bg-[#FAFAF8] cursor-not-allowed" value={patient ? `${patient.firstName} ${patient.lastName}` : ''} readOnly />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#4A4A47] mb-1.5 block">Age *</label>
            <input className="w-full h-9 border border-[#E3E2DF] rounded-md px-3 text-[13px] font-medium text-[#0F0F0E] outline-none bg-[#FAFAF8] cursor-not-allowed" value={patientAge || ''} readOnly />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#4A4A47] mb-1.5 block">Gender *</label>
            <input className="w-full h-9 border border-[#E3E2DF] rounded-md px-3 text-[13px] font-medium text-[#0F0F0E] outline-none bg-[#FAFAF8] cursor-not-allowed" value={patient?.gender || ''} readOnly />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[11px] font-bold text-[#4A4A47] mb-1.5 block">MRN / Patient ID</label>
            <input className="w-full h-9 border border-[#E3E2DF] rounded-md px-3 text-[13px] font-medium text-[#0F0F0E] outline-none bg-[#FAFAF8] cursor-not-allowed pp-mono" value={patient?.mrn || patient?.id || ''} readOnly />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#4A4A47] mb-1.5 block">Contact</label>
            <input className="w-full h-9 border border-[#E3E2DF] rounded-md px-3 text-[13px] font-medium text-[#0F0F0E] outline-none bg-[#FAFAF8] cursor-not-allowed" value={patient?.phone || ''} readOnly />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-[#4A4A47] mb-1.5 block">Known Allergies</label>
            <input className="w-full h-9 border border-[#E3E2DF] rounded-md px-3 text-[13px] font-medium text-[#0F0F0E] outline-none bg-[#FAFAF8] cursor-not-allowed" value={patient?.allergies?.join(', ') || 'None known'} readOnly />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#4A4A47] mb-1.5 block">Past Prescriptions</label>
            <input className="w-full h-9 border border-[#E3E2DF] rounded-md px-3 text-[13px] font-medium text-[#0F0F0E] outline-none bg-[#FAFAF8] cursor-not-allowed" value="" placeholder="Belladonna 30C (3 months ago)" readOnly />
          </div>
        </div>
      </div>

      {/* Chief Complaint Card */}
      <div className="pp-card p-6">
        <div className="text-[10px] font-extrabold text-[#888786] uppercase tracking-widest mb-4">
          Chief Complaint *
        </div>
        <textarea
          className="w-full h-[88px] border border-[#E3E2DF] rounded-md px-3 py-2 text-[13px] font-medium text-[#0F0F0E] outline-none bg-[#FAFAF8] cursor-not-allowed resize-none"
          value={visit.chiefComplaint || ''}
          readOnly
          placeholder="Describe main complaint in detail..."
        />
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="text-[11px] font-bold text-[#4A4A47] mb-1.5 block">Duration</label>
            <input className="w-full h-9 border border-[#E3E2DF] rounded-md px-3 text-[13px] font-medium text-[#0F0F0E] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF]" placeholder="e.g. 3 days" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-[#4A4A47] mb-1.5 block">Onset</label>
            <select className="w-full h-9 border border-[#E3E2DF] rounded-md px-3 text-[13px] font-medium text-[#0F0F0E] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] bg-white">
              <option>Sudden</option>
              <option>Gradual</option>
            </select>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          CASE TYPE (Acute / Chronic / Follow-up)
          ═══════════════════════════════════════════════ */}
      <div className="pp-card p-6">
        <div className="text-[10px] font-extrabold text-[#888786] uppercase tracking-widest mb-4">
          Case Type
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {MODE_OPTIONS.map((opt) => {
            const isSelected = consultationMode === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onConsultationModeChange(opt.key)}
                className={cn(
                  'group relative flex items-center gap-3 px-4 py-4 rounded-lg border transition-all duration-200 cursor-pointer text-left',
                  isSelected
                    ? `border-[#2563EB] bg-[#EFF6FF] ring-2 ring-[#BFDBFE]/50 shadow-sm`
                    : 'border-[#E3E2DF] bg-white hover:border-[#D1D0CE] hover:bg-[#FAFAF8]'
                )}
              >
                {/* Icon */}
                <div className={cn(
                  'w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-all duration-200',
                  isSelected
                    ? `bg-[#2563EB] text-white shadow-sm`
                    : 'bg-[#F4F3F1] text-[#888786] group-hover:text-[#4A4A47]'
                )}>
                  {opt.icon}
                </div>

                {/* Label + tagline */}
                <div className="flex flex-col items-start min-w-0">
                  <span className={cn(
                    'text-[13px] font-bold transition-colors',
                    isSelected ? 'text-[#2563EB]' : 'text-[#0F0F0E]'
                  )}>
                    {opt.label}
                  </span>
                  <span className={cn(
                    'text-[11px] transition-colors leading-snug mt-0.5',
                    isSelected ? 'text-[#1D4ED8]' : 'text-[#888786]'
                  )}>
                    {opt.tagline}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          CONSULTATION TYPE (In-Person / Audio / Video)
          ═══════════════════════════════════════════════ */}
      <div className="pp-card p-6">
        <div className="text-[10px] font-extrabold text-[#888786] uppercase tracking-widest mb-4">
          Consultation Modality
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CALL_OPTIONS.map((opt) => {
            const isSelected = callMode === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onCallModeChange(opt.key)}
                className={cn(
                  'group relative flex items-center gap-3 px-4 py-4 rounded-lg border transition-all duration-200 cursor-pointer text-left',
                  isSelected
                    ? `border-[#2563EB] bg-[#EFF6FF] ring-2 ring-[#BFDBFE]/50 shadow-sm`
                    : 'border-[#E3E2DF] bg-white hover:border-[#D1D0CE] hover:bg-[#FAFAF8]'
                )}
              >
                {/* Icon */}
                <div className={cn(
                  'w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-all duration-200',
                  isSelected
                    ? `bg-[#2563EB] text-white shadow-sm`
                    : 'bg-[#F4F3F1] text-[#888786] group-hover:text-[#4A4A47]'
                )}>
                  {opt.icon}
                </div>

                {/* Label */}
                <span className={cn(
                  'text-[13px] font-bold flex-1 transition-colors',
                  isSelected ? 'text-[#2563EB]' : 'text-[#0F0F0E]'
                )}>
                  {opt.label}
                </span>

                {/* Badge */}
                {opt.badge && (
                  <span className={cn(
                    'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] shrink-0',
                    isSelected
                      ? `bg-[#2563EB] text-white`
                      : 'bg-[#E3E2DF] text-[#4A4A47]'
                  )}>
                    {opt.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Start button is in the bottom bar — no duplicate here */}
    </div>
  );
}
