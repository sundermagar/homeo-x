import { useState, useEffect } from 'react';
import { X, Check, Loader2, ArrowRight, History } from 'lucide-react';
import { cn } from '../../../../lib/cn';
import { PrintPrescriptionButton } from '../../../../components/print/print-prescription-button';
import type { CreatePrescriptionItemInput } from '../../../../types/prescription';

type Step = 'review' | 'send' | 'done';

interface PrescribeWizardModalProps {
  open: boolean;
  visitId: string;
  rxItems: CreatePrescriptionItemInput[];
  advice: string;
  followUp: string;
  soapAssessment?: string;
  isCompleting: boolean;
  completed: boolean;
  visit: any;
  patient: any;
  onClose: () => void;
  onConfirm: () => void;
  onNextPatient: () => void;
  onViewHistory: () => void;
}

const STEPS: { key: Step; label: string }[] = [
  { key: 'review', label: 'Review' },
  { key: 'send', label: 'Send' },
  { key: 'done', label: 'Done' },
];

export function PrescribeWizardModal({
  open,
  visitId,
  rxItems,
  advice,
  followUp,
  soapAssessment,
  isCompleting,
  completed,
  visit,
  patient,
  onClose,
  onConfirm,
  onNextPatient,
  onViewHistory,
}: PrescribeWizardModalProps) {
  const [step, setStep] = useState<Step>('review');
  const [channels, setChannels] = useState<Record<string, boolean>>({ WhatsApp: true, Email: false, Print: false });

  useEffect(() => {
    if (open) setStep('review');
  }, [open]);

  // Advance to the Done step once the parent reports the visit was completed.
  useEffect(() => {
    if (completed && open) setStep('done');
  }, [completed, open]);

  if (!open) return null;

  const primary = rxItems[0];
  const rxLabel = primary
    ? `${primary.medicationName}${primary.dosage ? ' ' + primary.dosage : ''}`
    : 'No remedy selected';
  const followLabel = followUp ? ` · Follow-up ${followUp}` : '';
  const detail = primary
    ? `${[primary.frequency, primary.duration].filter(Boolean).join(' · ')}${followLabel}`
    : '—';

  const stepIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-gray-900/50 p-5 backdrop-blur-[2px]" onClick={step === 'done' ? undefined : onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[440px] max-h-[90vh] overflow-auto p-6 relative" onClick={(e) => e.stopPropagation()}>
        {step !== 'done' && (
          <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full border border-[#E3E2DF] text-[#888786] flex items-center justify-center hover:bg-[#F4F3F1]">
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Step bar */}
        <div className="flex items-start mb-5">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-start flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  'w-[26px] h-[26px] rounded-full border-2 flex items-center justify-center text-[11px] font-bold',
                  i < stepIdx ? 'bg-[#2563EB] border-[#2563EB] text-white'
                    : i === stepIdx ? 'border-[#2563EB] text-[#2563EB] bg-[#EFF6FF]'
                    : 'border-[#E3E2DF] text-[#888786] bg-white',
                )}>
                  {i < stepIdx ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <div className="text-[10px] font-medium text-[#888786]">{s.label}</div>
              </div>
              {i < STEPS.length - 1 && <div className={cn('flex-1 h-0.5 mt-3 mx-1', i < stepIdx ? 'bg-[#2563EB]' : 'bg-[#E3E2DF]')} />}
            </div>
          ))}
        </div>

        {step === 'review' && (
          <>
            <h2 className="text-lg font-bold tracking-tight text-[#0F0F0E]">Review prescription</h2>
            <p className="text-[13px] text-[#4A4A47] mt-1 mb-4">Verify the details before prescribing. You can still go back and edit.</p>
            <div className="bg-[#FAFAF8] border border-[#E3E2DF] rounded-md p-3.5 mb-4">
              <div className="text-[15px] font-semibold text-[#0F0F0E]">{rxLabel}</div>
              <div className="text-[12.5px] text-[#4A4A47] mt-1.5 leading-relaxed">{detail}</div>
              {advice && <div className="text-[12px] text-[#888786] mt-2 leading-relaxed whitespace-pre-line">{advice}</div>}
            </div>
            <button onClick={() => setStep('send')} disabled={!primary} className="pp-btn-primary w-full h-10 mb-2.5 inline-flex items-center justify-center gap-2 disabled:opacity-60">
              Looks good — continue
            </button>
            <button onClick={onClose} className="pp-btn-secondary w-full h-10 inline-flex items-center justify-center">Go back and edit</button>
          </>
        )}

        {step === 'send' && (
          <>
            <h2 className="text-lg font-bold tracking-tight text-[#0F0F0E]">Send to patient</h2>
            <p className="text-[13px] text-[#4A4A47] mt-1 mb-4">Optional — pick how to deliver it. The Rx is saved to history regardless.</p>
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {(['WhatsApp', 'Email', 'Print'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setChannels((p) => ({ ...p, [c]: !p[c] }))}
                  className={cn(
                    'border rounded-md py-3.5 text-[12px] font-semibold transition-colors',
                    channels[c] ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]' : 'border-[#E3E2DF] bg-white text-[#4A4A47] hover:bg-[#FAFAF8]',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
            {channels['Print'] && (
              <div className="mb-3">
                <PrintPrescriptionButton
                  visitId={visitId}
                  variant="outline"
                  className="w-full"
                  label="Open print preview"
                  inlineData={{
                    soapData: { assessment: soapAssessment },
                    rxItems: rxItems.map((r) => ({
                      medicationName: r.medicationName,
                      genericName: r.genericName,
                      dosage: r.dosage,
                      frequency: r.frequency,
                      duration: r.duration,
                      route: r.route,
                      instructions: r.instructions,
                    })),
                    advice,
                    followUp,
                    visit: { id: visit?.id || visitId, visitNumber: visit?.visitNumber, specialty: visit?.specialty, chiefComplaint: visit?.chiefComplaint },
                    patient: patient ? { firstName: patient.firstName, lastName: patient.lastName || patient.surname, dateOfBirth: patient.dateOfBirth, gender: patient.gender, phone: patient.phone } : null,
                  }}
                />
              </div>
            )}
            <button onClick={onConfirm} disabled={isCompleting} className="pp-btn-primary w-full h-10 mb-2.5 inline-flex items-center justify-center gap-2 disabled:opacity-60">
              {isCompleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Prescribing…</> : 'Confirm and prescribe'}
            </button>
            <button onClick={() => setStep('review')} disabled={isCompleting} className="pp-btn-secondary w-full h-10 inline-flex items-center justify-center disabled:opacity-60">Back</button>
          </>
        )}

        {step === 'done' && (
          <>
            <div className="mx-auto w-14 h-14 rounded-full bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center mb-4">
              <Check className="h-7 w-7 text-[#16A34A]" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-[#0F0F0E] text-center">Prescribed and saved</h2>
            <p className="text-[13px] text-[#4A4A47] mt-1.5 mb-5 text-center leading-relaxed">
              The prescription, case summary and remedy plan are saved to the patient's history. They appear automatically at the next consultation.
            </p>
            <button onClick={onNextPatient} className="pp-btn-primary w-full h-10 mb-2.5 inline-flex items-center justify-center gap-2">
              Next patient <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
