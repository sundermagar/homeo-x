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
  subjective: string; objective: string; assessment: string;
  plan: string; icdCodes: string; specialtyData: Record<string, unknown>;
}

interface DiagnosisSectionProps {
  data: SOAPData; onChange: (data: SOAPData) => void;
  specialtyFields?: SoapFieldConfig[];
  aiContext?: Omit<SuggestSoapInput, 'visitId'> & { visitId: string };
  externalSuggestion?: SoapSuggestion | null;
  onExternalSuggestionHandled?: () => void;
}

export function DiagnosisSection({ data, onChange, specialtyFields = [], aiContext, externalSuggestion, onExternalSuggestionHandled }: DiagnosisSectionProps) {
  const [soapSuggestion, setSoapSuggestion] = useState<SoapSuggestion | null>(null);
  const suggestSoap = useAiSuggestSoap();
  const feedback = useAiFeedback();

  const update = (field: keyof SOAPData, value: unknown) => onChange({ ...data, [field]: value });
  const handleAiSuggest = () => { if (!aiContext?.visitId || !aiContext.chiefComplaint) return; suggestSoap.mutate(aiContext, { onSuccess: (r) => setSoapSuggestion(r) }); };
  const activeSuggestion = externalSuggestion || soapSuggestion;

  const handleApply = () => {
    if (!activeSuggestion) return;
    onChange({ ...data, subjective: activeSuggestion.subjective || data.subjective, objective: activeSuggestion.objective || data.objective, assessment: activeSuggestion.assessment || data.assessment, plan: activeSuggestion.plan || data.plan, icdCodes: activeSuggestion.icdCodes.map(c => c.code).join(', ') || data.icdCodes });
    feedback.mutate({ auditLogId: activeSuggestion.auditLogId, action: 'accepted' });
    setSoapSuggestion(null); onExternalSuggestionHandled?.();
  };

  const handleDismiss = () => {
    if (activeSuggestion) feedback.mutate({ auditLogId: activeSuggestion.auditLogId, action: 'rejected' });
    setSoapSuggestion(null); onExternalSuggestionHandled?.();
  };

  const handleIcd10Select = (code: string) => {
    const existing = data.icdCodes ? data.icdCodes.split(',').map(c => c.trim()).filter(Boolean) : [];
    if (!existing.includes(code)) update('icdCodes', [...existing, code].join(', '));
  };

  const soapFields = [
    { key: 'subjective', label: 'Subjective', placeholder: 'Symptoms, chief complaint, HPI...' },
    { key: 'objective',  label: 'Objective',  placeholder: 'PE findings, vitals, labs...' },
    { key: 'assessment', label: 'Assessment', placeholder: 'Diagnosis, differential...' },
    { key: 'plan',       label: 'Plan',       placeholder: 'Treatment plan, follow-up...' },
  ] as const;

  return (
    <CollapsibleSection
      id="section-diagnosis" title="Diagnosis & SOAP"
      icon={<Stethoscope style={{ width: 20, height: 20 }} />}
      defaultOpen={true}
      badge={aiContext?.chiefComplaint ? <AiSuggestButton onClick={handleAiSuggest} isLoading={suggestSoap.isPending} label="AI Suggest" /> : undefined}
    >
      {activeSuggestion && <div style={{ marginBottom: '1rem' }}><AiSuggestionPanel type="soap" suggestion={activeSuggestion} onApply={handleApply} onDismiss={handleDismiss} /></div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        <Label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ICD-10 Codes</Label>
        <Icd10Search onSelect={handleIcd10Select} />
        <Input value={data.icdCodes} onChange={e => update('icdCodes', e.target.value)} placeholder="e.g. J06.9, R50.9" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {soapFields.map(({ key, label, placeholder }) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <Label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--text-tertiary)' }}>{label}</Label>
            <Textarea value={data[key]} onChange={e => update(key, e.target.value)} placeholder={placeholder} rows={3} />
            <SpecialtyFields fields={specialtyFields.filter(f => f.section === key)} values={data.specialtyData} onChange={(k, v) => update('specialtyData', { ...data.specialtyData, [k]: v })} />
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}
