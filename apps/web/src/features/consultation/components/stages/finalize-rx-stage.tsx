import React, { useState, useEffect } from 'react';
import { FlaskConical, X, Check, Activity, Clock, CalendarDays, ScrollText } from 'lucide-react';
import { cn } from '../../../../lib/cn';
import type { RemedyRxRow } from './repertory-stage';
import { useDayCharges } from '../../../billing/hooks/use-accounts';

interface FinalizeRxStageProps {
  selectedRemedies: RemedyRxRow[];
  initialAdvice?: string;
  initialFollowUp?: string;
  onDataChange: (rows: RemedyRxRow[], advice: string, followUp: string) => void;
}

function parseDurationToDays(durationStr: string): number {
  if (!durationStr) return 0;
  const cleaned = durationStr.toLowerCase().trim();

  const daysMatch = cleaned.match(/^(\d+)\s*day/);
  if (daysMatch) return parseInt(daysMatch[1]!, 10);

  const weeksMatch = cleaned.match(/^(\d+)\s*week/);
  if (weeksMatch) return parseInt(weeksMatch[1]!, 10) * 7;

  const monthsMatch = cleaned.match(/^(\d+)\s*month/);
  if (monthsMatch) return parseInt(monthsMatch[1]!, 10) * 30;

  const bareNumberMatch = cleaned.match(/^(\d+)$/);
  if (bareNumberMatch) return parseInt(bareNumberMatch[1]!, 10);

  return 0;
}

export function FinalizeRxStage({ selectedRemedies, initialAdvice, initialFollowUp, onDataChange }: FinalizeRxStageProps) {
  const [rxRows, setRxRows] = useState<RemedyRxRow[]>(selectedRemedies);
  const [advice, setAdvice] = useState(initialAdvice || '');
  const [followUp, setFollowUp] = useState(initialFollowUp || '');
  const userEditedFollowUp = React.useRef(false);
  const { data: dayCharges = [] } = useDayCharges();

  // Auto-fill Next Review Date based on max duration
  useEffect(() => {
    if (userEditedFollowUp.current || rxRows.length === 0) return;

    let maxDays = 0;
    for (const row of rxRows) {
      const days = parseDurationToDays(row.duration);
      if (days > maxDays) {
        maxDays = days;
      }
    }

    if (maxDays > 0) {
      const date = new Date();
      date.setDate(date.getDate() + maxDays);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      setFollowUp(`${yyyy}-${mm}-${dd}`);
    }
  }, [rxRows]);

  // Report changes up to the layout immediately
  useEffect(() => {
    onDataChange(rxRows, advice, followUp);
  }, [rxRows, advice, followUp, onDataChange]);

  const updateRx = (remedyId: string, field: keyof RemedyRxRow, value: string) =>
    setRxRows((rows) => rows.map((r) => (r.remedyId === remedyId ? { ...r, [field]: value } : r)));

  const removeRx = (remedyId: string) => {
    setRxRows(rows => rows.filter(r => r.remedyId !== remedyId));
  };

  if (rxRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-3 pp-fade-in py-20">
        <div className="w-16 h-16 bg-[#FAFAF8] rounded-full flex items-center justify-center border border-[#E3E2DF]">
          <FlaskConical className="h-6 w-6 text-[#888786]" />
        </div>
        <h2 className="text-xl font-bold text-[#0F0F0E]">No Remedies Selected</h2>
        <p className="text-[13px] text-[#4A4A47]">Please go back to the Remedy Selection step and select at least one remedy.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pp-fade-in max-w-4xl mx-auto">
      <div className="mb-4">
        <h2 className="text-2xl font-black text-[#0F0F0E] tracking-tight">Finalize Prescription</h2>
        <p className="text-[14px] font-medium text-[#4A4A47] mt-1">
          Review and edit the dosage, instructions, and lifestyle advice before completing.
        </p>
      </div>

      <div className="space-y-6">
        {rxRows.map(row => (
          <div key={row.remedyId} className="bg-white border border-[#E3E2DF] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F4F3F1] bg-[#FAFAF8] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center font-bold text-[16px] text-[#2563EB]">
                  {row.remedyName[0]}
                </div>
                <div>
                  <h3 className="text-[16px] font-black text-[#0F0F0E] leading-none">{row.remedyName}</h3>
                  <p className="text-[11px] font-bold text-[#2563EB] mt-1 tracking-wide uppercase">Selected Remedy</p>
                </div>
              </div>
              <button
                onClick={() => removeRx(row.remedyId)}
                className="text-[12px] font-bold text-[#D92D20] bg-[#FEF2F2] hover:bg-[#FEE2E2] px-3 py-1.5 rounded-md transition-colors border border-[#FECACA]"
              >
                Remove
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#4A4A47] uppercase tracking-widest">
                    <Activity className="h-3.5 w-3.5 text-[#2563EB]" /> Potency
                  </label>
                  <select
                    className="w-full h-11 px-3 text-[14px] font-medium border border-[#E3E2DF] rounded-md outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] bg-white"
                    value={row.potency}
                    onChange={(e) => updateRx(row.remedyId, 'potency', e.target.value)}
                  >
                    {['30C', '200C', '1M', '10M', 'Q (Mother Tincture)', '6X', '12X', 'Ointment'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#4A4A47] uppercase tracking-widest">
                    Dose
                  </label>
                  <input
                    type="text"
                    className="w-full h-11 px-3 text-[14px] font-medium border border-[#E3E2DF] rounded-md outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    value={row.dose}
                    onChange={(e) => updateRx(row.remedyId, 'dose', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#4A4A47] uppercase tracking-widest">
                    <Clock className="h-3.5 w-3.5 text-[#2563EB]" /> Frequency
                  </label>
                  <select
                    className="w-full h-11 px-3 text-[14px] font-medium border border-[#E3E2DF] rounded-md outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] bg-white"
                    value={row.frequency}
                    onChange={(e) => updateRx(row.remedyId, 'frequency', e.target.value)}
                  >
                    <option value="Single dose">Single dose</option>
                    <option value="Once daily">Once daily (OD)</option>
                    <option value="Twice daily">Twice daily (BD)</option>
                    <option value="Thrice daily">Thrice daily (TDS)</option>
                    <option value="SOS">SOS (As needed)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#4A4A47] uppercase tracking-widest">
                    <CalendarDays className="h-3.5 w-3.5 text-[#2563EB]" /> Duration
                  </label>
                  <select
                    className="w-full h-11 px-3 text-[14px] font-medium border border-[#E3E2DF] rounded-md outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] bg-white"
                    value={row.duration}
                    onChange={(e) => updateRx(row.remedyId, 'duration', e.target.value)}
                  >
                    <option value="" disabled>Select duration</option>
                    <option value="Stat">Stat (Immediate)</option>
                    {dayCharges && dayCharges.length > 0 ? (
                      dayCharges.map(charge => (
                        <option key={charge.id} value={charge.days || ''}>
                          {charge.days}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="1 week">1 week</option>
                        <option value="15 days">15 days</option>
                        <option value="30 days">30 days</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-1.5">
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#4A4A47] uppercase tracking-widest">
                    <ScrollText className="h-3.5 w-3.5 text-[#2563EB]" /> Instructions
                  </label>
                  <input
                    type="text"
                    className="w-full h-11 px-3 text-[14px] font-medium border border-[#E3E2DF] rounded-md outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    value={row.instruction}
                    onChange={(e) => updateRx(row.remedyId, 'instruction', e.target.value)}
                    placeholder="e.g. Empty stomach, mix in water"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Advice & FollowUp Card */}
        <div className="bg-white border border-[#E3E2DF] rounded-xl shadow-sm overflow-hidden p-6 mt-6">
          <div className="space-y-8">
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold text-[#4A4A47] uppercase tracking-widest">Advice / Diet</label>
              <textarea
                className="w-full h-28 px-4 py-3 text-[14px] font-medium border border-[#E3E2DF] rounded-lg outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] resize-none leading-relaxed bg-[#FAFAF8] focus:bg-white transition-all"
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder="e.g. Drink plenty of plain water..."
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="text-[11px] font-bold text-[#4A4A47] uppercase tracking-widest whitespace-nowrap">Next Review Date</label>
              <input
                type="date"
                className="w-full max-w-[300px] h-11 px-4 text-[14px] font-medium border border-[#E3E2DF] rounded-lg outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] bg-[#FAFAF8] focus:bg-white transition-all"
                value={followUp}
                onChange={(e) => {
                  userEditedFollowUp.current = true;
                  setFollowUp(e.target.value);
                }}
                placeholder="e.g. 2 weeks"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
