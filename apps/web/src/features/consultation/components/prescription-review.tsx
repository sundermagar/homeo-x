import { ArrowLeft, CheckCircle, Trash2, Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { Input } from '../../../components/ui/input';
import type { CreatePrescriptionItemInput } from '../../../types/prescription';

interface PrescriptionReviewProps {
  rxItems: CreatePrescriptionItemInput[];
  onRxItemsChange: (items: CreatePrescriptionItemInput[]) => void;
  advice: string;
  onAdviceChange: (val: string) => void;
  followUp: string;
  onFollowUpChange: (val: string) => void;
  diagnoses: string[];
  onDiagnosesChange: (val: string[]) => void;
  patient?: {
    id: string;
    name: string;
    age?: number;
    gender?: string;
    allergies?: string[];
  } | null;
  visit?: {
    id: string;
    visitDate: string;
    refNo?: string;
  } | null;
  onBack: () => void;
  onComplete: () => void;
  isCompleting: boolean;
}

export function PrescriptionReview({
  rxItems,
  onRxItemsChange,
  advice,
  onAdviceChange,
  followUp,
  onFollowUpChange,
  diagnoses,
  onDiagnosesChange,
  patient,
  visit,
  onBack,
  onComplete,
  isCompleting,
}: PrescriptionReviewProps) {
  const adviceRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (adviceRef.current) {
      // Auto-resize
      adviceRef.current.style.height = 'auto';
      adviceRef.current.style.height = `${adviceRef.current.scrollHeight}px`;
    }
  }, [advice]);

  const handleUpdateItem = (index: number, field: keyof CreatePrescriptionItemInput, value: string) => {
    const next = [...rxItems];
    next[index] = { ...next[index], [field]: value };
    onRxItemsChange(next);
  };

  const handleRemoveItem = (index: number) => {
    onRxItemsChange(rxItems.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    onRxItemsChange([
      ...rxItems,
      {
        medicationName: '',
        genericName: '',
        dosage: '',
        frequency: '',
        duration: '',
        route: '',
        instructions: '',
      },
    ]);
  };

  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="max-w-4xl mx-auto px-8 py-8 space-y-6 animate-in fade-in duration-500 bg-white dark:bg-gray-950 shadow-2xl rounded-2xl border border-gray-100 dark:border-gray-800 font-sans text-gray-900 dark:text-gray-100">

      {/* ─── Clinic Header ─── */}
      <div className="flex justify-between items-start border-b-2 pb-6 border-gray-900 dark:border-gray-200">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none">
            MMC Clinic
          </h1>
          <div className="text-[12px] text-gray-600 dark:text-gray-400 font-medium">
            <p className="text-gray-800 dark:text-gray-200 font-bold">Dr. Sarah M. Richardson — MBBS, MD (Family Medicine)</p>
            <p>Reg. No. MCI-IL-0362019 · +1 (217) 555-0198</p>
          </div>
        </div>
        <div className="text-right text-[12px] text-gray-500 dark:text-gray-400 font-bold space-y-1">
          <p className="text-gray-400">{formattedDate}</p>
          <p>Ref #RX-{visit?.id.slice(-5).toUpperCase() || '2026-00847'}</p>
        </div>
      </div>

      {/* ─── Patient Details Row ─── */}
      <section className="space-y-2">
        <h3 className="text-[10px] font-black text-blue-600/80 dark:text-blue-400 uppercase tracking-[0.2em]">Patient Details</h3>
        <div className="grid grid-cols-4 gap-0 bg-gray-50/50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 rounded-sm overflow-hidden">
          <div className="p-3 border-r border-gray-100 dark:border-gray-800">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Patient Name</label>
            <p className="text-sm font-black truncate">{patient?.name || 'John A. Patterson'}</p>
          </div>
          <div className="p-3 border-r border-gray-100 dark:border-gray-800">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Age / Sex</label>
            <p className="text-sm font-black">
              {patient?.age ? `${patient.age} yrs` : '40 yrs'} · {patient?.gender?.[0] || 'M'}
            </p>
          </div>
          <div className="p-3 border-r border-gray-100 dark:border-gray-800">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Patient ID</label>
            <p className="text-sm font-black">{patient?.id || 'PT-GF-00421'}</p>
          </div>
          <div className="p-3">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Allergy</label>
            <p className="text-sm font-black text-red-600 dark:text-red-400 truncate">
              {patient?.allergies?.length ? patient.allergies.join(', ') : 'None Reported'}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Diagnosis Section ─── */}
      <section className="space-y-2">
        <h3 className="text-[10px] font-black text-blue-600/80 dark:text-blue-400 uppercase tracking-[0.2em]">Diagnosis</h3>
        <div className="space-y-1">
          <Input
            value={diagnoses.join(', ')}
            onChange={(e) => onDiagnosesChange(e.target.value.split(',').map(s => s.trim()))}
            className="text-lg font-black text-gray-900 dark:text-white border-0 p-0 h-auto focus-visible:ring-0 bg-transparent placeholder:text-gray-300"
            placeholder="e.g. Acute Upper Respiratory Tract Infection..."
          />
          <p className="text-xs text-gray-500 font-medium italic">
            Seasonal Allergic Rhinitis (ICD-10: J06.9, J30.9)
          </p>
        </div>
      </section>

      {/* ─── Medicines Table ─── */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-blue-600/80 dark:text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
            Medicines
          </h3>
          <Button variant="ghost" size="sm" onClick={handleAddItem} className="h-6 text-[10px] uppercase font-black text-teal-600 hover:text-teal-700 bg-teal-50/50 hover:bg-teal-50 dark:bg-teal-950/20 px-3">
            <Plus className="h-3 w-3 mr-1" /> Add Medicine
          </Button>
        </div>

        <div className="w-full">
          <div className="grid grid-cols-12 gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b-2 border-gray-900 dark:border-gray-200 pb-2 px-2">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-5">Medicine</div>
            <div className="col-span-2">Dose</div>
            <div className="col-span-2">Frequency</div>
            <div className="col-span-2">Duration</div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800 border-b-2 border-gray-900 dark:border-gray-200">
            {rxItems.length === 0 ? (
              <p className="py-10 text-sm text-gray-400 italic text-center font-medium">No medications prescribed yet.</p>
            ) : (
              rxItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-4 py-4 px-2 group items-center bg-transparent hover:bg-gray-50/30 dark:hover:bg-gray-900/20 transition-colors">
                  <div className="col-span-1 text-center text-xs font-bold text-gray-400 group-hover:text-gray-600">
                    {idx + 1}.
                  </div>
                  <div className="col-span-5 relative">
                    <Input
                      value={item.medicationName}
                      onChange={(e) => handleUpdateItem(idx, 'medicationName', e.target.value)}
                      className="text-sm font-black border-0 p-0 h-auto focus-visible:ring-0 bg-transparent text-gray-900 dark:text-white"
                      placeholder="Amoxicillin 500mg Capsules"
                    />
                    {item.instructions && (
                      <p className="text-[10px] text-gray-400 italic mt-1 font-medium">{item.instructions}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <Input
                      value={item.dosage}
                      onChange={(e) => handleUpdateItem(idx, 'dosage', e.target.value)}
                      className="text-xs font-bold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent text-gray-700 dark:text-gray-300"
                      placeholder="500mg"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      value={item.frequency}
                      onChange={(e) => handleUpdateItem(idx, 'frequency', e.target.value)}
                      className="text-xs font-bold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent text-gray-700 dark:text-gray-300"
                      placeholder="3 times daily"
                    />
                  </div>
                  <div className="col-span-2 flex items-center justify-between gap-1">
                    <Input
                      value={item.duration}
                      onChange={(e) => handleUpdateItem(idx, 'duration', e.target.value)}
                      className="text-xs font-bold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent text-gray-700 dark:text-gray-300"
                      placeholder="7 days"
                    />
                    <button onClick={() => handleRemoveItem(idx)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-500 p-1">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ─── Advice & Follow-up ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-blue-600/80 dark:text-blue-400 uppercase tracking-[0.2em]">Advice</h3>
          <Textarea
            ref={adviceRef}
            scroll-none="true"
            value={advice}
            onChange={(e) => onAdviceChange(e.target.value)}
            className="text-xs font-medium leading-relaxed border-0 p-0 h-auto focus-visible:ring-0 bg-transparent min-h-[40px] text-gray-700 dark:text-gray-300 resize-none overflow-hidden"
            placeholder="• Take all medications after meals..."
          />
        </div>
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-blue-600/80 dark:text-blue-400 uppercase tracking-[0.2em]">Follow-up</h3>
          <div className="space-y-2">
            <Input
              value={followUp}
              onChange={(e) => onFollowUpChange(e.target.value)}
              className="text-sm font-black text-gray-900 dark:text-white border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
              placeholder="Within 7 days to assess response..."
            />
            <p className="text-[10px] text-gray-400 font-bold italic">
              (Approx. {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})
            </p>
          </div>
        </div>
      </div>

      {/* ─── Signature Footer ─── */}
      <div className="pt-8 flex justify-between">
        <div className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4 min-w-[240px]">
          <p className="text-sm font-black text-gray-900 dark:text-white">Dr. Sarah M. Richardson</p>
          <div className="text-[9px] text-gray-400 font-bold space-y-0.5">
            <p className="uppercase">MBBS, MD (Family Medicine)</p>
            <p>DEA: AR5839217 | NPI: 1234567890</p>
          </div>
        </div>
      </div>

      {/* ─── Action Buttons (Non-Printable) ─── */}
      <div className="pt-10 flex items-center justify-end gap-4 border-t border-gray-50 dark:border-gray-900 print:hidden">
        <Button
          variant="ghost"
          onClick={onBack}
          className="h-12 px-6 text-gray-400 hover:text-gray-600 font-black rounded-xl transition-all gap-2 uppercase text-[10px] tracking-widest"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onComplete}
          disabled={isCompleting}
          className="h-12 px-10 bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-100 text-white font-black rounded-xl shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] gap-3 uppercase text-[10px] tracking-widest"
        >
          {isCompleting ? (
            <div className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          {isCompleting ? 'Finalizing...' : 'Complete & Next Patient'}
        </Button>
      </div>
    </div>
  );
}
