import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { SpecialtyFields } from './specialty-fields';
import { AiSuggestButton } from './ai-suggest-button';
import { AiSuggestionPanel } from './ai-suggestion-panel';
import { Icd10Search } from './icd10-search';
import { useAiSuggestSoap, useAiFeedback } from '../../../hooks/use-ai-suggest';
import type { SoapFieldConfig } from '../../../types/specialty';
import type { SoapSuggestion, SuggestSoapInput } from '../../../types/ai';

interface SOAPData {
  subjective: string; objective: string; assessment: string;
  plan: string; icdCodes: string; specialtyData: Record<string, unknown>;
}

interface SoapEditorProps {
  data: SOAPData; onChange: (data: SOAPData) => void;
  specialtyFields?: SoapFieldConfig[];
  aiContext?: Omit<SuggestSoapInput, 'visitId'> & { visitId: string };
  externalSuggestion?: SoapSuggestion | null;
  onExternalSuggestionHandled?: () => void;
}

export function SoapEditor({ data, onChange, specialtyFields = [], aiContext, externalSuggestion, onExternalSuggestionHandled }: SoapEditorProps) {
  const [activeTab, setActiveTab] = useState('subjective');
  const [soapSuggestion, setSoapSuggestion] = useState<SoapSuggestion | null>(null);
  const suggestSoap = useAiSuggestSoap();
  const feedback = useAiFeedback();

  const update = (field: keyof SOAPData, value: unknown) => onChange({ ...data, [field]: value });
  const handleAiSuggest = () => { if (!aiContext?.visitId) return; suggestSoap.mutate(aiContext, { onSuccess: (result) => setSoapSuggestion(result) }); };
  const activeSuggestion = externalSuggestion || soapSuggestion;

  const handleApplySuggestion = () => {
    if (!activeSuggestion) return;
    onChange({ ...data, subjective: activeSuggestion.subjective || data.subjective, objective: activeSuggestion.objective || data.objective, assessment: activeSuggestion.assessment || data.assessment, plan: activeSuggestion.plan || data.plan, icdCodes: activeSuggestion.icdCodes.map(c => c.code).join(', ') || data.icdCodes });
    feedback.mutate({ auditLogId: activeSuggestion.auditLogId, action: 'accepted' });
    setSoapSuggestion(null); onExternalSuggestionHandled?.();
  };

  const handleDismissSuggestion = () => {
    if (activeSuggestion) feedback.mutate({ auditLogId: activeSuggestion.auditLogId, action: 'rejected' });
    setSoapSuggestion(null); onExternalSuggestionHandled?.();
  };

  const handleIcd10Select = (code: string) => {
    const existing = data.icdCodes ? data.icdCodes.split(',').map(c => c.trim()).filter(Boolean) : [];
    if (!existing.includes(code)) update('icdCodes', [...existing, code].join(', '));
  };

  const sFields = (section: 'subjective' | 'objective' | 'assessment' | 'plan') => specialtyFields.filter(f => f.section === section);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Card>
        <CardHeader style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <CardTitle>SOAP Note</CardTitle>
          {aiContext?.visitId && <AiSuggestButton onClick={handleAiSuggest} isLoading={suggestSoap.isPending} label="AI Suggest SOAP" />}
        </CardHeader>
        <CardContent>
          {activeSuggestion && <div style={{ marginBottom: '1rem' }}><AiSuggestionPanel type="soap" suggestion={activeSuggestion} onApply={handleApplySuggestion} onDismiss={handleDismissSuggestion} /></div>}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList style={{ width: '100%' }}>
              <TabsTrigger value="subjective" style={{ flex: 1 }}>Subjective</TabsTrigger>
              <TabsTrigger value="objective"  style={{ flex: 1 }}>Objective</TabsTrigger>
              <TabsTrigger value="assessment" style={{ flex: 1 }}>Assessment</TabsTrigger>
              <TabsTrigger value="plan"       style={{ flex: 1 }}>Plan</TabsTrigger>
            </TabsList>

            <TabsContent value="subjective" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <Label>Subjective</Label>
                <Textarea value={data.subjective} onChange={e => update('subjective', e.target.value)} placeholder="Patient's description of symptoms, chief complaint, history of present illness..." rows={5} />
              </div>
              <SpecialtyFields fields={sFields('subjective')} values={data.specialtyData} onChange={(key, value) => update('specialtyData', { ...data.specialtyData, [key]: value })} />
            </TabsContent>

            <TabsContent value="objective" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <Label>Objective</Label>
                <Textarea value={data.objective} onChange={e => update('objective', e.target.value)} placeholder="Physical examination findings, vital signs, lab results..." rows={5} />
              </div>
              <SpecialtyFields fields={sFields('objective')} values={data.specialtyData} onChange={(key, value) => update('specialtyData', { ...data.specialtyData, [key]: value })} />
            </TabsContent>

            <TabsContent value="assessment" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <Label>Assessment</Label>
                <Textarea value={data.assessment} onChange={e => update('assessment', e.target.value)} placeholder="Diagnosis, differential diagnosis..." rows={5} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <Label>ICD-10 Codes</Label>
                <Icd10Search onSelect={handleIcd10Select} />
                <Input value={data.icdCodes} onChange={e => update('icdCodes', e.target.value)} placeholder="e.g. J06.9, R50.9" style={{ marginTop: '0.25rem' }} />
              </div>
              <SpecialtyFields fields={sFields('assessment')} values={data.specialtyData} onChange={(key, value) => update('specialtyData', { ...data.specialtyData, [key]: value })} />
            </TabsContent>

            <TabsContent value="plan" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <Label>Plan</Label>
                <Textarea value={data.plan} onChange={e => update('plan', e.target.value)} placeholder="Treatment plan, medications, follow-up instructions..." rows={5} />
              </div>
              <SpecialtyFields fields={sFields('plan')} values={data.specialtyData} onChange={(key, value) => update('specialtyData', { ...data.specialtyData, [key]: value })} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
