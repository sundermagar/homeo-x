import { useState, useCallback, useEffect } from 'react';
import { Pill, Plus, X, Sparkles, Copy, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
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
  showPotencySelector?: boolean; showDosageChips?: boolean; showFrequencyChips?: boolean;
  showRouteChips?: boolean; showTitrationFields?: boolean; showTrendGraphs?: boolean;
  showRemedySelector?: boolean; showRepeatPlanShortcut?: boolean; prescriptionLabel?: string;
}
interface PrescriptionTemplateEngineProps {
  items: CreatePrescriptionItemInput[]; onItemsChange: (items: CreatePrescriptionItemInput[]) => void;
  notes: string; onNotesChange: (notes: string) => void;
  aiContext?: { diagnoses: string[]; patientAge?: number; patientGender?: string; patientWeight?: number; allergies?: string[]; specialty?: string; transcript?: string; };
  onTemplateUsed?: () => void; uiHints?: UiHints;
}

const FREQ_DEFAULT = ['OD', 'BD', 'TDS', 'QID', 'SOS', 'HS'];
const DUR_DEFAULT  = ['3 days', '5 days', '7 days', '10 days', '14 days', '30 days'];
const DOSE_DEFAULT = ['250mg', '500mg', '650mg', '1g'];
const ROUTE_DEFAULT= ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhaled'];
const POTENCY_CHIPS= ['6C', '12C', '30C', '200C', '1M', '10M', '50M', 'CM'];
const FORM_CHIPS   = ['Globules', 'Pills', 'Liquid', 'Trituration', 'Mother Tincture'];
const DOSE_REMEDY  = ['Single dose', '2 globules', '4 globules', '5 drops', '10 drops'];
const FREQ_REMEDY  = ['Single dose', 'OD', 'BD', 'SOS', 'Weekly'];
const DUR_REMEDY   = ['Single dose', '3 days', '7 days', '14 days', '30 days', 'Until next visit'];
const DEFAULT_HINTS: UiHints = { showPotencySelector: false, showDosageChips: true, showFrequencyChips: true, showRouteChips: true, showTitrationFields: false, showTrendGraphs: false, showRemedySelector: false, showRepeatPlanShortcut: false, prescriptionLabel: 'Prescription' };

type EntryMode = 'idle' | 'ai-template' | 'custom';

function ChipButton({ label, active, onClick, variant = 'default' }: { label: string; active: boolean; onClick: () => void; variant?: 'default' | 'purple'; }) {
  const activeStyle: React.CSSProperties = variant === 'purple' ? { background: '#EDE9FE', color: '#4C1D95', borderColor: '#C4B5FD' } : { background: 'var(--color-success-100)', color: 'var(--color-success-800)', borderColor: 'var(--color-success-300)' };
  const inactiveStyle: React.CSSProperties = { background: 'var(--bg-surface-2)', color: 'var(--text-tertiary)', borderColor: 'var(--border-default)' };
  return (
    <button type="button" onClick={onClick} style={{ borderRadius: 'var(--radius-full)', padding: '0.125rem 0.625rem', fontSize: 'var(--font-size-xs)', fontWeight: 500, border: '1px solid', cursor: 'pointer', transition: 'all var(--transition-fast)', boxShadow: active ? 'var(--shadow-xs)' : 'none', ...(active ? activeStyle : inactiveStyle) }}>
      {label}
    </button>
  );
}

export function PrescriptionTemplateEngine({ items, onItemsChange, notes, onNotesChange, aiContext, onTemplateUsed, uiHints }: PrescriptionTemplateEngineProps) {
  const [mode, setMode] = useState<EntryMode>('idle');
  const [aiSuggestion, setAiSuggestion] = useState<PrescriptionSuggestion | null>(null);
  const [interactions, setInteractions] = useState<DrugInteractionWarning[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const hints = { ...DEFAULT_HINTS, ...uiHints };
  const aiSuggest = useAiSuggestPrescription();
  const aiFeedback = useAiFeedback();
  const checkDDI = useCheckInteractions();

  useEffect(() => {
    const names = items.map(i => i.medicationName).filter(Boolean);
    if (names.length >= 2) checkDDI.mutate(names, { onSuccess: r => setInteractions(r || []) });
    else setInteractions([]);
  }, [items.map(i => i.medicationName).join(',')]);

  const handleAiSuggest = useCallback(() => {
    if (!aiContext || aiContext.diagnoses.length === 0) return;
    aiSuggest.mutate({ ...aiContext, currentMedications: items.map(i => i.medicationName).filter(Boolean) }, { onSuccess: suggestion => { setAiSuggestion(suggestion); setMode('ai-template'); } });
  }, [aiContext, aiSuggest]);

  const handleApplyTemplate = useCallback(() => {
    if (!aiSuggestion) return;
    onItemsChange([...items, ...aiSuggestion.medications.map((med: MedicationSuggestion) => ({ medicationName: med.medicationName, genericName: med.genericName || '', dosage: med.dosage || '', frequency: med.frequency || '', duration: med.duration || '', route: med.route || 'Oral', instructions: med.instructions || '' }))]);
    onTemplateUsed?.();
    if (aiSuggestion.auditLogId) aiFeedback.mutate({ auditLogId: aiSuggestion.auditLogId, action: 'accepted' });
    setMode('idle'); setAiSuggestion(null);
  }, [aiSuggestion, onItemsChange, aiFeedback, onTemplateUsed]);

  const handleDismissTemplate = useCallback(() => {
    if (aiSuggestion?.auditLogId) aiFeedback.mutate({ auditLogId: aiSuggestion.auditLogId, action: 'rejected' });
    setAiSuggestion(null); setMode('idle');
  }, [aiSuggestion, aiFeedback]);

  const addEmptyItem = useCallback(() => {
    onItemsChange([...items, { medicationName: '', genericName: '', dosage: '', frequency: '', duration: '', route: hints.showRouteChips ? 'Oral' : '', instructions: '' }]);
    setMode('custom');
  }, [items, onItemsChange, hints.showRouteChips]);

  const updateItem = useCallback((index: number, field: keyof CreatePrescriptionItemInput, value: string) => {
    const updated = [...items]; updated[index] = { ...updated[index], [field]: value }; onItemsChange(updated);
  }, [items, onItemsChange]);

  const removeItem = useCallback((index: number) => onItemsChange(items.filter((_, i) => i !== index)), [items, onItemsChange]);

  return (
    <Card id="section-rx">
      <CardContent style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Pill style={{ width: 16, height: 16, color: 'var(--text-tertiary)' }} />
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>{hints.prescriptionLabel || 'Prescription'}</span>
            {items.length > 0 && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-disabled)' }}>({items.filter(i => i.medicationName).length} meds)</span>}
          </div>
          {items.length > 0 && <button type="button" onClick={() => setShowNotes(!showNotes)} style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color var(--transition-fast)' }}>{showNotes ? 'Hide' : 'Add'} notes</button>}
        </div>

        {interactions.length > 0 && <DrugInteractionAlert interactions={interactions} />}

        {items.length === 0 && mode === 'idle' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {aiContext && aiContext.diagnoses.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleAiSuggest} disabled={aiSuggest.isPending} style={{ height: '2rem', fontSize: 'var(--font-size-xs)', color: '#7C3AED', borderColor: '#DDD6FE' }}>
                <Sparkles style={{ width: 14, height: 14, marginRight: 4 }} />{aiSuggest.isPending ? 'Generating...' : 'AI Template'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={addEmptyItem} style={{ height: '2rem', fontSize: 'var(--font-size-xs)' }}>
              <Plus style={{ width: 14, height: 14, marginRight: 4 }} />{hints.showRemedySelector ? 'Add Remedy' : 'Custom Prescription'}
            </Button>
          </div>
        )}

        {mode === 'ai-template' && aiSuggestion && (
          <div style={{ borderRadius: 'var(--radius-card)', border: '1px solid #DDD6FE', background: 'rgba(245,243,255,0.5)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles style={{ width: 16, height: 16, color: '#8B5CF6' }} />
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: '#4C1D95' }}>Suggested Prescription</span>
              <AiConfidenceBadge confidence={aiSuggestion.confidence} />
            </div>
            {aiSuggestion.allergyWarnings?.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', borderRadius: 'var(--radius-card)', background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '0.5rem 0.75rem' }}>
                <AlertTriangle style={{ width: 16, height: 16, color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 'var(--font-size-xs)', color: '#991B1B' }}>{aiSuggestion.allergyWarnings.join('; ')}</div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {aiSuggestion.medications.map((med, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: 'var(--radius-card)', background: 'var(--bg-card)', border: '1px solid #EDE9FE', padding: '0.5rem 0.75rem' }}>
                  <Pill style={{ width: 14, height: 14, color: '#A78BFA', flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                      {med.medicationName}{med.genericName && <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: 4 }}>({med.genericName})</span>}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{[med.dosage, med.frequency, med.duration, med.route].filter(Boolean).join(' · ')}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button size="sm" onClick={handleApplyTemplate} style={{ height: '1.75rem', fontSize: 'var(--font-size-xs)', background: '#7C3AED', color: 'white' }}><Copy style={{ width: 12, height: 12, marginRight: 4 }} /> Use Template</Button>
              <Button size="sm" variant="ghost" onClick={handleDismissTemplate} style={{ height: '1.75rem', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Dismiss</Button>
            </div>
          </div>
        )}

        {items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.map((item, index) => <MedicationCard key={index} item={item} index={index} onUpdate={updateItem} onRemove={removeItem} uiHints={hints} />)}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <Button variant="outline" size="sm" onClick={addEmptyItem} style={{ height: '1.75rem', fontSize: 'var(--font-size-xs)' }}>
                <Plus style={{ width: 12, height: 12, marginRight: 4 }} />{hints.showRemedySelector ? 'Add Remedy' : 'Add Medication'}
              </Button>
              {aiContext && aiContext.diagnoses.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleAiSuggest} disabled={aiSuggest.isPending} style={{ height: '1.75rem', fontSize: 'var(--font-size-xs)', color: '#7C3AED', borderColor: '#DDD6FE' }}>
                  <Sparkles style={{ width: 12, height: 12, marginRight: 4 }} />{aiSuggest.isPending ? 'Generating...' : 'AI Suggest More'}
                </Button>
              )}
            </div>
          </div>
        )}

        {showNotes && <Input value={notes} onChange={e => onNotesChange(e.target.value)} placeholder="Prescription notes..." style={{ height: '2rem', fontSize: 'var(--font-size-xs)' }} />}
      </CardContent>
    </Card>
  );
}

function MedicationCard({ item, index, onUpdate, onRemove, uiHints }: { item: CreatePrescriptionItemInput; index: number; onUpdate: (index: number, field: keyof CreatePrescriptionItemInput, value: string) => void; onRemove: (index: number) => void; uiHints: UiHints; }) {
  const [expanded, setExpanded] = useState(!item.medicationName);
  const doseChips = uiHints.showPotencySelector ? DOSE_REMEDY : DOSE_DEFAULT;
  const freqChips = uiHints.showPotencySelector ? FREQ_REMEDY  : FREQ_DEFAULT;
  const durChips  = uiHints.showPotencySelector ? DUR_REMEDY   : DUR_DEFAULT;
  const subLabel = (label: string, variant: 'default' | 'purple' = 'default') => <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, color: variant === 'purple' ? '#8B5CF6' : 'var(--text-disabled)' }}>{label}</span>;

  return (
    <div style={{ borderRadius: 'var(--radius-card)', border: '1px solid var(--border-default)', background: 'var(--bg-card)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem' }}>
        <Pill style={{ width: 14, height: 14, color: 'var(--text-disabled)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {item.medicationName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--text-primary)' }}>{item.medicationName}</span>
              {item.dosage && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{item.dosage}</span>}
              {item.frequency && <span style={{ borderRadius: 4, background: 'var(--bg-surface-2)', padding: '0.125rem 0.375rem', fontSize: 10, fontWeight: 500, color: 'var(--text-secondary)' }}>{item.frequency}</span>}
              {item.duration && <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>{item.duration}</span>}
            </div>
          ) : <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-disabled)' }}>{uiHints.showRemedySelector ? 'New remedy' : 'New medication'}</span>}
        </div>
        <button type="button" onClick={() => setExpanded(!expanded)} style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
          {expanded ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
        </button>
        <button type="button" onClick={() => onRemove(index)} style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, transition: 'color var(--transition-fast)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-error-500)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}>
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {expanded && (
        <div style={{ padding: '0.625rem 0.75rem', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <Input value={item.medicationName} onChange={e => onUpdate(index, 'medicationName', e.target.value)} placeholder={uiHints.showRemedySelector ? 'Remedy name *' : 'Medication name *'} style={{ height: '2rem', fontSize: 'var(--font-size-xs)' }} autoFocus={!item.medicationName} />

          {uiHints.showPotencySelector && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {subLabel('Potency', 'purple')}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {POTENCY_CHIPS.map(p => <ChipButton key={p} label={p} active={item.dosage === p} onClick={() => onUpdate(index, 'dosage', item.dosage === p ? '' : p)} variant="purple" />)}
                <Input value={POTENCY_CHIPS.includes(item.dosage) ? '' : item.dosage} onChange={e => onUpdate(index, 'dosage', e.target.value)} placeholder="Other" style={{ height: '1.5rem', width: '4rem', fontSize: 11, padding: '0 0.5rem' }} />
              </div>
            </div>
          )}

          {uiHints.showPotencySelector && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {subLabel('Form', 'purple')}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {FORM_CHIPS.map(f => <ChipButton key={f} label={f} active={item.route === f} onClick={() => onUpdate(index, 'route', item.route === f ? '' : f)} variant="purple" />)}
              </div>
            </div>
          )}

          {uiHints.showDosageChips !== false && !uiHints.showPotencySelector && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {subLabel('Dosage')}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {doseChips.map(d => <ChipButton key={d} label={d} active={item.dosage === d} onClick={() => onUpdate(index, 'dosage', item.dosage === d ? '' : d)} />)}
                {item.dosage && !doseChips.includes(item.dosage) && <ChipButton label={item.dosage} active onClick={() => onUpdate(index, 'dosage', '')} />}
                <Input value={doseChips.includes(item.dosage) ? '' : item.dosage} onChange={e => onUpdate(index, 'dosage', e.target.value)} placeholder="Other" style={{ height: '1.5rem', width: '4rem', fontSize: 11, padding: '0 0.5rem' }} />
              </div>
            </div>
          )}

          {uiHints.showPotencySelector && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {subLabel('Dose')}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {DOSE_REMEDY.map(d => <ChipButton key={d} label={d} active={item.instructions === d} onClick={() => onUpdate(index, 'instructions', item.instructions === d ? '' : d)} />)}
              </div>
            </div>
          )}

          {uiHints.showFrequencyChips !== false && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {subLabel('Frequency')}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {freqChips.map(f => <ChipButton key={f} label={f} active={item.frequency === f} onClick={() => onUpdate(index, 'frequency', item.frequency === f ? '' : f)} />)}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {subLabel('Duration')}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {durChips.map(d => <ChipButton key={d} label={d} active={item.duration === d} onClick={() => onUpdate(index, 'duration', item.duration === d ? '' : d)} />)}
            </div>
          </div>

          {uiHints.showRouteChips !== false && !uiHints.showPotencySelector && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {subLabel('Route')}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {ROUTE_DEFAULT.map(r => <ChipButton key={r} label={r} active={item.route === r} onClick={() => onUpdate(index, 'route', item.route === r ? '' : r)} />)}
              </div>
            </div>
          )}

          {uiHints.showTitrationFields && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {subLabel('Titration Notes')}
              <Input value={item.instructions || ''} onChange={e => onUpdate(index, 'instructions', e.target.value)} placeholder="e.g. Start 2.5mg, titrate to 10mg over 4 weeks" style={{ height: '1.75rem', fontSize: 11, borderColor: '#FDBA74' }} />
            </div>
          )}

          {!uiHints.showTitrationFields && !uiHints.showPotencySelector && (
            <Input value={item.instructions || ''} onChange={e => onUpdate(index, 'instructions', e.target.value)} placeholder="Instructions (optional)" style={{ height: '1.75rem', fontSize: 11 }} />
          )}
        </div>
      )}
    </div>
  );
}
