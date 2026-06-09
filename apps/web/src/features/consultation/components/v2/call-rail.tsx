import type { ReactNode } from 'react';
import { Loader2, Mic, Phone, Video, Monitor, X } from 'lucide-react';
import { cn } from '../../../../lib/cn';

interface CallRailProps {
  /** The live call + transcript UI (a <ConsultationStage/>), which owns mic/STT/video. */
  children: ReactNode;
  analyseLabel: string;
  isBusy: boolean;
  onAnalyse: () => void;
  started: boolean;
  isStarting: boolean;
  onStart: () => void;
  callModeLabel: string;
  callMode: 'IN_PERSON' | 'AUDIO' | 'VIDEO';
  /** Mobile-only slide-over state. On desktop the rail is always inline. */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function CallRail({ children, analyseLabel, isBusy, onAnalyse, started, isStarting, onStart, callModeLabel, callMode, mobileOpen, onMobileClose }: CallRailProps) {
  const ModeIcon = callMode === 'IN_PERSON' ? Monitor : callMode === 'AUDIO' ? Phone : Video;
  return (
    <aside
      className={cn(
        'bg-white flex flex-col overflow-hidden z-40',
        // Mobile: fixed slide-over from the right. Desktop (lg): inline column.
        'fixed inset-y-0 right-0 w-[90%] max-w-[360px] shadow-2xl transition-transform duration-200',
        'lg:static lg:z-auto lg:shadow-none lg:shrink-0 lg:w-[344px] lg:max-w-none lg:border-l lg:border-[#E3E2DF] lg:translate-x-0 max-[1180px]:lg:w-[300px]',
        mobileOpen ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      {/* Header */}
      <div className="shrink-0 min-h-[48px] flex items-center gap-2 px-4 border-b border-[#E3E2DF]">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#888786]">Consultation</span>
        <span className="flex-1" />
        {onMobileClose && (
          <button onClick={onMobileClose} className="lg:hidden w-7 h-7 rounded-full border border-[#E3E2DF] text-[#888786] flex items-center justify-center hover:bg-[#F4F3F1]">
            <X className="h-4 w-4" />
          </button>
        )}
        {started && (
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#2563EB]">
            <span className="flex items-end gap-0.5 h-3.5">
              <i className="w-[3px] bg-[#2563EB] rounded-sm animate-pulse" style={{ height: 6 }} />
              <i className="w-[3px] bg-[#2563EB] rounded-sm animate-pulse" style={{ height: 12, animationDelay: '.12s' }} />
              <i className="w-[3px] bg-[#2563EB] rounded-sm animate-pulse" style={{ height: 8, animationDelay: '.24s' }} />
              <i className="w-[3px] bg-[#2563EB] rounded-sm animate-pulse" style={{ height: 14, animationDelay: '.36s' }} />
              <i className="w-[3px] bg-[#2563EB] rounded-sm animate-pulse" style={{ height: 6, animationDelay: '.48s' }} />
            </span>
            Live
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-3.5">
        {started ? (
          children
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center gap-6 px-6">
            <div className="relative">
              <div className="absolute inset-0 bg-[#2563EB] rounded-full opacity-[0.04] scale-[1.6]" />
              <div className="absolute inset-0 bg-[#2563EB] rounded-full opacity-[0.08] scale-[1.3]" />
              <div className="w-16 h-16 relative rounded-full bg-gradient-to-b from-[#EFF6FF] to-[#DBEAFE] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB] shadow-sm">
                <Mic className="h-7 w-7" />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <div className="text-[16px] font-semibold text-[#0F0F0E] tracking-tight">Ready to record</div>
              <div className="text-[13px] text-[#6B7280] leading-relaxed max-w-[260px] mx-auto">
                Start the consultation to capture the conversation live in <span className="font-semibold text-[#374151] inline-flex items-center gap-1 mx-0.5"><ModeIcon className="h-3.5 w-3.5" /> {callModeLabel}</span> mode.
              </div>
            </div>

            <button
              onClick={onStart}
              disabled={isStarting}
              className="mt-2 h-10 px-8 rounded-full font-semibold text-[13.5px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow hover:shadow-md transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {isStarting ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting…</> : 'Start consultation'}
            </button>
          </div>
        )}
      </div>

      {/* Analyse */}
      <div className="shrink-0 p-3.5 border-t border-[#E3E2DF]">
        <button
          onClick={onAnalyse}
          disabled={isBusy || !started}
          className="pp-btn-primary w-full h-10 inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing…</> : analyseLabel}
        </button>
      </div>
    </aside>
  );
}
