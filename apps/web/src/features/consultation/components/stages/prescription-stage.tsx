import { useState, useEffect, useCallback, useRef } from 'react';
import { Check, ChevronRight, MessageSquare } from 'lucide-react';
import { Input } from '../../../../components/ui/input';
import type { GnmAnalysis, ScoredRemedy } from '../../../../types/ai';
import type { CreatePrescriptionItemInput } from '../../../../types/prescription';

interface PrescriptionStageProps {
  visitId: string;
  rxItems: CreatePrescriptionItemInput[];
  onRxItemsChange: (items: CreatePrescriptionItemInput[]) => void;
  advice: string;
  onAdviceChange: (val: string) => void;
  followUp: string;
  onFollowUpChange: (val: string) => void;
  diagnoses: string[];
  soapData?: { subjective?: string; objective?: string; plan?: string };
  patient?: {
    name: string;
    age?: number;
    gender?: string;
    mrn?: string;
  } | null;
  gnmAnalysis: GnmAnalysis | null;
  scoredRemedies: ScoredRemedy[];
  onComplete: () => void;
  isCompleting: boolean;
  /** Expose the internal prescription step to the parent */
  onPrescriptionStepChange?: (step: number, generateFn: () => void) => void;
}

const POTENCIES = ['6C', '30C', '200C', '1M', '10M', 'LM1'];
const ROUTES = ['Dry on tongue', 'In water', 'Olfaction', 'External application'];

function StepIndicator({ step, currentStep, label }: { step: number; currentStep: number; label: string }) {
  const isComplete = currentStep > step;
  const isActive = currentStep === step;
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
          isComplete
            ? 'bg-emerald-500 text-white'
            : isActive
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
            : 'bg-gray-200 text-gray-500'
        }`}
      >
        {isComplete ? <Check className="h-3.5 w-3.5" /> : step}
      </div>
      <span className={`text-xs font-bold ${isActive ? 'text-indigo-600' : isComplete ? 'text-emerald-600' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}

// ─── Resizable Preview Panel (Editable) ───
function ResizablePreview({
  patient,
  formattedDate,
  diagnoses,
  rxItems,
  supportiveTopical,
  followUp,
  antidoteAvoidance,
  gnmCounselling,
  soapData,
  onRxItemUpdate,
  onSupportiveTopicalChange,
  onFollowUpChange,
  onAntidoteAvoidanceChange,
  onGnmCounsellingChange,
}: {
  patient?: PrescriptionStageProps['patient'];
  formattedDate: string;
  diagnoses: string[];
  rxItems: CreatePrescriptionItemInput[];
  supportiveTopical: string;
  followUp: string;
  antidoteAvoidance: string;
  gnmCounselling: string;
  soapData?: { subjective?: string; objective?: string; plan?: string };
  onRxItemUpdate: (index: number, updates: Partial<CreatePrescriptionItemInput>) => void;
  onSupportiveTopicalChange: (val: string) => void;
  onFollowUpChange: (val: string) => void;
  onAntidoteAvoidanceChange: (val: string) => void;
  onGnmCounsellingChange: (val: string) => void;
}) {
  const [width, setWidth] = useState(384); // 24rem = 384px
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(384);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startX.current - e.clientX; // drag left = increase width
      const newWidth = Math.max(280, Math.min(700, startWidth.current + delta));
      setWidth(newWidth);
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="shrink-0 hidden lg:flex" style={{ width }}>
      {/* ─── Column Drag Handle (left edge) ─── */}
      <div
        onMouseDown={handleMouseDown}
        className={`w-2 shrink-0 cursor-col-resize group relative flex items-center justify-center transition-colors ${
          isDragging.current ? 'bg-teal-100' : 'hover:bg-gray-100'
        }`}
        title="Drag to resize"
      >
        {/* Visible drag bar */}
        <div className={`w-[3px] h-12 rounded-full transition-colors ${
          isDragging.current ? 'bg-teal-400' : 'bg-gray-300 group-hover:bg-teal-400'
        }`} />
        {/* Arrows indicator on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <span className="text-[8px] text-teal-600 font-black">⟨⟩</span>
        </div>
      </div>

      {/* ─── Preview Content ─── */}
      <div className="flex-1 min-w-0 pl-3">
        <div className="flex items-center mb-3">
          <span className="section-label text-gray-500">Prescription Preview</span>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 rx-card space-y-4 sticky top-4">
          {/* Header */}
          <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-gray-200 pb-4">
            <div>
              <span className="text-gray-400 font-bold">Patient</span>
              <span className="text-gray-900 font-bold ml-1">{patient?.name || '—'}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-400 font-bold">Age</span>
              <span className="text-gray-900 font-bold ml-1">
                {patient?.age ? `${patient.age} yr` : '—'} / {patient?.gender?.[0] || '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 font-bold">Date</span>
              <span className="text-gray-900 font-bold ml-1">{formattedDate}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-400 font-bold">ID</span>
              <span className="text-gray-900 font-bold ml-1">#{patient?.mrn || '—'}</span>
            </div>
          </div>

          {/* Clinical Summary */}
          {soapData && (soapData.subjective || soapData.objective) && (
            <div className="pt-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Clinical Summary</span>
              <p className="text-xs text-gray-700 font-medium mt-1 whitespace-pre-wrap">
                {[soapData.subjective, soapData.objective].filter(Boolean).join('\n\n')}
              </p>
            </div>
          )}

          {/* Diagnosis */}
          {diagnoses.length > 0 && (
            <div className="pt-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Diagnosis</span>
              <p className="text-xs text-gray-700 font-medium mt-1">{diagnoses.join(' — ')}</p>
            </div>
          )}

          {/* Rx Items Header */}
          <div className="pt-2">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Prescription</span>
          </div>

          {/* Rx Items (Editable) */}
          <div className="space-y-5">
            {rxItems.map((item, i) => (
              <div key={i} className="space-y-1.5">
                <input
                  value={item.medicationName || ''}
                  onChange={(e) => onRxItemUpdate(i, { medicationName: e.target.value })}
                  className="text-base font-black text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-teal-500 focus:outline-none w-full transition-colors"
                  placeholder="Remedy name"
                />
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <input
                    value={item.dosage || ''}
                    onChange={(e) => onRxItemUpdate(i, { dosage: e.target.value })}
                    className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-teal-500 focus:outline-none w-16 text-center transition-colors"
                    placeholder="30C"
                  />
                  <span>·</span>
                  <input
                    value={item.frequency || ''}
                    onChange={(e) => onRxItemUpdate(i, { frequency: e.target.value })}
                    className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-teal-500 focus:outline-none flex-1 transition-colors"
                    placeholder="Single dose"
                  />
                  <span>·</span>
                  <input
                    value={item.route || ''}
                    onChange={(e) => onRxItemUpdate(i, { route: e.target.value })}
                    className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-teal-500 focus:outline-none flex-1 transition-colors"
                    placeholder="Dry on tongue"
                  />
                </div>
                <input
                  value={item.instructions || ''}
                  onChange={(e) => onRxItemUpdate(i, { instructions: e.target.value })}
                  className="text-[10px] text-gray-400 leading-relaxed bg-transparent border-b border-transparent hover:border-gray-300 focus:border-teal-500 focus:outline-none w-full transition-colors"
                  placeholder="Instructions..."
                />
              </div>
            ))}
          </div>

          {/* Advice & Management (Editable) */}
          <div className="pt-2">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Advice & Management</span>
            <textarea
              value={supportiveTopical}
              onChange={(e) => onSupportiveTopicalChange(e.target.value)}
              className="text-xs text-gray-700 font-medium mt-1 w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-teal-500 focus:outline-none rounded-lg p-1.5 resize-none transition-colors"
              rows={2}
              placeholder="Add advice..."
            />
          </div>

          {/* Follow-up (Editable) */}
          <div className="pt-2">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Follow-Up</span>
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 mt-1 space-y-1.5">
              <input
                value={followUp}
                onChange={(e) => onFollowUpChange(e.target.value)}
                className="text-xs font-bold text-emerald-700 bg-transparent border-b border-transparent hover:border-emerald-300 focus:border-emerald-500 focus:outline-none w-full transition-colors"
                placeholder="Follow-up date..."
              />
              <input
                value={antidoteAvoidance}
                onChange={(e) => onAntidoteAvoidanceChange(e.target.value)}
                className="text-[11px] text-emerald-600 bg-transparent border-b border-transparent hover:border-emerald-300 focus:border-emerald-500 focus:outline-none w-full transition-colors"
                placeholder="Antidote avoidance..."
              />
            </div>
          </div>

          {/* GNM Advisory (Editable) */}
          <div className="pt-2">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Additional Advisory</span>
            <textarea
              value={gnmCounselling}
              onChange={(e) => onGnmCounsellingChange(e.target.value)}
              className="text-[11px] text-gray-600 leading-relaxed mt-1 w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-teal-500 focus:outline-none rounded-lg p-1.5 resize-none transition-colors"
              rows={2}
              placeholder="Add advisory..."
            />
          </div>

          {/* Doctor signature area */}
          <div className="pt-6 border-t border-gray-200 mt-4">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Consulting Physician</span>
            <p className="text-[11px] text-gray-500 mt-0.5">BHMS · CCH · GNM Practitioner</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───
export function PrescriptionStage({
  visitId: _visitId,
  rxItems,
  onRxItemsChange,
  advice: _advice,
  onAdviceChange: _onAdviceChange,
  followUp,
  onFollowUpChange,
  diagnoses,
  soapData,
  patient,
  gnmAnalysis,
  scoredRemedies,
  onComplete: _onComplete,
  isCompleting: _isCompleting,
  onPrescriptionStepChange,
}: PrescriptionStageProps) {
  const [prescriptionStep, setPrescriptionStep] = useState(1);
  const [selectedRemedyNames, setSelectedRemedyNames] = useState<string[]>([]);
  const [antidoteAvoidance, setAntidoteAvoidance] = useState('No coffee, camphor, strong perfumes, menthol for 4 weeks.');
  const [supportiveTopical, setSupportiveTopical] = useState('');
  const [gnmCounselling, setGnmCounselling] = useState('');

  // Build the remedy list to display:
  // Priority 1 — GNM-ranked remedies (if AI produced a GNM analysis)
  // Priority 2 — Repertorization scored remedies (always available, sorted by score)
  const gnmRemedies = gnmAnalysis?.rankedRemedies || [];
  const allRemedies = gnmRemedies.length > 0
    ? gnmRemedies
    : scoredRemedies.map((r, i) => ({
        rank: i + 1,
        name: r.remedyName,
        matchStrength: (i === 0 ? 'strongest' : i <= 2 ? 'strong' : 'moderate') as 'strongest' | 'strong' | 'moderate',
        keynotes: r.keynotes || [],
        suggestedPotency: r.commonPotencies?.[0] || '30C',
        whenToUse: r.matchExplanation?.[0] || '',
      }));
  const resolution = gnmAnalysis?.resolutionStrategy;

  // Pre-fill GNM counselling from resolution
  useEffect(() => {
    if (resolution?.directions?.length) {
      setGnmCounselling(resolution.directions.join('\n'));
    }
  }, [resolution]);

  // Sync with existing rxItems on mount
  useEffect(() => {
    if (rxItems.length > 0 && selectedRemedyNames.length === 0) {
      const names = rxItems.map(item => item.medicationName).filter(Boolean) as string[];
      setSelectedRemedyNames(names);
    }
  }, [rxItems]);

  const handleToggleRemedy = (name: string) => {
    const isSelected = selectedRemedyNames.includes(name);
    const nextNames = isSelected 
      ? selectedRemedyNames.filter(n => n !== name) 
      : [...selectedRemedyNames, name];
    
    setSelectedRemedyNames(nextNames);

    if (isSelected) {
      // Remove it
      onRxItemsChange(rxItems.filter(item => item.medicationName !== name));
    } else {
      // Add it with defaults
      onRxItemsChange([
        ...rxItems,
        {
          medicationName: name,
          genericName: '',
          dosage: '200C',
          route: 'Dry on tongue',
          instructions: '1 dose dry on tongue. Single.',
          frequency: 'Stat',
          duration: '1 day'
        }
      ]);
    }
  };

  const updateRxItem = (index: number, updates: Partial<CreatePrescriptionItemInput>) => {
    const next = [...rxItems];
    next[index] = { ...next[index], ...updates } as CreatePrescriptionItemInput;
    onRxItemsChange(next);
  };

  const handleConfirmPotency = useCallback(() => {
    setPrescriptionStep(3);
  }, []);

  // Notify parent about step changes so bottom bar can update
  useEffect(() => {
    onPrescriptionStepChange?.(prescriptionStep, handleConfirmPotency);
  }, [prescriptionStep, handleConfirmPotency, onPrescriptionStepChange]);

  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500">
      {/* ═══ LEFT: PRESCRIPTION FORM ═══ */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Stepper */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
          <StepIndicator step={1} currentStep={prescriptionStep} label="Remedy" />
          <ChevronRight className="h-3 w-3 text-gray-300" />
          <StepIndicator step={2} currentStep={prescriptionStep} label="Potency" />
          <ChevronRight className="h-3 w-3 text-gray-300" />
          <StepIndicator step={3} currentStep={prescriptionStep} label="Send" />
        </div>

        {/* Step 1: Select Remedy */}
        {prescriptionStep === 1 && (
          <div className="space-y-4">
            {/* Voice command hint */}
            {allRemedies.length > 0 && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 flex items-start gap-3">
                <MessageSquare className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Voice Command</p>
                  <p className="text-xs text-gray-600 italic mt-0.5">
                    "Prescribe {allRemedies[0]?.name} 200C single dose, review four weeks, {allRemedies[2]?.name || ''} topical"
                  </p>
                </div>
              </div>
            )}

            <div>
              <span className="section-label text-gray-500 block mb-3">Select Remedy</span>
              <div className="space-y-2">
                {allRemedies.map((remedy, i) => {
                  const badges = {
                    strongest: { label: '1st', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                    strong: { label: 'Intercurrent', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
                    moderate: { label: 'Topical', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
                  };
                  const badge = badges[remedy.matchStrength as keyof typeof badges] || badges['moderate'];
                  const isSelected = selectedRemedyNames.includes(remedy.name);
                  const score = scoredRemedies.find(r => r.remedyName === remedy.name)?.totalScore;

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleToggleRemedy(remedy.name)}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all hover:shadow-md ${
                        isSelected
                          ? 'border-emerald-300 bg-emerald-50/30'
                          : 'border-gray-200 bg-white hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded flex items-center justify-center border-2 ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                          {isSelected && <Check className="h-2.5 w-2.5 text-white stroke-[4]" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-gray-900">{remedy.name}</span>
                            {score && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-bold">
                                Score {score}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {remedy.keynotes.slice(0, 2).join(' · ')}
                          </p>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Next Button for Step 1 */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    // Sync rxItems immediately when moving to step 2 
                    // so the preview reflects the current selection
                    const currentSelection = selectedRemedyNames.map(name => ({
                      medicationName: name,
                      genericName: '',
                      dosage: '200C',
                      route: 'Dry on tongue',
                      instructions: '1 dose dry on tongue. Single.',
                      frequency: 'Stat',
                      duration: '1 day'
                    }));
                    onRxItemsChange(currentSelection);
                    setPrescriptionStep(2);
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  {selectedRemedyNames.length > 0 ? `Use ${selectedRemedyNames.length} Remedies` : 'Continue Without Remedy'}
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Individual Remedy Configuration */}
        {prescriptionStep === 2 && (
          <div className="space-y-6">
            <div className="space-y-4">
              <span className="section-label text-gray-500 block mb-2">Adjust Remedy Settings</span>
              {rxItems.length > 0 ? rxItems.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:border-teal-200 transition-colors">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-black text-gray-900 uppercase tracking-tight">{item.medicationName}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Configuration {idx + 1}</span>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Individual Potency */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Potency</label>
                      <div className="flex flex-wrap gap-1.5">
                        {POTENCIES.map((pot) => (
                          <button
                            key={pot}
                            type="button"
                            onClick={() => updateRxItem(idx, { dosage: pot })}
                            className={`px-3 py-1.5 rounded-lg border text-[10px] font-black transition-all ${
                              item.dosage === pot
                                ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                : 'border-gray-200 text-gray-500 hover:border-teal-300 bg-white'
                            }`}
                          >
                            {pot}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Individual Dose */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Dose Instructions</label>
                        <Input
                          value={item.instructions || ''}
                          onChange={(e) => updateRxItem(idx, { instructions: e.target.value })}
                          className="text-xs h-9"
                          placeholder="e.g. 1 dose now"
                        />
                      </div>
                      {/* Individual Route */}
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Route</label>
                        <select
                          value={item.route}
                          onChange={(e) => updateRxItem(idx, { route: e.target.value })}
                          className="w-full h-9 rounded-lg border border-gray-200 bg-white text-xs px-2.5 focus:border-teal-500 focus:ring-0"
                        >
                          {ROUTES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-8 text-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <p className="text-xs text-gray-400 italic">No remedies selected. Move direct to advice.</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-4">
              <span className="section-label text-gray-500 block mb-2">Global Settings</span>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1.5">Antidote avoidance</label>
                  <Input
                    value={antidoteAvoidance}
                    onChange={(e) => setAntidoteAvoidance(e.target.value)}
                    className="text-xs h-9 bg-white border-gray-200 px-3"
                    placeholder="No coffee, camphor..."
                  />
                </div>
                <div>
                   <label className="text-[10px] font-bold text-gray-400 block mb-1.5">Follow-up</label>
                   <Input
                     value={followUp}
                     onChange={(e) => onFollowUpChange(e.target.value)}
                     className="text-xs h-9 bg-white border-gray-200 px-3"
                     placeholder="30 April 2026..."
                   />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1.5">Supportive / topical</label>
                <Input
                  value={supportiveTopical}
                  onChange={(e) => setSupportiveTopical(e.target.value)}
                  className="text-xs h-9 bg-white border-gray-200 px-3"
                  placeholder="Jaborandi Q..."
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-1.5">GNM counselling</label>
                <Input
                  value={gnmCounselling}
                  onChange={(e) => setGnmCounselling(e.target.value)}
                  className="text-xs h-9 bg-white border-gray-200 px-3"
                  placeholder="Plan village visit..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {prescriptionStep === 3 && (
          <div className="space-y-6 text-center py-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Prescription Ready</h3>
            <p className="text-sm text-gray-500">Review the preview. Use the bottom bar to share, print, or complete.</p>
          </div>
        )}
      </div>

      {/* ═══ RIGHT: PRESCRIPTION PREVIEW (Resizable) ═══ */}
      <ResizablePreview
        patient={patient}
        formattedDate={formattedDate}
        diagnoses={diagnoses}
        rxItems={rxItems}
        supportiveTopical={supportiveTopical}
        followUp={followUp}
        antidoteAvoidance={antidoteAvoidance}
        gnmCounselling={gnmCounselling}
        soapData={soapData}
        onRxItemUpdate={updateRxItem}
        onSupportiveTopicalChange={setSupportiveTopical}
        onFollowUpChange={onFollowUpChange}
        onAntidoteAvoidanceChange={setAntidoteAvoidance}
        onGnmCounsellingChange={setGnmCounselling}
      />
    </div>
  );
}
