import { useState, useCallback, useEffect } from 'react';
import {
  Stethoscope,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
} from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Button } from '../../../components/ui/button';
import { AiConfidenceBadge } from './ai-confidence-badge';
import { useIcd10Search } from '../../../hooks/use-icd10';
import { useAiSuggestSoap, useAiSuggestDiagnosis, useAiFeedback } from '../../../hooks/use-ai-suggest';
import type { SoapSuggestion, DiagnosisSuggestion, SuggestSoapInput, SuggestDiagnosisInput } from '../../../types/ai';

interface DiagnosisChipsProps {
  /** Selected ICD codes (comma-separated string) */
  selectedCodes: string;
  onCodesChange: (codes: string) => void;
  /** SOAP data for editable summary */
  soapData: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    clinicalSummary: string;
  };
  onSoapChange: (data: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    clinicalSummary: string;
  }) => void;
  /** AI suggestion from voice capture or manual trigger */
  aiSuggestion?: SoapSuggestion | null;
  onAiSuggestionHandled?: () => void;
  /** Context for AI SOAP generation */
  aiContext?: Omit<SuggestSoapInput, 'visitId'> & { visitId: string };
  /** Callback when diagnosis selection changes (for triggering Rx/lab suggestions) */
  onDiagnosisSelected?: (diagnoses: string[]) => void;
}

interface SelectedDiagnosis {
  code: string;
  description: string;
}

export function DiagnosisChips({
  selectedCodes,
  onCodesChange,
  soapData,
  onSoapChange,
  aiSuggestion,
  onAiSuggestionHandled,
  aiContext,
  onDiagnosisSelected,
}: DiagnosisChipsProps) {
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

  // Parse initial codes from string
  useEffect(() => {
    if (selectedCodes) {
      const codes = selectedCodes.split(',').map((c) => c.trim()).filter(Boolean);
      setSelectedDiagnoses((prev) => {
        const existing = prev.map((d) => d.code);
        const newCodes = codes.filter((c) => !existing.includes(c));
        return [
          ...prev,
          ...newCodes.map((code) => ({ code, description: code })),
        ];
      });
    }
  }, []);

  // Handle external AI suggestion (from voice capture)
  useEffect(() => {
    if (aiSuggestion) {
      setActiveSoapSuggestion(aiSuggestion);
      setActiveDxSuggestion(null);
      setShowAiPanel(true);
    }
  }, [aiSuggestion]);

  const updateCodes = useCallback(
    (diagnoses: SelectedDiagnosis[]) => {
      setSelectedDiagnoses(diagnoses);
      onCodesChange(diagnoses.map((d) => d.code).join(', '));
      onDiagnosisSelected?.(diagnoses.map((d) => d.description));
    },
    [onCodesChange, onDiagnosisSelected],
  );

  const addDiagnosis = useCallback(
    (code: string, description: string) => {
      if (selectedDiagnoses.some((d) => d.code === code)) return;
      const updated = [...selectedDiagnoses, { code, description }];
      updateCodes(updated);
      setIcdQuery('');
      setShowIcdSearch(false);
    },
    [selectedDiagnoses, updateCodes],
  );

  const removeDiagnosis = useCallback(
    (code: string) => {
      const updated = selectedDiagnoses.filter((d) => d.code !== code);
      updateCodes(updated);
    },
    [selectedDiagnoses, updateCodes],
  );

  const handleAiSuggest = useCallback(() => {
    if (!aiContext) return;
    
    // Use targeted diagnosis suggestion engine
    const suggestInput: SuggestDiagnosisInput = {
      symptoms: [aiContext.chiefComplaint || ''],
      vitals: aiContext.vitals,
      patientAge: aiContext.patientAge,
      patientGender: aiContext.patientGender,
      specialty: aiContext.specialty,
      transcript: aiContext.transcript || '',
    };

    aiSuggestDx.mutate(suggestInput, {
      onSuccess: (suggestion) => {
        setActiveDxSuggestion(suggestion);
        setActiveSoapSuggestion(null);
        setShowAiPanel(true);
      },
    });
  }, [aiContext, aiSuggestDx]);

  const handleApplySuggestion = useCallback(() => {
    if (activeSoapSuggestion) {
      onSoapChange({
        subjective: activeSoapSuggestion.subjective || soapData.subjective,
        objective: activeSoapSuggestion.objective || soapData.objective,
        assessment: activeSoapSuggestion.assessment || soapData.assessment,
        plan: activeSoapSuggestion.plan || soapData.plan,
        clinicalSummary: soapData.clinicalSummary,
      });

      if (activeSoapSuggestion.icdCodes && activeSoapSuggestion.icdCodes.length > 0) {
        const newDiagnoses = activeSoapSuggestion.icdCodes.map((icd) => ({
          code: icd.code,
          description: icd.description,
        }));
        const merged = [...selectedDiagnoses];
        for (const d of newDiagnoses) {
          if (!merged.some((m) => m.code === d.code)) {
            merged.push(d);
          }
        }
        updateCodes(merged);
      }

      if (activeSoapSuggestion.auditLogId) {
        aiFeedback.mutate({ auditLogId: activeSoapSuggestion.auditLogId, action: 'accepted' });
      }
    } else if (activeDxSuggestion) {
       onSoapChange({
        ...soapData,
        assessment: activeDxSuggestion.primaryDiagnosis.name || soapData.assessment,
      });

      const primary = activeDxSuggestion.primaryDiagnosis;
      const merged = [...selectedDiagnoses];
      if (primary.icdCode && !merged.some(m => m.code === primary.icdCode)) {
        merged.push({ code: primary.icdCode, description: primary.icdDescription || primary.name });
      }
      
      // Also add differentials if likely
      activeDxSuggestion.differentials.forEach(diff => {
        if (diff.likelihood === 'probable' && !merged.some(m => m.code === diff.icdCode)) {
          merged.push({ code: diff.icdCode, description: diff.icdDescription || diff.name });
        }
      });

      updateCodes(merged);

      if (activeDxSuggestion.auditLogId) {
        aiFeedback.mutate({ auditLogId: activeDxSuggestion.auditLogId, action: 'accepted' });
      }
    }

    setShowAiPanel(false);
    setActiveSoapSuggestion(null);
    setActiveDxSuggestion(null);
    onAiSuggestionHandled?.();
  }, [
    activeSoapSuggestion,
    activeDxSuggestion,
    soapData,
    selectedDiagnoses,
    onSoapChange,
    updateCodes,
    aiFeedback,
    onAiSuggestionHandled,
  ]);

  const handleDismissSuggestion = useCallback(() => {
    const auditId = activeSoapSuggestion?.auditLogId || activeDxSuggestion?.auditLogId;
    if (auditId) {
      aiFeedback.mutate({
        auditLogId: auditId,
        action: 'rejected',
      });
    }
    setShowAiPanel(false);
    setActiveSoapSuggestion(null);
    setActiveDxSuggestion(null);
    onAiSuggestionHandled?.();
  }, [activeSoapSuggestion, activeDxSuggestion, aiFeedback, onAiSuggestionHandled]);

  // AI suggested diagnoses for UI display
  const aiDiagnoses = activeSoapSuggestion?.icdCodes 
    ? activeSoapSuggestion.icdCodes 
    : activeDxSuggestion 
      ? [
          { code: activeDxSuggestion.primaryDiagnosis.icdCode, description: activeDxSuggestion.primaryDiagnosis.icdDescription || activeDxSuggestion.primaryDiagnosis.name },
          ...activeDxSuggestion.differentials.slice(0, 2).map(d => ({ code: d.icdCode, description: d.icdDescription || d.name }))
        ]
      : [];
  
  const aiConfidence = activeSoapSuggestion?.confidence ?? activeDxSuggestion?.confidence ?? 0;
  const aiAssessment = activeSoapSuggestion?.assessment ?? activeDxSuggestion?.primaryDiagnosis.name;

  return (
    <Card>
      <CardContent className="px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Diagnosis
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {aiContext && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950/30"
                onClick={handleAiSuggest}
                disabled={aiSuggestSoap.isPending || aiSuggestDx.isPending}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {aiSuggestSoap.isPending || aiSuggestDx.isPending ? 'Analyzing...' : 'AI Suggest'}
              </Button>
            )}
          </div>
        </div>

        {/* AI Suggestion Panel */}
        {showAiPanel && (activeSoapSuggestion || activeDxSuggestion) && (
          <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                  AI Suggestion
                </span>
                <AiConfidenceBadge confidence={aiConfidence} />
              </div>
            </div>

            {/* Suggested diagnoses as chips */}
            {aiDiagnoses.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {aiDiagnoses.map((icd) => (
                  <span
                    key={icd.code}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                  >
                    {icd.code}: {icd.description}
                  </span>
                ))}
              </div>
            )}

            {/* SOAP preview */}
            {aiAssessment && (
              <p className="text-xs text-purple-700 dark:text-purple-300 leading-relaxed">
                {aiAssessment}
              </p>
            )}

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleApplySuggestion}
              >
                Apply All
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-gray-500"
                onClick={handleDismissSuggestion}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Selected diagnoses */}
        {selectedDiagnoses.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedDiagnoses.map((d) => (
              <span
                key={d.code}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-teal-100 text-teal-800 border border-teal-300 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700"
              >
                {d.code}: {d.description}
                <button
                  type="button"
                  onClick={() => removeDiagnosis(d.code)}
                  className="hover:text-red-600 dark:hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add diagnosis — ICD search (secondary action) */}
        {showIcdSearch ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                value={icdQuery}
                onChange={(e) => setIcdQuery(e.target.value)}
                placeholder="Search ICD-10 codes..."
                className="h-8 pl-8 text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowIcdSearch(false);
                    setIcdQuery('');
                  }
                }}
              />
            </div>
            {icdResults && icdResults.length > 0 && (
              <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                {icdResults.map((icd) => (
                  <button
                    key={icd.code}
                    type="button"
                    onClick={() => addDiagnosis(icd.code, icd.shortDesc)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-50 dark:border-gray-800 last:border-0"
                  >
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {icd.code}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                      {icd.shortDesc}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setShowIcdSearch(false);
                setIcdQuery('');
              }}
              className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Cancel search
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowIcdSearch(true)}
            className="inline-flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium"
          >
            <Search className="h-3 w-3" />
            Add diagnosis
          </button>
        )}

        {/* SOAP Editor — collapsed by default, expand on demand */}
        <div className="border-t border-gray-100 dark:border-gray-800 pt-2">
          <button
            type="button"
            onClick={() => setShowSoapEditor(!showSoapEditor)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium"
          >
            <FileText className="h-3 w-3" />
            {showSoapEditor ? 'Hide' : 'Expand'} Full SOAP Editor
            {showSoapEditor ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>

          {showSoapEditor && (
            <div className="mt-3 space-y-3">
              {(['subjective', 'objective', 'assessment', 'plan'] as const).map(
                (field) => (
                  <div key={field}>
                    <label className="text-[11px] uppercase tracking-wide font-medium text-gray-400 mb-1 block">
                      {field.charAt(0).toUpperCase() + field.slice(1)}
                    </label>
                    <Textarea
                      value={soapData[field]}
                      onChange={(e) =>
                        onSoapChange({ ...soapData, [field]: e.target.value })
                      }
                      rows={2}
                      className="text-sm resize-none"
                      placeholder={`Enter ${field}...`}
                    />
                  </div>
                ),
              )}
            </div>
          )}

          {/* SOAP summary (when editor is collapsed and data exists) */}
          {!showSoapEditor && soapData.assessment && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
              <span className="font-medium text-gray-600 dark:text-gray-300">Assessment: </span>
              {soapData.assessment}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
