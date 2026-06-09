import { useState, useEffect, useMemo } from 'react';
import { X, Check, Loader2, ArrowRight, Zap, Plus, Trash2 } from 'lucide-react';
import { cn } from '../../../../lib/cn';
import { PrintPrescriptionButton } from '../../../../components/print/print-prescription-button';
import { useDayCharges, useCharges } from '../../../billing/hooks/use-accounts';
import { useActivePackage } from '../../../packages/hooks/use-packages';
import type { DayCharge } from '@mmc/types';
import type { CreatePrescriptionItemInput } from '../../../../types/prescription';

type Step = 'review' | 'send' | 'done';

export interface AdditionalChargeItem {
  name: string;
  price: number;
  quantity: number;
}

export interface BillingData {
  consultationFee: number;
  medicineCharge: number;
  additionalCharges: AdditionalChargeItem[];
}

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
  defaultConsultationFee?: number;
  onClose: () => void;
  onConfirm: (billingData: BillingData) => void;
  onNextPatient: () => void;
  onViewHistory: () => void;
}

const STEPS: { key: Step; label: string }[] = [
  { key: 'review', label: 'Review' },
  { key: 'send', label: 'Send' },
  { key: 'done', label: 'Done' },
];



const EMPTY_CHARGE: AdditionalChargeItem = { name: '', price: 0, quantity: 1 };

/**
 * Parse the number of days from an rx duration string.
 * Handles: "15", "15 days", "2 weeks", "1 month", "5 Days", etc.
 */
function parseDurationDays(duration: string | undefined): number {
  if (!duration) return 0;
  const s = String(duration).trim().toLowerCase();
  const num = parseFloat(s);
  if (isNaN(num)) return 0;
  if (s.includes('month')) return Math.round(num * 30);
  if (s.includes('week')) return Math.round(num * 7);
  return Math.round(num);
}

function parseDayChargeDays(label: string | null): number {
  return parseDurationDays(label ?? undefined);
}

function findMatchingCharge(dayCharges: DayCharge[], days: number): DayCharge | null {
  if (!dayCharges.length || days <= 0) return null;
  const withDays = dayCharges
    .map((dc) => ({ dc, days: parseDayChargeDays(dc.days) }))
    .filter((x) => x.days > 0);
  const exact = withDays.find((x) => x.days === days);
  if (exact) return exact.dc;
  const sorted = withDays.sort((a, b) => Math.abs(a.days - days) - Math.abs(b.days - days));
  return sorted[0]?.dc ?? null;
}

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
  defaultConsultationFee,
  onClose,
  onConfirm,
  onNextPatient,
}: PrescribeWizardModalProps) {
  const [step, setStep] = useState<Step>('review');
  const [channels, setChannels] = useState<Record<string, boolean>>({ WhatsApp: true, Email: false, Print: false });

  // Billing state
  const [consultationFee, setConsultationFee] = useState<number>(0);
  const [medicineCharge, setMedicineCharge] = useState<number>(0);
  const [medicineChargeAutoSet, setMedicineChargeAutoSet] = useState(false);

  // Additional charges state — list of { name, price, quantity }
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalChargeItem[]>([]);
  // Track the new-charge being composed
  const [newCharge, setNewCharge] = useState<AdditionalChargeItem>({ ...EMPTY_CHARGE });

  // Load clinic's day-charge plans and predefined charges catalog
  const { data: dayCharges = [] } = useDayCharges();
  const { data: chargesCatalog = [] } = useCharges();

  // Check if patient has an active package subscription
  const regid = (patient as any)?.regid || visit?.patientId;
  const { data: activePackage } = useActivePackage(regid ? Number(regid) : 0);

  const hasActivePackage = !!activePackage;

  // Derive total prescription days from the first rx item
  const prescriptionDays = useMemo(() => parseDurationDays(rxItems[0]?.duration), [rxItems]);

  // Find the matching day charge plan
  const matchedDayCharge = useMemo(
    () => findMatchingCharge(dayCharges, prescriptionDays),
    [dayCharges, prescriptionDays]
  );

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep('review');
      const fee = defaultConsultationFee ?? (visit?.consultationFee ? Number(visit.consultationFee) : 0);
      setConsultationFee(fee);
      setMedicineChargeAutoSet(false);
      setAdditionalCharges([]);
      setNewCharge({ ...EMPTY_CHARGE });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-fill medicine charge from day charges or active package
  useEffect(() => {
    if (!open) return;
    if (hasActivePackage) {
      setMedicineCharge(0);
      setMedicineChargeAutoSet(true);
    } else if (matchedDayCharge && matchedDayCharge.regularCharges != null) {
      setMedicineCharge(matchedDayCharge.regularCharges);
      setMedicineChargeAutoSet(true);
    } else {
      setMedicineCharge((prev) => (medicineChargeAutoSet ? 0 : prev));
      setMedicineChargeAutoSet(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedDayCharge, open, hasActivePackage]);

  // Advance to Done step once the parent signals completion
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

  const additionalTotal = additionalCharges.reduce((sum, ac) => sum + ac.price * ac.quantity, 0);
  const totalCharges = consultationFee + medicineCharge + additionalTotal;
  const stepIdx = STEPS.findIndex((s) => s.key === step);

  // Add a new additional charge to the list
  const handleAddCharge = () => {
    if (!newCharge.name || newCharge.price <= 0) return;
    setAdditionalCharges((prev) => [...prev, { ...newCharge }]);
    setNewCharge({ ...EMPTY_CHARGE });
  };

  const handleRemoveCharge = (idx: number) => {
    setAdditionalCharges((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmClick = () => {
    // If there's a partially filled new charge, include it automatically
    const finalCharges = [...additionalCharges];
    if (newCharge.name && newCharge.price > 0) {
      finalCharges.push({ ...newCharge });
    }
    onConfirm({ consultationFee, medicineCharge, additionalCharges: finalCharges });
  };

  return (
    <div className="fixed inset-0 z-[400] overflow-y-auto bg-gray-900/50 backdrop-blur-[2px]" onClick={step === 'done' ? undefined : onClose}>
      <div className="flex min-h-full items-center justify-center p-5 text-center">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-[480px] p-6 relative text-left my-8" onClick={(e) => e.stopPropagation()}>
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

            {/* Remedy summary */}
            <div className="bg-[#FAFAF8] border border-[#E3E2DF] rounded-md p-3.5 mb-4">
              <div className="text-[15px] font-semibold text-[#0F0F0E]">{rxLabel}</div>
              <div className="text-[12.5px] text-[#4A4A47] mt-1.5 leading-relaxed">{detail}</div>
              {advice && <div className="text-[12px] text-[#888786] mt-2 leading-relaxed whitespace-pre-line">{advice}</div>}
            </div>

            {/* ── Billing charges ── */}
            <div className="border border-[#E3E2DF] rounded-md p-3.5 mb-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#888786] mb-3">Billing charges</div>

              <div className="flex flex-col gap-2.5">
                {/* Consultation fee */}
                <div className="flex items-center gap-2">
                  <label className="text-[12.5px] text-[#4A4A47] w-[130px] shrink-0">Consultation fee (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={consultationFee || ''}
                    onChange={(e) => setConsultationFee(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                    className="flex-1 border border-[#E3E2DF] rounded-md px-2.5 py-1.5 text-[13px] font-mono text-[#0F0F0E] outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#BFDBFE]"
                  />
                </div>

                {/* Medicine charge — auto-filled from day charges */}
                <div className="flex items-start gap-2">
                  <label className="text-[12.5px] text-[#4A4A47] w-[130px] shrink-0 pt-1.5">Medicine charge (₹)</label>
                  <div className="flex-1 flex flex-col gap-1">
                    <input
                      type="number"
                      min={0}
                      value={medicineCharge || ''}
                      onChange={(e) => {
                        setMedicineCharge(Math.max(0, Number(e.target.value) || 0));
                        setMedicineChargeAutoSet(false);
                      }}
                      placeholder="0"
                      disabled={hasActivePackage}
                      title={hasActivePackage ? 'Medicine charge is waived for patients with an active package' : ''}
                      className="w-full border border-[#E3E2DF] rounded-md px-2.5 py-1.5 text-[13px] font-mono text-[#0F0F0E] outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#BFDBFE] disabled:bg-[#FAFAF8] disabled:text-[#888786]"
                    />
                    {hasActivePackage && (
                      <div className="flex items-center gap-1 text-[11px] text-[#16A34A] font-medium">
                        <Zap className="h-3 w-3" />
                        Waived: Active plan ({activePackage?.packageName || 'Package'})
                      </div>
                    )}
                    {!hasActivePackage && medicineChargeAutoSet && matchedDayCharge && (
                      <div className="flex items-center gap-1 text-[11px] text-[#2563EB]">
                        <Zap className="h-3 w-3" />
                        Auto-filled from day charge plan: {matchedDayCharge.days}
                      </div>
                    )}
                    {!hasActivePackage && prescriptionDays > 0 && !matchedDayCharge && (
                      <div className="text-[11px] text-[#888786]">
                        No day charge plan for {prescriptionDays} day{prescriptionDays !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>


              </div>

              {/* Total */}
              {totalCharges > 0 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E3E2DF]">
                  <span className="text-[12px] font-semibold text-[#4A4A47]">Total charges</span>
                  <span className="text-[14px] font-bold text-[#0F0F0E] font-mono">₹{totalCharges.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* ── Additional Charges ── */}
            <div className="border border-[#E3E2DF] rounded-md p-3.5 mb-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#888786] mb-3">Additional charges</div>

              {/* Added charges list */}
              {additionalCharges.length > 0 && (
                <div className="flex flex-col gap-2 mb-3">
                  {additionalCharges.map((ac, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-[#FAFAF8] border border-[#E3E2DF] rounded-md px-3 py-2">
                      <div>
                        <div className="text-[13px] font-medium text-[#0F0F0E]">{ac.name}</div>
                        {ac.quantity > 1 && (
                          <div className="text-[11px] text-[#888786]">₹{ac.price} × {ac.quantity}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold font-mono text-[#0F0F0E]">₹{(ac.price * ac.quantity).toLocaleString()}</span>
                        <button
                          onClick={() => handleRemoveCharge(idx)}
                          className="w-6 h-6 rounded flex items-center justify-center text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* New charge form */}
              <div className="flex flex-col gap-2">
                {/* Catalog picker */}
                {chargesCatalog.length > 0 && (
                  <select
                    className="w-full border border-[#E3E2DF] rounded-md px-2.5 py-1.5 text-[13px] text-[#0F0F0E] outline-none focus:border-[#2563EB] bg-white"
                    value=""
                    onChange={(e) => {
                      const selected = chargesCatalog.find((c) => c.id === Number(e.target.value));
                      if (selected) {
                        setNewCharge({
                          name: selected.charges || '',
                          price: selected.amount ?? 0,
                          quantity: 1,
                        });
                      }
                    }}
                  >
                    <option value="" disabled>Pick from catalog…</option>
                    {chargesCatalog.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.charges}{c.amount ? ` — ₹${c.amount}` : ''}
                      </option>
                    ))}
                  </select>
                )}

                {/* Name + amount row */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCharge.name}
                    onChange={(e) => setNewCharge((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Charge name (e.g. Investigation)"
                    className="flex-1 border border-[#E3E2DF] rounded-md px-2.5 py-1.5 text-[13px] text-[#0F0F0E] outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#BFDBFE]"
                  />
                  <input
                    type="number"
                    min={0}
                    value={newCharge.price || ''}
                    onChange={(e) => setNewCharge((prev) => ({ ...prev, price: Math.max(0, Number(e.target.value) || 0) }))}
                    placeholder="₹"
                    className="w-20 border border-[#E3E2DF] rounded-md px-2.5 py-1.5 text-[13px] font-mono text-[#0F0F0E] outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#BFDBFE]"
                  />
                  <input
                    type="number"
                    min={1}
                    value={newCharge.quantity}
                    onChange={(e) => setNewCharge((prev) => ({ ...prev, quantity: Math.max(1, Number(e.target.value) || 1) }))}
                    placeholder="Qty"
                    title="Quantity"
                    className="w-14 border border-[#E3E2DF] rounded-md px-2.5 py-1.5 text-[13px] font-mono text-[#0F0F0E] outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#BFDBFE]"
                  />
                </div>

                {/* Add button */}
                <button
                  onClick={handleAddCharge}
                  disabled={!newCharge.name || newCharge.price <= 0}
                  className="flex items-center justify-center gap-1.5 w-full border border-dashed border-[#2563EB] text-[#2563EB] rounded-md py-1.5 text-[12.5px] font-semibold hover:bg-[#EFF6FF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add charge
                </button>
              </div>
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
            <button onClick={handleConfirmClick} disabled={isCompleting} className="pp-btn-primary w-full h-10 mb-2.5 inline-flex items-center justify-center gap-2 disabled:opacity-60">
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
    </div>
  );
}
