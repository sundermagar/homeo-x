import { useCallback, useState } from 'react';
import { Brain, Heart, Search, Plus, X } from 'lucide-react';
import type { GnmAnalysis, CategorizedSymptoms } from '../../../../types/ai';
import type { ScoredRemedy } from '../../../../types/ai';

interface TotalityStageProps {
  gnmAnalysis: GnmAnalysis | null;
  rankedRemedies: ScoredRemedy[];
  subjective: string;
  assessment: string;
  onRepertorize: () => void;
  onPrescribe: () => void;
  categorizedSymptoms?: CategorizedSymptoms;
  onCategorizedSymptomsChange?: React.Dispatch<React.SetStateAction<CategorizedSymptoms>>;
  isRepertorizing?: boolean;
  thermalReaction?: string;
  onThermalReactionChange?: (val: string) => void;
  miasm?: string;
  onMiasmChange?: (val: string) => void;
}

export function TotalityStage({
  gnmAnalysis,
  rankedRemedies: _rankedRemedies,
  subjective: _subjective,
  assessment: _assessment,
  onRepertorize: _onRepertorize,
  onPrescribe: _onPrescribe,
  categorizedSymptoms,
  onCategorizedSymptomsChange,
  isRepertorizing,
  thermalReaction: parentThermalReaction,
  onThermalReactionChange,
  miasm: parentMiasm,
  onMiasmChange,
}: TotalityStageProps) {
  const conflict = gnmAnalysis?.coreConflict;
  const phases = gnmAnalysis?.phases;
  const resolution = gnmAnalysis?.resolutionStrategy;
  const aiRemedies = gnmAnalysis?.rankedRemedies || [];

  // ─── Categorized symptom management ───
  const catSymptoms = categorizedSymptoms || { mental: [], physical: [], particular: [] };


  // ─── Constitutional factors — synced to parent state ───
  const thermalReaction = parentThermalReaction || '';
  const setThermalReaction = (val: string) => onThermalReactionChange?.(val);
  const dominantMiasm = parentMiasm || '';
  const setDominantMiasm = (val: string) => onMiasmChange?.(val);
  const [thirstPattern, setThirstPattern] = useState('');
  const [sleepPosition, setSleepPosition] = useState('');
  const [perspiration, setPerspiration] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');

  const addSymptom = useCallback((category: 'mental' | 'physical' | 'particular') => {
    const val = prompt(`Add ${category} symptom (Repertory format):`);
    if (val?.trim() && onCategorizedSymptomsChange) {
      onCategorizedSymptomsChange((prev) => ({
        ...prev,
        [category]: [...new Set([...prev[category], val.trim()])],
      }));
    }
  }, [onCategorizedSymptomsChange]);

  const removeSymptom = useCallback((category: 'mental' | 'physical' | 'particular', idx: number) => {
    if (onCategorizedSymptomsChange) {
      onCategorizedSymptomsChange((prev) => ({
        ...prev,
        [category]: prev[category].filter((_, i) => i !== idx),
      }));
    }
  }, [onCategorizedSymptomsChange]);

  return (
    <div className="space-y-8 pp-fade-in relative container mx-auto">
      
      {/* ═══ 1. Progress Bar ═══ */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-[#888786] uppercase tracking-widest">Step 3 of 4</span>
          <span className="text-[11px] font-bold text-[#4A4A47]">75%</span>
        </div>
        <div className="w-full h-1.5 bg-[#E3E2DF] rounded-full overflow-hidden">
          <div className="h-full bg-[#2563EB] rounded-full" style={{ width: '75%' }} />
        </div>
      </div>

      {/* ═══ 2. Title + Subtitle ═══ */}
      <div>
        <h2 className="text-xl font-bold text-[#0F0F0E] tracking-tight">Symptom Totality</h2>
        <p className="text-[13px] font-medium text-[#4A4A47] mt-1">
          Review extracted symptoms, add constitutional factors, and proceed to prescribing.
        </p>
      </div>


      {/* ═══ 4. Three-Column Symptom Grid ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Mental Generals — Purple -> Blue Default */}
        <div className="pp-card overflow-hidden">
          <div className="px-4 py-3 bg-[#FAFAF8] border-b border-[#E3E2DF] flex items-center gap-2">
            <Brain className="h-4 w-4 text-[#2563EB]" />
            <span className="text-[13px] font-bold text-[#0F0F0E] tracking-tight">Mental Generals</span>
          </div>
          <div className="p-4 space-y-2 min-h-[140px] bg-white">
            {catSymptoms.mental.length === 0 && (
              <p className="text-[12px] text-[#888786] italic py-4 text-center">No mental symptoms yet</p>
            )}
            {catSymptoms.mental.map((s, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-[#0F0F0E] bg-white border border-[#E3E2DF] group hover:border-[#BFDBFE]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0" />
                <span className="flex-1 leading-snug">{s}</span>
                {onCategorizedSymptomsChange && (
                  <button onClick={() => removeSymptom('mental', i)} className="opacity-0 group-hover:opacity-100 text-[#888786] hover:text-[#DC2626] transition-opacity p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {onCategorizedSymptomsChange && (
            <div className="px-4 pb-4">
              <button
                onClick={() => addSymptom('mental')}
                className="w-full pp-btn-secondary px-3 py-2 flex justify-center text-[12px]"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Mental Symptom
              </button>
            </div>
          )}
        </div>

        {/* Physical Generals — Blue -> Blue Default */}
        <div className="pp-card overflow-hidden">
          <div className="px-4 py-3 bg-[#FAFAF8] border-b border-[#E3E2DF] flex items-center gap-2">
            <Heart className="h-4 w-4 text-[#2563EB]" />
            <span className="text-[13px] font-bold text-[#0F0F0E] tracking-tight">Physical Generals</span>
          </div>
          <div className="p-4 space-y-2 min-h-[140px] bg-white">
            {catSymptoms.physical.length === 0 && (
              <p className="text-[12px] text-[#888786] italic py-4 text-center">No physical symptoms yet</p>
            )}
            {catSymptoms.physical.map((s, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-[#0F0F0E] bg-white border border-[#E3E2DF] group hover:border-[#BFDBFE]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0" />
                <span className="flex-1 leading-snug">{s}</span>
                {onCategorizedSymptomsChange && (
                  <button onClick={() => removeSymptom('physical', i)} className="opacity-0 group-hover:opacity-100 text-[#888786] hover:text-[#DC2626] transition-opacity p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {onCategorizedSymptomsChange && (
            <div className="px-4 pb-4">
              <button
                onClick={() => addSymptom('physical')}
                className="w-full pp-btn-secondary px-3 py-2 flex justify-center text-[12px]"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Physical Symptom
              </button>
            </div>
          )}
        </div>

        {/* Particular Symptoms — Emerald -> Blue Default */}
        <div className="pp-card overflow-hidden">
          <div className="px-4 py-3 bg-[#FAFAF8] border-b border-[#E3E2DF] flex items-center gap-2">
            <Search className="h-4 w-4 text-[#2563EB]" />
            <span className="text-[13px] font-bold text-[#0F0F0E] tracking-tight">Particular Symptoms</span>
          </div>
          <div className="p-4 space-y-2 min-h-[140px] bg-white">
            {catSymptoms.particular.length === 0 && (
              <p className="text-[12px] text-[#888786] italic py-4 text-center">No particular symptoms yet</p>
            )}
            {catSymptoms.particular.map((s, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-[#0F0F0E] bg-white border border-[#E3E2DF] group hover:border-[#BFDBFE]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0" />
                <span className="flex-1 leading-snug">{s}</span>
                {onCategorizedSymptomsChange && (
                  <button onClick={() => removeSymptom('particular', i)} className="opacity-0 group-hover:opacity-100 text-[#888786] hover:text-[#DC2626] transition-opacity p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {onCategorizedSymptomsChange && (
            <div className="px-4 pb-4">
              <button
                onClick={() => addSymptom('particular')}
                className="w-full pp-btn-secondary px-3 py-2 flex justify-center text-[12px]"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Particular Symptom
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ 5. Constitutional Factors Card ═══ */}
      <div className="pp-card p-6">
        <h3 className="text-[14px] font-bold text-[#0F0F0E] mb-5 flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full bg-[#2563EB]" /> Constitutional Factors
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          {/* Thermal Reaction */}
          <div>
            <label className="block text-[11px] font-bold text-[#888786] uppercase tracking-widest mb-1.5">Thermal Reaction</label>
            <select
              value={thermalReaction}
              onChange={(e) => setThermalReaction(e.target.value)}
              className="w-full text-[13px] font-medium text-[#0F0F0E] bg-[#FAFAF8] border border-[#E3E2DF] px-3 py-2 rounded-md focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] outline-none transition-all"
            >
              <option value="">Select...</option>
              <option value="chilly">Chilly</option>
              <option value="hot">Hot</option>
              <option value="ambithermal">Ambithermal</option>
            </select>
          </div>
          {/* Dominant Miasm */}
          <div>
            <label className="block text-[11px] font-bold text-[#888786] uppercase tracking-widest mb-1.5">Dominant Miasm</label>
            <select
              value={dominantMiasm}
              onChange={(e) => setDominantMiasm(e.target.value)}
              className="w-full text-[13px] font-medium text-[#0F0F0E] bg-[#FAFAF8] border border-[#E3E2DF] px-3 py-2 rounded-md focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] outline-none transition-all"
            >
              <option value="">Select...</option>
              <option value="psora">Psora</option>
              <option value="sycosis">Sycosis</option>
              <option value="syphilis">Syphilis</option>
              <option value="tubercular">Tubercular</option>
            </select>
          </div>
          {/* Thirst Pattern */}
          <div>
            <label className="block text-[11px] font-bold text-[#888786] uppercase tracking-widest mb-1.5">Thirst Pattern</label>
            <select
              value={thirstPattern}
              onChange={(e) => setThirstPattern(e.target.value)}
              className="w-full text-[13px] font-medium text-[#0F0F0E] bg-[#FAFAF8] border border-[#E3E2DF] px-3 py-2 rounded-md focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] outline-none transition-all"
            >
              <option value="">Select...</option>
              <option value="thirsty">Thirsty (large quantities)</option>
              <option value="thirstless">Thirstless</option>
              <option value="sips">Small sips frequently</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Sleep Position */}
          <div>
            <label className="block text-[11px] font-bold text-[#888786] uppercase tracking-widest mb-1.5">Sleep Position</label>
            <select
              value={sleepPosition}
              onChange={(e) => setSleepPosition(e.target.value)}
              className="w-full text-[13px] font-medium text-[#0F0F0E] bg-[#FAFAF8] border border-[#E3E2DF] px-3 py-2 rounded-md focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] outline-none transition-all"
            >
              <option value="">Select...</option>
              <option value="back">On back</option>
              <option value="left">Left side</option>
              <option value="right">Right side</option>
              <option value="abdomen">On abdomen</option>
              <option value="knees">Knee-chest</option>
            </select>
          </div>
          {/* Perspiration */}
          <div>
            <label className="block text-[11px] font-bold text-[#888786] uppercase tracking-widest mb-1.5">Perspiration</label>
            <select
              value={perspiration}
              onChange={(e) => setPerspiration(e.target.value)}
              className="w-full text-[13px] font-medium text-[#0F0F0E] bg-[#FAFAF8] border border-[#E3E2DF] px-3 py-2 rounded-md focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] outline-none transition-all"
            >
              <option value="">Select...</option>
              <option value="profuse">Profuse</option>
              <option value="scanty">Scanty</option>
              <option value="offensive">Offensive</option>
              <option value="staining">Staining</option>
              <option value="head">On head only</option>
            </select>
          </div>
          {/* Doctor Notes */}
          <div>
            <label className="block text-[11px] font-bold text-[#888786] uppercase tracking-widest mb-1.5">Doctor Notes</label>
            <input
              type="text"
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="Additional observations..."
              className="w-full text-[13px] font-medium text-[#0F0F0E] bg-[#FAFAF8] border border-[#E3E2DF] px-3 py-2 rounded-md focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#EFF6FF] outline-none transition-all placeholder:text-[#888786]"
            />
          </div>
        </div>
      </div>

      {/* ═══ GNM Analysis (if present) ═══ */}
      {gnmAnalysis && (
        <div className="pp-card p-6 space-y-6">
          <h3 className="text-[14px] font-bold text-[#0F0F0E] flex items-center gap-2">
            <div className="w-1.5 h-5 rounded-full bg-[#111827]" /> GNM Analysis
          </h3>

          {/* Core Conflict */}
          {conflict && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-[#4A4A47] uppercase tracking-widest">Core Conflict &mdash; <span className="text-[#0F0F0E]">{conflict.conflictType}</span></p>
              <div className="pl-4 border-l-2 border-[#E3E2DF] space-y-2">
                {conflict.triggerEvents.map((event, i) => (
                  <div key={i} className="text-[12px] text-[#4A4A47] leading-relaxed">
                    <span className="font-bold text-[#0F0F0E]">{i === 0 ? 'Primary DHS' : `Rail ${i}`}:</span> {event}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phases */}
          {phases && (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md border border-[#FCA5A5] bg-[#FEF2F2] p-4">
                <p className="text-[10px] font-bold text-[#DC2626] uppercase tracking-widest mb-1.5">Conflict-Active Phase</p>
                <p className="text-[12px] text-[#7F1D1D] font-medium">{phases.conflictActive}</p>
              </div>
              <div className="rounded-md border border-[#BFDBFE] bg-[#EFF6FF] p-4">
                <p className="text-[10px] font-bold text-[#2563EB] uppercase tracking-widest mb-1.5">Healing Phase</p>
                <p className="text-[12px] text-[#1E3A8A] font-medium">{phases.healingPhase}</p>
              </div>
            </div>
          )}

          {/* Resolution */}
          {resolution && (
            <div className="rounded-md border border-[#E3E2DF] bg-[#FAFAF8] p-4">
              <p className="text-[10px] font-bold text-[#4A4A47] uppercase tracking-widest mb-1.5">Resolution Pathway</p>
              {resolution.directions.map((dir, i) => (
                <p key={i} className="text-[12px] text-[#0F0F0E] font-medium leading-relaxed">{dir}</p>
              ))}
            </div>
          )}

          {/* AI Remedy Suggestions from GNM */}
          {aiRemedies.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#E3E2DF]">
              <p className="text-[11px] font-bold text-[#888786] uppercase tracking-widest">AI Remedy Suggestions</p>
              <div className="grid grid-cols-3 gap-3">
                {aiRemedies.map((remedy, i) => (
                  <div key={i} className="rounded-md border border-[#E3E2DF] bg-white p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-bold text-[#0F0F0E]">{remedy.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] ${i === 0 ? 'bg-[#FFFBEB] text-[#D97706]' : 'bg-[#FAFAF8] text-[#888786]'}`}>
                        #{remedy.rank}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {remedy.keynotes.slice(0, 2).map((k, j) => (
                        <p key={j} className="text-[11px] text-[#888786] truncate">{k}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ 6. Backend Processing Card (shown when repertorizing) ═══ */}
      {isRepertorizing && (
        <div className="pp-card p-6 flex items-center justify-center min-h-[140px] animate-in slide-in-from-bottom-2 duration-500">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-4 border-[#E3E2DF] border-t-[#2563EB] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-[#2563EB]">
                <Search className="h-4 w-4 animate-pulse" />
              </div>
            </div>
            <div>
              <span className="text-[15px] font-bold text-[#0F0F0E] tracking-tight">Repertorizing Symptoms...</span>
              <p className="text-[12px] font-medium text-[#4A4A47] mt-1">Sieving through Materia Medica and matching exact rubrics.</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
