import { useState } from 'react';
import { useFieldArray, type Control, type UseFormRegister, type UseFormWatch, type UseFormSetValue } from 'react-hook-form';
import { Pill, Plus, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { CollapsibleSection } from '../../../components/shared/collapsible-section';
import { ChipSelector } from '../../../components/shared/chip-selector';
import { AiSuggestButton } from './ai-suggest-button';
import { AiSuggestionPanel } from './ai-suggestion-panel';
import { DrugInteractionAlert } from './drug-interaction-alert';
import { useAiSuggestPrescription, useAiFeedback } from '../../../hooks/use-ai-suggest';
import { useCheckInteractions } from '../../../hooks/use-drug-interactions';
import type { CreatePrescriptionItemInput } from '../../../types/prescription';
import type { PrescriptionSuggestion, SuggestPrescriptionInput, DrugInteractionWarning } from '../../../types/ai';

export interface PrescriptionFormData { notes: string; items: CreatePrescriptionItemInput[]; }

const FREQUENCY_OPTIONS = ['OD', 'BD', 'TDS', 'QID', 'SOS', 'HS'];
const DURATION_OPTIONS  = ['3 days', '5 days', '7 days', '10 days', '14 days', '30 days'];
const ROUTE_OPTIONS     = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhaled'];
const DOSAGE_OPTIONS    = ['250mg', '500mg', '650mg', '1g'];

interface PrescriptionSectionProps {
  control: Control<PrescriptionFormData>; register: UseFormRegister<PrescriptionFormData>;
  watch: UseFormWatch<PrescriptionFormData>; setValue: UseFormSetValue<PrescriptionFormData>;
  aiContext?: SuggestPrescriptionInput;
}

const fieldCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem' };

export function PrescriptionSection({ control, register, watch, setValue, aiContext }: PrescriptionSectionProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const [rxSuggestion, setRxSuggestion] = useState<PrescriptionSuggestion | null>(null);
  const [ddiWarnings, setDdiWarnings] = useState<DrugInteractionWarning[]>([]);
  const suggestRx = useAiSuggestPrescription();
  const checkDdi = useCheckInteractions();
  const feedback = useAiFeedback();
  const watchedItems = watch('items');

  const handleApply = () => {
    if (!rxSuggestion) return;
    for (const med of rxSuggestion.medications) append({ medicationName: med.medicationName, genericName: med.genericName, dosage: med.dosage, frequency: med.frequency, duration: med.duration, route: med.route, instructions: med.instructions, quantity: undefined });
    setDdiWarnings(rxSuggestion.interactions);
    feedback.mutate({ auditLogId: rxSuggestion.auditLogId, action: 'accepted' });
    setRxSuggestion(null);
  };
  const handleDismiss = () => { if (rxSuggestion) feedback.mutate({ auditLogId: rxSuggestion.auditLogId, action: 'rejected' }); setRxSuggestion(null); };
  const handleCheckDdi = () => { const names = watchedItems.map(it => it.medicationName).filter(Boolean); if (names.length < 2) return; checkDdi.mutate(names, { onSuccess: r => setDdiWarnings(r) }); };

  return (
    <CollapsibleSection id="section-rx" title="Prescription" subtitle={fields.length > 0 ? `${fields.length} medication${fields.length > 1 ? 's' : ''}` : undefined} icon={<Pill style={{ width: 20, height: 20 }} />} defaultOpen={true}
      badge={aiContext?.diagnoses?.length ? <AiSuggestButton onClick={() => { if (aiContext?.diagnoses?.length) suggestRx.mutate(aiContext, { onSuccess: r => setRxSuggestion(r) }); }} isLoading={suggestRx.isPending} label="AI Rx" /> : undefined}>
      {rxSuggestion && <div style={{ marginBottom: '1rem' }}><AiSuggestionPanel type="prescription" suggestion={rxSuggestion} onApply={handleApply} onDismiss={handleDismiss} /></div>}
      {ddiWarnings.length > 0 && <div style={{ marginBottom: '1rem' }}><DrugInteractionAlert interactions={ddiWarnings} /></div>}

      <div style={{ ...fieldCol, marginBottom: '1rem' }}>
        <Label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Rx Notes</Label>
        <Textarea {...register('notes')} placeholder="General prescription notes..." rows={2} />
      </div>

      {fields.length === 0 && <p style={{ padding: '1rem 0', textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--text-disabled)' }}>No medications added yet.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {fields.map((field, index) => (
          <div key={field.id} style={{ borderRadius: 'var(--radius-card)', border: '1px solid var(--border-default)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--text-tertiary)' }}>#{index + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}><Trash2 style={{ width: 14, height: 14, color: 'var(--color-error-500)' }} /></Button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={fieldCol}><Label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Medication *</Label><Input {...register(`items.${index}.medicationName`)} placeholder="e.g. Amoxicillin" /></div>
              <div style={fieldCol}><Label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Generic</Label><Input {...register(`items.${index}.genericName`)} placeholder="Generic name" /></div>
            </div>
            <div style={fieldCol}><Label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Dosage *</Label><ChipSelector options={DOSAGE_OPTIONS} value={watchedItems?.[index]?.dosage ?? ''} onChange={v => setValue(`items.${index}.dosage`, v)} allowCustom customPlaceholder="e.g. 500mg" /></div>
            <div style={fieldCol}><Label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Frequency *</Label><ChipSelector options={FREQUENCY_OPTIONS} value={watchedItems?.[index]?.frequency ?? ''} onChange={v => setValue(`items.${index}.frequency`, v)} allowCustom /></div>
            <div style={fieldCol}><Label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Duration *</Label><ChipSelector options={DURATION_OPTIONS} value={watchedItems?.[index]?.duration ?? ''} onChange={v => setValue(`items.${index}.duration`, v)} allowCustom /></div>
            <div style={fieldCol}><Label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Route</Label><ChipSelector options={ROUTE_OPTIONS} value={watchedItems?.[index]?.route ?? ''} onChange={v => setValue(`items.${index}.route`, v)} /></div>
            <div style={fieldCol}><Label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Instructions</Label><Textarea {...register(`items.${index}.instructions`)} placeholder="e.g. Take after meals" rows={1} /></div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
        <Button type="button" variant="outline" size="sm" onClick={() => append({ medicationName: '', dosage: '', frequency: '', duration: '', route: '', instructions: '', quantity: undefined })}>
          <Plus style={{ width: 14, height: 14, marginRight: 4 }} /> Add Medication
        </Button>
        {fields.length >= 2 && <Button type="button" variant="outline" size="sm" onClick={handleCheckDdi} disabled={checkDdi.isPending}><RotateCcw style={{ width: 14, height: 14, marginRight: 4 }} /> Check Interactions</Button>}
      </div>
    </CollapsibleSection>
  );
}
