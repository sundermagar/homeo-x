import { useState, useCallback, useEffect } from 'react';
import {
  Pill,
  Plus,
  X,
  Sparkles,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { AiConfidenceBadge } from './ai-confidence-badge';
import { DrugInteractionAlert } from './drug-interaction-alert';
import { useAiSuggestPrescription, useAiFeedback } from '../../../hooks/use-ai-suggest';
import { useCheckInteractions } from '../../../hooks/use-drug-interactions';
import type { PrescriptionSuggestion, MedicationSuggestion, DrugInteractionWarning } from '../../../types/ai';
import type { CreatePrescriptionItemInput } from '../../../types/prescription';

export interface UiHints {
  showPotencySelector?: boolean;
  showDosageChips?: boolean;
  showFrequencyChips?: boolean;
  showRouteChips?: boolean;
  showTitrationFields?: boolean;
  showTrendGraphs?: boolean;
  showRemedySelector?: boolean;
  showRepeatPlanShortcut?: boolean;
  prescriptionLabel?: string;
}

interface PrescriptionTemplateEngineProps {
  items: CreatePrescriptionItemInput[];
  onItemsChange: (items: CreatePrescriptionItemInput[]) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  /** AI context for generating Rx suggestions */
  aiContext?: {
    diagnoses: string[];
    patientAge?: number;
    patientGender?: string;
    patientWeight?: number;
    allergies?: string[];
    specialty?: string;
    transcript?: string;
  };
  /** Callback to track template usage */
  onTemplateUsed?: () => void;
  /** Category-specific UI hints from the backend */
  uiHints?: UiHints;
}

// Default allopathy chips (PROTOCOL category)
const FREQUENCY_CHIPS_DEFAULT = ['OD', 'BD', 'TDS', 'QID', 'SOS', 'HS'];
const DURATION_CHIPS_DEFAULT = ['3 days', '5 days', '7 days', '10 days', '14 days', '30 days'];
const DOSAGE_CHIPS_DEFAULT = ['250mg', '500mg', '650mg', '1g'];
const ROUTE_CHIPS_DEFAULT = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhaled'];

// Homeopathy chips (TOTALITY category)
const POTENCY_CHIPS = ['6C', '12C', '30C', '200C', '1M', '10M', '50M', 'CM'];
const FORM_CHIPS = ['Globules', 'Pills', 'Liquid', 'Trituration', 'Mother Tincture'];
const DOSAGE_CHIPS_REMEDY = ['Single dose', '2 globules', '4 globules', '5 drops', '10 drops'];
const FREQUENCY_CHIPS_REMEDY = ['Single dose', 'OD', 'BD', 'SOS', 'Weekly'];
const DURATION_CHIPS_REMEDY = ['Single dose', '3 days', '7 days', '14 days', '30 days', 'Until next visit'];

// Default uiHints for backward compatibility (PROTOCOL)
const DEFAULT_UI_HINTS: UiHints = {
  showPotencySelector: false,
  showDosageChips: true,
  showFrequencyChips: true,
  showRouteChips: true,
  showTitrationFields: false,
  showTrendGraphs: false,
  showRemedySelector: false,
  showRepeatPlanShortcut: false,
  prescriptionLabel: 'Prescription',
};

type EntryMode = 'idle' | 'ai-template' | 'custom';

export function PrescriptionTemplateEngine({
  items,
  onItemsChange,
  notes,
  onNotesChange,
  aiContext,
  onTemplateUsed,
  uiHints,
}: PrescriptionTemplateEngineProps) {
  const [mode, setMode] = useState<EntryMode>('idle');
  const [aiSuggestion, setAiSuggestion] = useState<PrescriptionSuggestion | null>(null);
  const [interactions, setInteractions] = useState<DrugInteractionWarning[]>([]);
  const [showNotes, setShowNotes] = useState(false);

  const hints = { ...DEFAULT_UI_HINTS, ...uiHints };

  const aiSuggest = useAiSuggestPrescription();
  const aiFeedback = useAiFeedback();
  const checkDDI = useCheckInteractions();

  // Check drug interactions when 2+ meds exist
  useEffect(() => {
    const drugNames = items.map((i) => i.medicationName).filter(Boolean);
    if (drugNames.length >= 2) {
      checkDDI.mutate(drugNames, {
        onSuccess: (result) => setInteractions(result || []),
      });
    } else {
      setInteractions([]);
    }
  }, [items.map((i) => i.medicationName).join(',')]);

  const handleAiSuggest = useCallback(() => {
    if (!aiContext || aiContext.diagnoses.length === 0) return;
    aiSuggest.mutate({
      ...aiContext,
      currentMedications: items.map(i => i.medicationName).filter(Boolean)
    }, {
      onSuccess: (suggestion) => {
        setAiSuggestion(suggestion);
        setMode('ai-template');
      },
    });
  }, [aiContext, aiSuggest]);

  const handleApplyTemplate = useCallback(() => {
    if (!aiSuggestion) return;

    const newItems: CreatePrescriptionItemInput[] = aiSuggestion.medications.map(
      (med: MedicationSuggestion) => ({
        medicationName: med.medicationName,
        genericName: med.genericName || '',
        dosage: med.dosage || '',
        frequency: med.frequency || '',
        duration: med.duration || '',
        route: med.route || 'Oral',
        instructions: med.instructions || '',
      }),
    );

    onItemsChange([...items, ...newItems]);
    onTemplateUsed?.();

    if (aiSuggestion.auditLogId) {
      aiFeedback.mutate({
        auditLogId: aiSuggestion.auditLogId,
        action: 'accepted',
      });
    }

    setMode('idle');
    setAiSuggestion(null);
  }, [aiSuggestion, onItemsChange, aiFeedback, onTemplateUsed]);

  const handleDismissTemplate = useCallback(() => {
    if (aiSuggestion?.auditLogId) {
      aiFeedback.mutate({
        auditLogId: aiSuggestion.auditLogId,
        action: 'rejected',
      });
    }
    setAiSuggestion(null);
    setMode('idle');
  }, [aiSuggestion, aiFeedback]);

  const addEmptyItem = useCallback(() => {
    onItemsChange([
      ...items,
      {
        medicationName: '',
        genericName: '',
        dosage: '',
        frequency: '',
        duration: '',
        route: hints.showRouteChips ? 'Oral' : '',
        instructions: '',
      },
    ]);
    setMode('custom');
  }, [items, onItemsChange, hints.showRouteChips]);

  const updateItem = useCallback(
    (index: number, field: keyof CreatePrescriptionItemInput, value: string) => {
      const updated = [...items];
      updated[index] = { ...updated[index], [field]: value };
      onItemsChange(updated);
    },
    [items, onItemsChange],
  );

  const removeItem = useCallback(
    (index: number) => {
      onItemsChange(items.filter((_, i) => i !== index));
    },
    [items, onItemsChange],
  );

  return (
    <Card id="section-rx">
      <CardContent className="px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {hints.prescriptionLabel || 'Prescription'}
            </span>
            {items.length > 0 && (
              <span className="text-xs text-gray-400">
                ({items.filter((i) => i.medicationName).length} meds)
              </span>
            )}
          </div>

          {/* Notes toggle */}
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showNotes ? 'Hide' : 'Add'} notes
            </button>
          )}
        </div>

        {/* Drug Interaction Alert */}
        {interactions.length > 0 && (
          <DrugInteractionAlert interactions={interactions} />
        )}

        {/* Entry mode selector — shown when no items yet */}
        {items.length === 0 && mode === 'idle' && (
          <div className="flex flex-wrap gap-2">
            {aiContext && aiContext.diagnoses.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950/30"
                onClick={handleAiSuggest}
                disabled={aiSuggest.isPending}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                {aiSuggest.isPending ? 'Generating...' : 'AI Template'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={addEmptyItem}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {hints.showRemedySelector ? 'Add Remedy' : 'Custom Prescription'}
            </Button>
          </div>
        )}

        {/* AI Template Preview */}
        {mode === 'ai-template' && aiSuggestion && (
          <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                  Suggested Prescription
                </span>
                <AiConfidenceBadge confidence={aiSuggestion.confidence} />
              </div>
            </div>

            <div className="space-y-1.5 px-1 py-1">
              {aiSuggestion.medications.length > 0 ? (
                aiSuggestion.medications.map((med, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-purple-900 dark:text-purple-200">
                    <span className="font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900 border border-purple-200 dark:border-purple-800">
                      {med.medicationName}
                    </span>
                    <span className="font-medium">{med.dosage}</span>
                    <span className="text-purple-300 dark:text-purple-600">|</span>
                    <span>{med.frequency}</span>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-purple-500 italic px-1">
                  No specific remedies found in transcript context.
                </div>
              )}
            </div>

            {/* Allergy warnings */}
            {aiSuggestion.allergyWarnings && aiSuggestion.allergyWarnings.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs text-red-700 dark:text-red-300">
                  {aiSuggestion.allergyWarnings.join('; ')}
                </div>
              </div>
            )}

            {/* Medication cards preview */}
            <div className="space-y-1.5">
              {aiSuggestion.medications.map((med: MedicationSuggestion, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900 px-3 py-2"
                >
                  <Pill className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                      {med.medicationName}
                      {med.genericName && (
                        <span className="text-gray-400 font-normal ml-1">
                          ({med.genericName})
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {[med.dosage, med.frequency, med.duration, med.route]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleApplyTemplate}
              >
                <Copy className="h-3 w-3 mr-1" />
                Use Template
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-gray-500"
                onClick={handleDismissTemplate}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Medication items (editable cards) */}
        {items.length > 0 && (
          <div className="space-y-3">
            {items.map((item, index) => (
              <MedicationCard
                key={index}
                item={item}
                index={index}
                onUpdate={updateItem}
                onRemove={removeItem}
                uiHints={hints}
              />
            ))}

            {/* Add more actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={addEmptyItem}
              >
                <Plus className="h-3 w-3 mr-1" />
                {hints.showRemedySelector ? 'Add Remedy' : 'Add Medication'}
              </Button>
              {aiContext && aiContext.diagnoses.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950/30"
                  onClick={handleAiSuggest}
                  disabled={aiSuggest.isPending}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  {aiSuggest.isPending ? 'Generating...' : 'AI Suggest More'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {showNotes && (
          <Input
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Prescription notes..."
            className="h-8 text-xs"
          />
        )}
      </CardContent>
    </Card>
  );
}

function MedicationCard({
  item,
  index,
  onUpdate,
  onRemove,
  uiHints,
}: {
  item: CreatePrescriptionItemInput;
  index: number;
  onUpdate: (index: number, field: keyof CreatePrescriptionItemInput, value: string) => void;
  onRemove: (index: number) => void;
  uiHints: UiHints;
}) {
  const [expanded, setExpanded] = useState(!item.medicationName);

  // Select chip arrays based on uiHints
  const dosageChips = uiHints.showPotencySelector ? DOSAGE_CHIPS_REMEDY : DOSAGE_CHIPS_DEFAULT;
  const frequencyChips = uiHints.showPotencySelector ? FREQUENCY_CHIPS_REMEDY : FREQUENCY_CHIPS_DEFAULT;
  const durationChips = uiHints.showPotencySelector ? DURATION_CHIPS_REMEDY : DURATION_CHIPS_DEFAULT;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Collapsed header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Pill className="h-3.5 w-3.5 text-gray-400 shrink-0" />
        <div className="flex-1 min-w-0">
          {item.medicationName ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                {item.medicationName}
              </span>
              {item.dosage && (
                <span className="text-[11px] text-gray-500">{item.dosage}</span>
              )}
              {item.frequency && (
                <span className="rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-400">
                  {item.frequency}
                </span>
              )}
              {item.duration && (
                <span className="text-[11px] text-gray-400">{item.duration}</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-400">
              {uiHints.showRemedySelector ? 'New remedy' : 'New medication'}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-gray-400 hover:text-red-500"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-gray-100 dark:border-gray-800 pt-2.5">
          {/* Medication / Remedy name */}
          <Input
            value={item.medicationName}
            onChange={(e) => onUpdate(index, 'medicationName', e.target.value)}
            placeholder={uiHints.showRemedySelector ? 'Remedy name *' : 'Medication name *'}
            className="h-8 text-xs"
            autoFocus={!item.medicationName}
          />

          {/* Potency chips — only for TOTALITY (homeopathy) */}
          {uiHints.showPotencySelector && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wide text-purple-500 font-medium">
                Potency
              </span>
              <div className="flex flex-wrap gap-1">
                {POTENCY_CHIPS.map((p) => (
                  <ChipButton
                    key={p}
                    label={p}
                    active={item.dosage === p}
                    onClick={() => onUpdate(index, 'dosage', item.dosage === p ? '' : p)}
                    variant="purple"
                  />
                ))}
                {item.dosage && !POTENCY_CHIPS.includes(item.dosage) && !dosageChips.includes(item.dosage) && (
                  <ChipButton label={item.dosage} active onClick={() => onUpdate(index, 'dosage', '')} variant="purple" />
                )}
                <Input
                  value={POTENCY_CHIPS.includes(item.dosage) ? '' : (dosageChips.includes(item.dosage) ? '' : item.dosage)}
                  onChange={(e) => onUpdate(index, 'dosage', e.target.value)}
                  placeholder="Other"
                  className="h-6 w-16 text-[11px] px-2"
                />
              </div>
            </div>
          )}

          {/* Form chips — only for TOTALITY (homeopathy) */}
          {uiHints.showPotencySelector && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wide text-purple-500 font-medium">
                Form
              </span>
              <div className="flex flex-wrap gap-1">
                {FORM_CHIPS.map((f) => (
                  <ChipButton
                    key={f}
                    label={f}
                    active={item.route === f}
                    onClick={() => onUpdate(index, 'route', item.route === f ? '' : f)}
                    variant="purple"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Dosage chips — shown for PROTOCOL/RISK/PROCEDURE, hidden for TOTALITY when potency is shown */}
          {uiHints.showDosageChips !== false && !uiHints.showPotencySelector && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">
                Dosage
              </span>
              <div className="flex flex-wrap gap-1">
                {dosageChips.map((d) => (
                  <ChipButton
                    key={d}
                    label={d}
                    active={item.dosage === d}
                    onClick={() => onUpdate(index, 'dosage', item.dosage === d ? '' : d)}
                  />
                ))}
                {item.dosage && !dosageChips.includes(item.dosage) && (
                  <ChipButton label={item.dosage} active onClick={() => onUpdate(index, 'dosage', '')} />
                )}
                <Input
                  value={dosageChips.includes(item.dosage) ? '' : item.dosage}
                  onChange={(e) => onUpdate(index, 'dosage', e.target.value)}
                  placeholder="Other"
                  className="h-6 w-16 text-[11px] px-2"
                />
              </div>
            </div>
          )}

          {/* Remedy dosage chips — for TOTALITY, shows globules/drops dosage */}
          {uiHints.showPotencySelector && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">
                Dose
              </span>
              <div className="flex flex-wrap gap-1">
                {DOSAGE_CHIPS_REMEDY.map((d) => (
                  <ChipButton
                    key={d}
                    label={d}
                    active={item.instructions === d}
                    onClick={() => onUpdate(index, 'instructions', item.instructions === d ? '' : d)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Frequency chips */}
          {uiHints.showFrequencyChips !== false && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">
                Frequency
              </span>
              <div className="flex flex-wrap gap-1">
                {frequencyChips.map((f) => (
                  <ChipButton
                    key={f}
                    label={f}
                    active={item.frequency === f}
                    onClick={() => onUpdate(index, 'frequency', item.frequency === f ? '' : f)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Duration chips */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">
              Duration
            </span>
            <div className="flex flex-wrap gap-1">
              {durationChips.map((d) => (
                <ChipButton
                  key={d}
                  label={d}
                  active={item.duration === d}
                  onClick={() => onUpdate(index, 'duration', item.duration === d ? '' : d)}
                />
              ))}
            </div>
          </div>

          {/* Route chips — only for non-homeopathy (PROTOCOL/RISK/PROCEDURE) */}
          {uiHints.showRouteChips !== false && !uiHints.showPotencySelector && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">
                Route
              </span>
              <div className="flex flex-wrap gap-1">
                {ROUTE_CHIPS_DEFAULT.map((r) => (
                  <ChipButton
                    key={r}
                    label={r}
                    active={item.route === r}
                    onClick={() => onUpdate(index, 'route', item.route === r ? '' : r)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Titration fields — only for RISK category */}
          {uiHints.showTitrationFields && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wide text-orange-500 font-medium">
                Titration Notes
              </span>
              <Input
                value={item.instructions || ''}
                onChange={(e) => onUpdate(index, 'instructions', e.target.value)}
                placeholder="e.g. Start 2.5mg, titrate to 10mg over 4 weeks"
                className="h-7 text-[11px] border-orange-200 dark:border-orange-800"
              />
            </div>
          )}

          {/* Instructions — shown for non-titration, non-homeopathy */}
          {!uiHints.showTitrationFields && !uiHints.showPotencySelector && (
            <Input
              value={item.instructions || ''}
              onChange={(e) => onUpdate(index, 'instructions', e.target.value)}
              placeholder="Instructions (optional)"
              className="h-7 text-[11px]"
            />
          )}
        </div>
      )}
    </div>
  );
}

function ChipButton({
  label,
  active,
  onClick,
  variant = 'default',
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  variant?: 'default' | 'purple';
}) {
  const activeClass =
    variant === 'purple'
      ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700'
      : 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11px] sm:text-xs font-medium transition-colors border shadow-sm ${
        active
          ? activeClass
          : 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );
}
