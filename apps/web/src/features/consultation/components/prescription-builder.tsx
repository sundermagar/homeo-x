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
import { useAiSuggestPrescription, useAiFeedback } from '../../../hooks/use-ai-suggest';
import { useCheckInteractions } from '../../../hooks/use-drug-interactions';
import type { CreatePrescriptionItemInput } from '../../../types/prescription';
import type { PrescriptionSuggestion, SuggestPrescriptionInput, DrugInteractionWarning } from '../../../types/ai';

export interface PrescriptionFormData {
  notes: string;
  items: CreatePrescriptionItemInput[];
}

interface PrescriptionBuilderProps {
  control: Control<PrescriptionFormData>;
  register: UseFormRegister<PrescriptionFormData>;
  aiContext?: SuggestPrescriptionInput;
}

export function PrescriptionBuilder({ control, register, aiContext }: PrescriptionBuilderProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const [rxSuggestion, setRxSuggestion] = useState<PrescriptionSuggestion | null>(null);
  const [ddiWarnings, setDdiWarnings] = useState<DrugInteractionWarning[]>([]);

  const suggestRx = useAiSuggestPrescription();
  const checkDdi = useCheckInteractions();
  const feedback = useAiFeedback();

  const handleAiSuggest = () => {
    if (!aiContext?.diagnoses?.length) return;
    suggestRx.mutate(aiContext, {
      onSuccess: (result) => setRxSuggestion(result),
    });
  };

  const handleApplyRxSuggestion = () => {
    if (!rxSuggestion) return;
    for (const med of rxSuggestion.medications) {
      append({
        medicationName: med.medicationName,
        genericName: med.genericName,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        route: med.route,
        instructions: med.instructions,
        quantity: undefined,
      });
    }
    setDdiWarnings(rxSuggestion.interactions);
    feedback.mutate({ auditLogId: rxSuggestion.auditLogId, action: 'accepted' });
    setRxSuggestion(null);
  };

  const handleDismissRxSuggestion = () => {
    if (rxSuggestion) {
      feedback.mutate({ auditLogId: rxSuggestion.auditLogId, action: 'rejected' });
    }
    setRxSuggestion(null);
  };

  const handleCheckDdi = () => {
    const drugNames = fields
      .map((f) => (f as unknown as CreatePrescriptionItemInput).medicationName)
      .filter(Boolean);
    if (drugNames.length < 2) return;
    checkDdi.mutate(drugNames, {
      onSuccess: (result) => setDdiWarnings(result),
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Prescription</CardTitle>
          <div className="flex gap-2">
            {aiContext?.diagnoses?.length ? (
              <AiSuggestButton
                onClick={handleAiSuggest}
                isLoading={suggestRx.isPending}
                label="AI Suggest Rx"
              />
            ) : null}
            {fields.length >= 2 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCheckDdi}
                disabled={checkDdi.isPending}
              >
                Check Interactions
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  medicationName: '',
                  dosage: '',
                  frequency: '',
                  duration: '',
                  route: '',
                  instructions: '',
                  quantity: undefined,
                })
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add Medication
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {rxSuggestion && (
            <AiSuggestionPanel
              type="prescription"
              suggestion={rxSuggestion}
              onApply={handleApplyRxSuggestion}
              onDismiss={handleDismissRxSuggestion}
            />
          )}

          {ddiWarnings.length > 0 && (
            <DrugInteractionAlert interactions={ddiWarnings} />
          )}

          <div className="space-y-1">
            <Label htmlFor="rxNotes">Prescription Notes</Label>
            <Textarea id="rxNotes" {...register('notes')} placeholder="General prescription notes..." />
          </div>

          {fields.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">
              No medications added. Click &quot;Add Medication&quot; or use AI Suggest.
            </p>
          )}

          {fields.map((field, index) => (
            <div key={field.id}>
              {index > 0 && <Separator className="my-4" />}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Medication #{index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Medication Name *</Label>
                    <Input {...register(`items.${index}.medicationName`)} placeholder="e.g. Amoxicillin" />
                  </div>
                  <div className="space-y-1">
                    <Label>Generic Name</Label>
                    <Input {...register(`items.${index}.genericName`)} placeholder="e.g. Amoxicillin Trihydrate" />
                  </div>
                  <div className="space-y-1">
                    <Label>Dosage *</Label>
                    <Input {...register(`items.${index}.dosage`)} placeholder="e.g. 500mg" />
                  </div>
                  <div className="space-y-1">
                    <Label>Frequency *</Label>
                    <Input {...register(`items.${index}.frequency`)} placeholder="e.g. TID (3x daily)" />
                  </div>
                  <div className="space-y-1">
                    <Label>Duration *</Label>
                    <Input {...register(`items.${index}.duration`)} placeholder="e.g. 7 days" />
                  </div>
                  <div className="space-y-1">
                    <Label>Route</Label>
                    <Input {...register(`items.${index}.route`)} placeholder="e.g. Oral" />
                  </div>
                  <div className="space-y-1">
                    <Label>Quantity</Label>
                    <Input type="number" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Instructions</Label>
                  <Textarea
                    {...register(`items.${index}.instructions`)}
                    placeholder="e.g. Take after meals"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
