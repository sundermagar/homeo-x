import { X, Check, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { AiConfidenceBadge } from './ai-confidence-badge';
import { DrugInteractionAlert } from './drug-interaction-alert';
import type { SoapSuggestion, PrescriptionSuggestion } from '../../../types/ai';

interface SoapSuggestionPanelProps {
  type: 'soap';
  suggestion: SoapSuggestion;
  onApply: () => void;
  onDismiss: () => void;
}

interface PrescriptionSuggestionPanelProps {
  type: 'prescription';
  suggestion: PrescriptionSuggestion;
  onApply: () => void;
  onDismiss: () => void;
}

type AiSuggestionPanelProps = SoapSuggestionPanelProps | PrescriptionSuggestionPanelProps;

export function AiSuggestionPanel(props: AiSuggestionPanelProps) {
  const { type, onApply, onDismiss } = props;

  return (
    <Card className="border-purple-200 bg-purple-50/50">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <CardTitle className="text-sm text-purple-800">
            AI Suggestion
          </CardTitle>
        </div>
        <AiConfidenceBadge
          confidence={type === 'soap' ? props.suggestion.confidence : props.suggestion.confidence}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        {type === 'soap' && <SoapContent suggestion={props.suggestion} />}
        {type === 'prescription' && <PrescriptionContent suggestion={props.suggestion} />}

        <div className="flex items-center gap-2 border-t border-purple-200 pt-3">
          <Button
            size="sm"
            onClick={onApply}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Check className="h-3.5 w-3.5" />
            Apply
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDismiss}
          >
            <X className="h-3.5 w-3.5" />
            Dismiss
          </Button>
          <span className="ml-auto text-xs text-gray-500">
            Doctor approval required
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function SoapContent({ suggestion }: { suggestion: SoapSuggestion }) {
  return (
    <div className="space-y-2 text-sm">
      {suggestion.subjective && (
        <div>
          <span className="font-medium text-gray-700">Subjective: </span>
          <span className="text-gray-600">{suggestion.subjective}</span>
        </div>
      )}
      {suggestion.objective && (
        <div>
          <span className="font-medium text-gray-700">Objective: </span>
          <span className="text-gray-600">{suggestion.objective}</span>
        </div>
      )}
      {suggestion.assessment && (
        <div>
          <span className="font-medium text-gray-700">Assessment: </span>
          <span className="text-gray-600">{suggestion.assessment}</span>
        </div>
      )}
      {suggestion.plan && (
        <div>
          <span className="font-medium text-gray-700">Plan: </span>
          <span className="text-gray-600">{suggestion.plan}</span>
        </div>
      )}
      {suggestion.icdCodes.length > 0 && (
        <div>
          <span className="font-medium text-gray-700">ICD-10 Codes: </span>
          <div className="mt-1 flex flex-wrap gap-1">
            {suggestion.icdCodes.map((icd) => (
              <span
                key={icd.code}
                className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
              >
                {icd.code} — {icd.description}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PrescriptionContent({ suggestion }: { suggestion: PrescriptionSuggestion }) {
  return (
    <div className="space-y-3 text-sm">
      {suggestion.medications.map((med, idx) => (
        <div key={idx} className="rounded border border-gray-200 bg-white p-2">
          <div className="font-medium text-gray-800">{med.medicationName}</div>
          {med.genericName && (
            <div className="text-xs text-gray-500">{med.genericName}</div>
          )}
          <div className="mt-1 grid grid-cols-3 gap-1 text-xs text-gray-600">
            <span>Dosage: {med.dosage}</span>
            <span>Freq: {med.frequency}</span>
            <span>Duration: {med.duration}</span>
          </div>
          {med.instructions && (
            <div className="mt-1 text-xs text-gray-500">{med.instructions}</div>
          )}
        </div>
      ))}

      {suggestion.allergyWarnings.length > 0 && (
        <div className="space-y-1">
          {suggestion.allergyWarnings.map((w, i) => (
            <div key={i} className="rounded bg-red-100 p-2 text-xs text-red-700">
              {w}
            </div>
          ))}
        </div>
      )}

      <DrugInteractionAlert interactions={suggestion.interactions} />
    </div>
  );
}
