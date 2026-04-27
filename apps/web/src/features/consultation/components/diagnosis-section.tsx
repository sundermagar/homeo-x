import { useState } from 'react';
import { Stethoscope } from 'lucide-react';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { CollapsibleSection } from '../../../components/shared/collapsible-section';
import { Icd10Search } from './icd10-search';
import { AiSuggestButton } from './ai-suggest-button';
import { AiSuggestionPanel } from './ai-suggestion-panel';
import { SpecialtyFields } from './specialty-fields';
import { useAiSuggestSoap, useAiFeedback } from '../../../hooks/use-ai-suggest';
import type { SoapFieldConfig } from '../../../types/specialty';
import type { SoapSuggestion, SuggestSoapInput } from '../../../types/ai';

interface SOAPData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  icdCodes: string;
  specialtyData: Record<string, unknown>;
}

interface DiagnosisSectionProps {
  data: SOAPData;
  onChange: (data: SOAPData) => void;
  specialtyFields?: SoapFieldConfig[];
  aiContext?: Omit<SuggestSoapInput, 'visitId'> & { visitId: string };
  externalSuggestion?: SoapSuggestion | null;
  onExternalSuggestionHandled?: () => void;
}

export function DiagnosisSection({
  data,
  onChange,
  specialtyFields = [],
  aiContext,
  externalSuggestion,
  onExternalSuggestionHandled,
}: DiagnosisSectionProps) {
  const [soapSuggestion, setSoapSuggestion] = useState<SoapSuggestion | null>(null);
  const suggestSoap = useAiSuggestSoap();
  const feedback = useAiFeedback();

  const update = (field: keyof SOAPData, value: unknown) => {
    onChange({ ...data, [field]: value });
  };

  const handleAiSuggest = () => {
    if (!aiContext?.visitId || !aiContext.chiefComplaint) return;
    suggestSoap.mutate(aiContext, { onSuccess: (r) => setSoapSuggestion(r) });
  };

  const activeSuggestion = externalSuggestion || soapSuggestion;

  const handleApply = () => {
    if (!activeSuggestion) return;
    onChange({
      ...data,
      subjective: activeSuggestion.subjective || data.subjective,
      objective: activeSuggestion.objective || data.objective,
      assessment: activeSuggestion.assessment || data.assessment,
      plan: activeSuggestion.plan || data.plan,
      icdCodes: activeSuggestion.icdCodes.map((c) => c.code).join(', ') || data.icdCodes,
    });
    feedback.mutate({ auditLogId: activeSuggestion.auditLogId, action: 'accepted' });
    setSoapSuggestion(null);
    onExternalSuggestionHandled?.();
  };

  const handleDismiss = () => {
    if (activeSuggestion) {
      feedback.mutate({ auditLogId: activeSuggestion.auditLogId, action: 'rejected' });
    }
    setSoapSuggestion(null);
    onExternalSuggestionHandled?.();
  };

  const handleIcd10Select = (code: string) => {
    const existing = data.icdCodes ? data.icdCodes.split(',').map((c) => c.trim()).filter(Boolean) : [];
    if (!existing.includes(code)) {
      update('icdCodes', [...existing, code].join(', '));
    }
  };

  const allSpecialtyFields = specialtyFields;

  return (
    <CollapsibleSection
      id="section-diagnosis"
      title="Diagnosis & SOAP"
      icon={<Stethoscope className="h-5 w-5" />}
      defaultOpen={true}
      badge={
        aiContext?.chiefComplaint ? (
          <AiSuggestButton
            onClick={handleAiSuggest}
            isLoading={suggestSoap.isPending}
            label="AI Suggest"
          />
        ) : undefined
      }
    >
      {activeSuggestion && (
        <div className="mb-4">
          <AiSuggestionPanel
            type="soap"
            suggestion={activeSuggestion}
            onApply={handleApply}
            onDismiss={handleDismiss}
          />
        </div>
      )}

      {/* ICD-10 Codes */}
      <div className="space-y-2 mb-4">
        <Label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          ICD-10 Codes
        </Label>
        <Icd10Search onSelect={handleIcd10Select} />
        <Input
          value={data.icdCodes}
          onChange={(e) => update('icdCodes', e.target.value)}
          placeholder="e.g. J06.9, R50.9"
          className="text-sm"
        />
      </div>

      {/* Compact SOAP Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">Subjective</Label>
          <Textarea
            value={data.subjective}
            onChange={(e) => update('subjective', e.target.value)}
            placeholder="Symptoms, chief complaint, HPI..."
            rows={3}
            className="text-sm"
          />
          <SpecialtyFields
            fields={allSpecialtyFields.filter((f) => f.section === 'subjective')}
            values={data.specialtyData}
            onChange={(key, value) => update('specialtyData', { ...data.specialtyData, [key]: value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">Objective</Label>
          <Textarea
            value={data.objective}
            onChange={(e) => update('objective', e.target.value)}
            placeholder="PE findings, vitals, labs..."
            rows={3}
            className="text-sm"
          />
          <SpecialtyFields
            fields={allSpecialtyFields.filter((f) => f.section === 'objective')}
            values={data.specialtyData}
            onChange={(key, value) => update('specialtyData', { ...data.specialtyData, [key]: value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">Assessment</Label>
          <Textarea
            value={data.assessment}
            onChange={(e) => update('assessment', e.target.value)}
            placeholder="Diagnosis, differential..."
            rows={3}
            className="text-sm"
          />
          <SpecialtyFields
            fields={allSpecialtyFields.filter((f) => f.section === 'assessment')}
            values={data.specialtyData}
            onChange={(key, value) => update('specialtyData', { ...data.specialtyData, [key]: value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium text-gray-500 dark:text-gray-400">Plan</Label>
          <Textarea
            value={data.plan}
            onChange={(e) => update('plan', e.target.value)}
            placeholder="Treatment plan, follow-up..."
            rows={3}
            className="text-sm"
          />
          <SpecialtyFields
            fields={allSpecialtyFields.filter((f) => f.section === 'plan')}
            values={data.specialtyData}
            onChange={(key, value) => update('specialtyData', { ...data.specialtyData, [key]: value })}
          />
        </div>
      </div>
    </CollapsibleSection>
  );
}
