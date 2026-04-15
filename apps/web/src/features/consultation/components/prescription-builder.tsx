import { useState } from 'react';
import { useFieldArray, type Control, type UseFormRegister } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Separator } from '../../../components/ui/separator';
import { AiSuggestButton } from './ai-suggest-button';
import { AiSuggestionPanel } from './ai-suggestion-panel';
import { DrugInteractionAlert } from './drug-interaction-alert';
import { useAiSuggestPrescription, useAiFeedback } from '@/hooks/use-ai-suggest';
import { useCheckInteractions } from '@/hooks/use-drug-interactions';
import type { CreatePrescriptionItemInput } from '../../../types/prescription';
import type { PrescriptionSuggestion, SuggestPrescriptionInput, DrugInteractionWarning } from '../../../types/ai';

export interface PrescriptionFormData { notes: string; items: CreatePrescriptionItemInput[]; }

interface PrescriptionBuilderProps { control: Control<PrescriptionFormData>; register: UseFormRegister<PrescriptionFormData>; aiContext?: SuggestPrescriptionInput; }

const field2col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.25rem' };

export function PrescriptionBuilder({ control, register, aiContext }: PrescriptionBuilderProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const [rxSuggestion, setRxSuggestion] = useState<PrescriptionSuggestion | null>(null);
  const [ddiWarnings, setDdiWarnings] = useState<DrugInteractionWarning[]>([]);
  const suggestRx = useAiSuggestPrescription();
  const checkDdi = useCheckInteractions();
  const feedback = useAiFeedback();

  const handleApplyRxSuggestion = () => {
    if (!rxSuggestion) return;
    for (const med of rxSuggestion.medications) append({ medicationName: med.medicationName, genericName: med.genericName, dosage: med.dosage, frequency: med.frequency, duration: med.duration, route: med.route, instructions: med.instructions, quantity: undefined });
    setDdiWarnings(rxSuggestion.interactions);
    feedback.mutate({ auditLogId: rxSuggestion.auditLogId, action: 'accepted' });
    setRxSuggestion(null);
  };
  const handleDismissRxSuggestion = () => { if (rxSuggestion) feedback.mutate({ auditLogId: rxSuggestion.auditLogId, action: 'rejected' }); setRxSuggestion(null); };
  const handleCheckDdi = () => { const names = fields.map(f => (f as unknown as CreatePrescriptionItemInput).medicationName).filter(Boolean); if (names.length < 2) return; checkDdi.mutate(names, { onSuccess: (r: DrugInteractionWarning[]) => setDdiWarnings(r) }); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Card>
        <CardHeader style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <CardTitle>Prescription</CardTitle>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {aiContext?.diagnoses?.length && <AiSuggestButton onClick={() => { if (aiContext?.diagnoses?.length) suggestRx.mutate(aiContext, { onSuccess: r => setRxSuggestion(r) }); }} isLoading={suggestRx.isPending} label="AI Suggest Rx" />}
            {fields.length >= 2 && <Button type="button" variant="outline" size="sm" onClick={handleCheckDdi} disabled={checkDdi.isPending}>Check Interactions</Button>}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ medicationName: '', dosage: '', frequency: '', duration: '', route: '', instructions: '', quantity: undefined })}>
              <Plus style={{ width: 14, height: 14 }} /> Add Medication
            </Button>
          </div>
        </CardHeader>
        <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {rxSuggestion && <AiSuggestionPanel type="prescription" suggestion={rxSuggestion} onApply={handleApplyRxSuggestion} onDismiss={handleDismissRxSuggestion} />}
          {ddiWarnings.length > 0 && <DrugInteractionAlert interactions={ddiWarnings} />}
          <div style={field2col}><Label htmlFor="rxNotes">Prescription Notes</Label><Textarea id="rxNotes" {...register('notes')} placeholder="General prescription notes..." /></div>
          {fields.length === 0 && <p style={{ padding: '1rem 0', textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--text-disabled)' }}>No medications added. Click "Add Medication" or use AI Suggest.</p>}
          {fields.map((field, index) => (
            <div key={field.id}>
              {index > 0 && <Separator style={{ margin: '0 0 1rem' }} />}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>Medication #{index + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}><Trash2 style={{ width: 14, height: 14, color: 'var(--color-error-500)' }} /></Button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={field2col}><Label>Medication Name *</Label><Input {...register(`items.${index}.medicationName`)} placeholder="e.g. Amoxicillin" /></div>
                  <div style={field2col}><Label>Generic Name</Label><Input {...register(`items.${index}.genericName`)} placeholder="e.g. Amoxicillin Trihydrate" /></div>
                  <div style={field2col}><Label>Dosage *</Label><Input {...register(`items.${index}.dosage`)} placeholder="e.g. 500mg" /></div>
                  <div style={field2col}><Label>Frequency *</Label><Input {...register(`items.${index}.frequency`)} placeholder="e.g. TID (3x daily)" /></div>
                  <div style={field2col}><Label>Duration *</Label><Input {...register(`items.${index}.duration`)} placeholder="e.g. 7 days" /></div>
                  <div style={field2col}><Label>Route</Label><Input {...register(`items.${index}.route`)} placeholder="e.g. Oral" /></div>
                  <div style={field2col}><Label>Quantity</Label><Input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} /></div>
                </div>
                <div style={field2col}><Label>Instructions</Label><Textarea {...register(`items.${index}.instructions`)} placeholder="e.g. Take after meals" rows={2} /></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
