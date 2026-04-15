import { useState, useCallback, useEffect } from 'react';
import { Stethoscope, Search, X, ChevronDown, ChevronUp, Sparkles, FileText } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Button } from '../../../components/ui/button';
import { AiConfidenceBadge } from './ai-confidence-badge';
import { useIcd10Search } from '../../../hooks/use-icd10';
import { useAiSuggestSoap, useAiSuggestDiagnosis, useAiFeedback } from '../../../hooks/use-ai-suggest';
import type { SoapSuggestion, DiagnosisSuggestion, SuggestSoapInput, SuggestDiagnosisInput } from '../../../types/ai';

interface DiagnosisChipsProps {
  selectedCodes: string;
  onCodesChange: (codes: string) => void;
  soapData: { subjective: string; objective: string; assessment: string; plan: string; clinicalSummary: string; };
  onSoapChange: (data: { subjective: string; objective: string; assessment: string; plan: string; clinicalSummary: string; }) => void;
  aiSuggestion?: SoapSuggestion | null;
  onAiSuggestionHandled?: () => void;
  aiContext?: Omit<SuggestSoapInput, 'visitId'> & { visitId: string };
  onDiagnosisSelected?: (diagnoses: string[]) => void;
}

interface SelectedDiagnosis { code: string; description: string; }

export function DiagnosisChips({ selectedCodes, onCodesChange, soapData, onSoapChange, aiSuggestion, onAiSuggestionHandled, aiContext, onDiagnosisSelected }: DiagnosisChipsProps) {
  const [showIcdSearch, setShowIcdSearch] = useState(false);
  const [icdQuery, setIcdQuery] = useState('');
  const [showSoapEditor, setShowSoapEditor] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [activeSoapSuggestion, setActiveSoapSuggestion] = useState<SoapSuggestion | null>(null);
  const [activeDxSuggestion, setActiveDxSuggestion] = useState<DiagnosisSuggestion | null>(null);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<SelectedDiagnosis[]>([]);

  const { data: icdResults } = useIcd10Search(icdQuery);
  const aiSuggestSoap = useAiSuggestSoap();
  const aiSuggestDx = useAiSuggestDiagnosis();
  const aiFeedback = useAiFeedback();

  useEffect(() => {
    if (selectedCodes) {
      const codes = selectedCodes.split(',').map(c => c.trim()).filter(Boolean);
      setSelectedDiagnoses(prev => {
        const existing = prev.map(d => d.code);
        return [...prev, ...codes.filter(c => !existing.includes(c)).map(code => ({ code, description: code }))];
      });
    }
  }, []);

  useEffect(() => {
    if (aiSuggestion) { setActiveSoapSuggestion(aiSuggestion); setActiveDxSuggestion(null); setShowAiPanel(true); }
  }, [aiSuggestion]);

  const updateCodes = useCallback((diagnoses: SelectedDiagnosis[]) => {
    setSelectedDiagnoses(diagnoses);
    onCodesChange(diagnoses.map(d => d.code).join(', '));
    onDiagnosisSelected?.(diagnoses.map(d => d.description));
  }, [onCodesChange, onDiagnosisSelected]);

  const addDiagnosis = useCallback((code: string, description: string) => {
    if (selectedDiagnoses.some(d => d.code === code)) return;
    updateCodes([...selectedDiagnoses, { code, description }]);
    setIcdQuery(''); setShowIcdSearch(false);
  }, [selectedDiagnoses, updateCodes]);

  const removeDiagnosis = useCallback((code: string) => updateCodes(selectedDiagnoses.filter(d => d.code !== code)), [selectedDiagnoses, updateCodes]);

  const handleAiSuggest = useCallback(() => {
    if (!aiContext) return;
    aiSuggestDx.mutate({ symptoms: [aiContext.chiefComplaint || ''], vitals: aiContext.vitals, patientAge: aiContext.patientAge, patientGender: aiContext.patientGender, specialty: aiContext.specialty, transcript: aiContext.transcript || '' } as SuggestDiagnosisInput, {
      onSuccess: (suggestion) => { setActiveDxSuggestion(suggestion); setActiveSoapSuggestion(null); setShowAiPanel(true); },
    });
  }, [aiContext, aiSuggestDx]);

  const handleApplySuggestion = useCallback(() => {
    if (activeSoapSuggestion) {
      onSoapChange({ subjective: activeSoapSuggestion.subjective || soapData.subjective, objective: activeSoapSuggestion.objective || soapData.objective, assessment: activeSoapSuggestion.assessment || soapData.assessment, plan: activeSoapSuggestion.plan || soapData.plan, clinicalSummary: soapData.clinicalSummary });
      if (activeSoapSuggestion.icdCodes?.length > 0) {
        const merged = [...selectedDiagnoses];
        activeSoapSuggestion.icdCodes.forEach(icd => { if (!merged.some(m => m.code === icd.code)) merged.push({ code: icd.code, description: icd.description }); });
        updateCodes(merged);
      }
      if (activeSoapSuggestion.auditLogId) aiFeedback.mutate({ auditLogId: activeSoapSuggestion.auditLogId, action: 'accepted' });
    } else if (activeDxSuggestion) {
      onSoapChange({ ...soapData, assessment: activeDxSuggestion.primaryDiagnosis.name || soapData.assessment });
      const merged = [...selectedDiagnoses];
      const primary = activeDxSuggestion.primaryDiagnosis;
      if (primary.icdCode && !merged.some(m => m.code === primary.icdCode)) merged.push({ code: primary.icdCode, description: primary.icdDescription || primary.name });
      activeDxSuggestion.differentials.forEach(diff => { if (diff.likelihood === 'probable' && !merged.some(m => m.code === diff.icdCode)) merged.push({ code: diff.icdCode, description: diff.icdDescription || diff.name }); });
      updateCodes(merged);
      if (activeDxSuggestion.auditLogId) aiFeedback.mutate({ auditLogId: activeDxSuggestion.auditLogId, action: 'accepted' });
    }
    setShowAiPanel(false); setActiveSoapSuggestion(null); setActiveDxSuggestion(null); onAiSuggestionHandled?.();
  }, [activeSoapSuggestion, activeDxSuggestion, soapData, selectedDiagnoses, onSoapChange, updateCodes, aiFeedback, onAiSuggestionHandled]);

  const handleDismissSuggestion = useCallback(() => {
    const auditId = activeSoapSuggestion?.auditLogId || activeDxSuggestion?.auditLogId;
    if (auditId) aiFeedback.mutate({ auditLogId: auditId, action: 'rejected' });
    setShowAiPanel(false); setActiveSoapSuggestion(null); setActiveDxSuggestion(null); onAiSuggestionHandled?.();
  }, [activeSoapSuggestion, activeDxSuggestion, aiFeedback, onAiSuggestionHandled]);

  const aiDiagnoses = activeSoapSuggestion?.icdCodes
    ? activeSoapSuggestion.icdCodes
    : activeDxSuggestion
      ? [{ code: activeDxSuggestion.primaryDiagnosis.icdCode, description: activeDxSuggestion.primaryDiagnosis.icdDescription || activeDxSuggestion.primaryDiagnosis.name }, ...activeDxSuggestion.differentials.slice(0, 2).map(d => ({ code: d.icdCode, description: d.icdDescription || d.name }))]
      : [];

  const aiConfidence = activeSoapSuggestion?.confidence ?? activeDxSuggestion?.confidence ?? 0;
  const aiAssessment = activeSoapSuggestion?.assessment ?? activeDxSuggestion?.primaryDiagnosis.name;

  const soapFields = ['subjective', 'objective', 'assessment', 'plan'] as const;

  return (
    <Card>
      <CardContent style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Stethoscope style={{ width: 16, height: 16, color: 'var(--text-tertiary)' }} />
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>Diagnosis</span>
          </div>
          {aiContext && (
            <Button variant="outline" size="sm" onClick={handleAiSuggest} disabled={aiSuggestSoap.isPending || aiSuggestDx.isPending} style={{ height: '1.75rem', fontSize: 'var(--font-size-xs)', color: '#7C3AED', borderColor: '#DDD6FE' }}>
              <Sparkles style={{ width: 12, height: 12, marginRight: 4 }} />
              {aiSuggestSoap.isPending || aiSuggestDx.isPending ? 'Analyzing...' : 'AI Suggest'}
            </Button>
          )}
        </div>

        {/* AI Panel */}
        {showAiPanel && (activeSoapSuggestion || activeDxSuggestion) && (
          <div style={{ borderRadius: 'var(--radius-card)', border: '1px solid #DDD6FE', background: 'rgba(245,243,255,0.5)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles style={{ width: 16, height: 16, color: '#7C3AED' }} />
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: '#4C1D95' }}>AI Suggestion</span>
              <AiConfidenceBadge confidence={aiConfidence} />
            </div>
            {aiDiagnoses.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {aiDiagnoses.map((icd) => (
                  <span key={icd.code} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 'var(--radius-full)', padding: '0.25rem 0.625rem', fontSize: 'var(--font-size-xs)', fontWeight: 500, background: '#EDE9FE', color: '#4C1D95' }}>
                    {icd.code}: {icd.description}
                  </span>
                ))}
              </div>
            )}
            {aiAssessment && <p style={{ fontSize: 'var(--font-size-xs)', color: '#4C1D95', lineHeight: 1.5, margin: 0 }}>{aiAssessment}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Button size="sm" onClick={handleApplySuggestion} style={{ height: '1.75rem', fontSize: 'var(--font-size-xs)', background: '#7C3AED', color: 'white' }}>Apply All</Button>
              <Button size="sm" variant="ghost" onClick={handleDismissSuggestion} style={{ height: '1.75rem', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Dismiss</Button>
            </div>
          </div>
        )}

        {/* Selected diagnoses */}
        {selectedDiagnoses.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {selectedDiagnoses.map((d) => (
              <span key={d.code} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 'var(--radius-full)', padding: '0.25rem 0.625rem', fontSize: 'var(--font-size-xs)', fontWeight: 500, background: 'var(--color-success-100)', color: 'var(--color-success-800)', border: '1px solid var(--color-success-300)' }}>
                {d.code}: {d.description}
                <button type="button" onClick={() => removeDiagnosis(d.code)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 2, color: 'inherit', opacity: 0.7 }}>
                  <X style={{ width: 12, height: 12 }} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* ICD search */}
        {showIcdSearch ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--text-tertiary)' }} />
              <Input value={icdQuery} onChange={e => setIcdQuery(e.target.value)} placeholder="Search ICD-10 codes..." style={{ height: '2rem', paddingLeft: '2rem', fontSize: 'var(--font-size-xs)' }} autoFocus onKeyDown={e => { if (e.key === 'Escape') { setShowIcdSearch(false); setIcdQuery(''); } }} />
            </div>
            {icdResults && icdResults.length > 0 && (
              <div style={{ maxHeight: '9rem', overflowY: 'auto', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-default)', background: 'var(--bg-card)' }}>
                {icdResults.map((icd) => (
                  <button key={icd.code} type="button" onClick={() => addDiagnosis(icd.code, icd.shortDesc)} style={{ width: '100%', textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: 'var(--font-size-xs)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', transition: 'background var(--transition-fast)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-surface-2)')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{icd.code}</span>
                    <span style={{ color: 'var(--text-tertiary)', marginLeft: '0.5rem' }}>{icd.shortDesc}</span>
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => { setShowIcdSearch(false); setIcdQuery(''); }} style={{ fontSize: 11, color: 'var(--text-disabled)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel search</button>
          </div>
        ) : (
          <button type="button" onClick={() => setShowIcdSearch(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--font-size-xs)', color: 'var(--color-success-600)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
            <Search style={{ width: 12, height: 12 }} /> Add diagnosis
          </button>
        )}

        {/* SOAP Editor toggle */}
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '0.5rem' }}>
          <button type="button" onClick={() => setShowSoapEditor(!showSoapEditor)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--text-disabled)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <FileText style={{ width: 12, height: 12 }} />
            {showSoapEditor ? 'Hide' : 'Expand'} Full SOAP Editor
            {showSoapEditor ? <ChevronUp style={{ width: 12, height: 12 }} /> : <ChevronDown style={{ width: 12, height: 12 }} />}
          </button>

          {showSoapEditor && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {soapFields.map((field) => (
                <div key={field}>
                  <label style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, color: 'var(--text-disabled)', marginBottom: 4, display: 'block' }}>
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </label>
                  <Textarea value={soapData[field]} onChange={e => onSoapChange({ ...soapData, [field]: e.target.value })} rows={2} placeholder={`Enter ${field}...`} />
                </div>
              ))}
            </div>
          )}

          {!showSoapEditor && soapData.assessment && (
            <p style={{ marginTop: '0.5rem', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-card)', padding: '0.5rem 0.75rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Assessment: </span>{soapData.assessment}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
