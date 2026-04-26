import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import type { Patient } from '../../../../types/patient';
import type { Visit } from '../../../../types/visit';

interface IntakeStageProps {
  patient?: Patient | null;
  visit: Visit;
  patientAge?: number;
  onNext: () => void;
}

export function IntakeStage({ patient, visit, patientAge, onNext }: IntakeStageProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* ═══ LEFT: PATIENT DEMOGRAPHICS ═══ */}
      <div className="w-full lg:w-72 shrink-0 space-y-5">
        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Patient Demographics</span>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Name</label>
              <Input
                readOnly
                value={patient ? `${patient.firstName} ${patient.lastName}` : '—'}
                className="text-sm font-bold bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Age</label>
              <Input
                readOnly
                value={patientAge ? `${patientAge} years` : '—'}
                className="text-sm font-bold bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Gender</label>
              <Input
                readOnly
                value={patient?.gender || '—'}
                className="text-sm font-bold bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Marital Status</label>
              <Input
                readOnly
                value="—"
                className="text-sm font-bold bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Occupation</label>
              <Input
                readOnly
                value="—"
                className="text-sm font-bold bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Education</label>
              <Input
                readOnly
                value="—"
                className="text-sm font-bold bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Domicile / Origin</label>
            <Input
              readOnly
              value="—"
              className="text-sm font-bold bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
            />
          </div>

          <div>
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Chief complaint & duration</label>
            <Input
              readOnly
              value={visit.chiefComplaint || '—'}
              className="text-sm font-bold bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
            />
          </div>
        </div>

        {/* Consultation Mode */}
        <div className="space-y-2 pt-2">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Consultation Mode</span>
          <div className="flex gap-2">
            {[
              { label: 'Audio only', active: visit.visitType === 'AUDIO' },
              { label: 'Audio + Video', active: visit.visitType === 'VIDEO' },
              { label: 'In-person', active: !visit.visitType || !['AUDIO', 'VIDEO'].includes(visit.visitType as string) },
            ].map((mode) => (
              <span
                key={mode.label}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                  mode.active
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-gray-200 dark:border-gray-700 text-gray-400'
                }`}
              >
                {mode.label}
              </span>
            ))}
          </div>
        </div>

        {/* AI Toggles */}
        <div className="space-y-2 pt-2">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">AI Assistance</span>
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <input type="checkbox" defaultChecked className="rounded border-gray-300" />
            Auto-transcription
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <input type="checkbox" defaultChecked className="rounded border-gray-300" />
            GNM Analysis
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <input type="checkbox" defaultChecked className="rounded border-gray-300" />
            KENT Repertory
          </label>
        </div>
      </div>

      {/* ═══ CENTER: NEVER WELL SINCE — EVENT HISTORY ═══ */}
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Never Well Since — Event History
          </span>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">
            DHS pre-loaded by AI
          </span>
        </div>

        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
          <p className="text-sm text-gray-400 font-medium">
            Event history will populate during consultation
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Start the consultation to begin AI-powered timeline extraction
          </p>
        </div>


      </div>

      {/* ═══ RIGHT: CONSULTATION HISTORY ═══ */}
      <div className="w-full lg:w-56 shrink-0 space-y-3">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
          Consultation History
        </span>

        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center">
          <p className="text-xs text-gray-400 font-medium">No previous visits</p>
        </div>
      </div>
    </div>
  );
}
