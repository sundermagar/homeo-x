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

export interface PrescriptionFormData {
  notes: string;
  items: CreatePrescriptionItemInput[];
}

const FREQUENCY_OPTIONS = ['OD', 'BD', 'TDS', 'QID', 'SOS', 'HS'];
const DURATION_OPTIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '30 days'];
const ROUTE_OPTIONS = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhaled'];
const DOSAGE_OPTIONS = ['250mg', '500mg', '650mg', '1g'];

interface PrescriptionSectionProps {
  control: Control<PrescriptionFormData>;
  register: UseFormRegister<PrescriptionFormData>;
  watch: UseFormWatch<PrescriptionFormData>;
  setValue: UseFormSetValue<PrescriptionFormData>;
  aiContext?: SuggestPrescriptionInput;
}

export function PrescriptionSection({ control, register, watch, setValue, aiContext }: PrescriptionSectionProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const [rxSuggestion, setRxSuggestion] = useState<PrescriptionSuggestion | null>(null);
  const [ddiWarnings, setDdiWarnings] = useState<DrugInteractionWarning[]>([]);

  const suggestRx = useAiSuggestPrescription();
  const checkDdi = useCheckInteractions();
  const feedback = useAiFeedback();

  const watchedItems = watch('items');

  const handleAiSuggest = () => {
    if (!aiContext?.diagnoses?.length) return;
    suggestRx.mutate(aiContext, { onSuccess: (r) => setRxSuggestion(r) });
  };

  const handleApply = () => {
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

  const handleDismiss = () => {
    if (rxSuggestion) feedback.mutate({ auditLogId: rxSuggestion.auditLogId, action: 'rejected' });
    setRxSuggestion(null);
  };

  const handleCheckDdi = () => {
    const drugNames = watchedItems.map((it) => it.medicationName).filter(Boolean);
    if (drugNames.length < 2) return;
    checkDdi.mutate(drugNames, { onSuccess: (r) => setDdiWarnings(r) });
  };

  return (
    <CollapsibleSection
      id="section-rx"
      title="Prescription"
      subtitle={fields.length > 0 ? `${fields.length} medication${fields.length > 1 ? 's' : ''}` : undefined}
      icon={<Pill className="h-5 w-5" />}
      defaultOpen={true}
      badge={
        <div className="flex items-center gap-1">
          {aiContext?.diagnoses?.length ? (
            <AiSuggestButton onClick={handleAiSuggest} isLoading={suggestRx.isPending} label="AI Rx" />
          ) : null}
        </div>
      }
    >
      {rxSuggestion && (
        <div className="mb-4">
          <AiSuggestionPanel type="prescription" suggestion={rxSuggestion} onApply={handleApply} onDismiss={handleDismiss} />
        </div>
      )}

      {ddiWarnings.length > 0 && (
        <div className="mb-4">
          <DrugInteractionAlert interactions={ddiWarnings} />
        </div>
      )}

      {/* Rx notes */}
      <div className="space-y-1 mb-4">
        <Label className="text-xs text-gray-500 dark:text-gray-400">Rx Notes</Label>
        <Textarea {...register('notes')} placeholder="General prescription notes..." rows={2} className="text-sm" />
      </div>

      {/* Medications */}
      {fields.length === 0 && (
        <p className="py-4 text-center text-sm text-gray-400">
          No medications added yet.
        </p>
      )}

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            </div>

            {/* Med name + generic */}
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Medication *</Label>
                <Input {...register(`items.${index}.medicationName`)} placeholder="e.g. Amoxicillin" className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Generic</Label>
                <Input {...register(`items.${index}.genericName`)} placeholder="Generic name" className="text-sm" />
              </div>
            </div>

            {/* Dosage chips */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Dosage *</Label>
              <ChipSelector
                options={DOSAGE_OPTIONS}
                value={watchedItems?.[index]?.dosage ?? ''}
                onChange={(v) => setValue(`items.${index}.dosage`, v)}
                allowCustom
                customPlaceholder="e.g. 500mg"
              />
            </div>

            {/* Frequency chips */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Frequency *</Label>
              <ChipSelector
                options={FREQUENCY_OPTIONS}
                value={watchedItems?.[index]?.frequency ?? ''}
                onChange={(v) => setValue(`items.${index}.frequency`, v)}
                allowCustom
              />
            </div>

            {/* Duration chips */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Duration *</Label>
              <ChipSelector
                options={DURATION_OPTIONS}
                value={watchedItems?.[index]?.duration ?? ''}
                onChange={(v) => setValue(`items.${index}.duration`, v)}
                allowCustom
              />
            </div>

            {/* Route chips */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Route</Label>
              <ChipSelector
                options={ROUTE_OPTIONS}
                value={watchedItems?.[index]?.route ?? ''}
                onChange={(v) => setValue(`items.${index}.route`, v)}
              />
            </div>

            {/* Instructions */}
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Instructions</Label>
              <Textarea {...register(`items.${index}.instructions`)} placeholder="e.g. Take after meals" rows={1} className="text-sm" />
            </div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 mt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ medicationName: '', dosage: '', frequency: '', duration: '', route: '', instructions: '', quantity: undefined })}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Medication
        </Button>
        {fields.length >= 2 && (
          <Button type="button" variant="outline" size="sm" onClick={handleCheckDdi} disabled={checkDdi.isPending}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Check Interactions
          </Button>
        )}
      </div>
    </CollapsibleSection>
  );
}
