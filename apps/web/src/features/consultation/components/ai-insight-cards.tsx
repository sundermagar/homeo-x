import { useState, useMemo, useCallback } from 'react';
import { Sparkles, Stethoscope, ClipboardList, FlaskConical, Heart, CalendarCheck, ShieldAlert, Check, X, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { AiConfidenceBadge } from './ai-confidence-badge';
import type { SoapSuggestion } from '../../../types/ai';
import type { LiveExtraction } from './ai-capture-module';

type CardStatus = 'empty' | 'loading' | 'ready' | 'accepted' | 'dismissed';
interface InsightCard { id: string; title: string; icon: React.ElementType; badgeStyle: React.CSSProperties; content: string[]; confidence: number; status: CardStatus; }
interface AIInsightCardsProps {
  soapSuggestion: SoapSuggestion | null; liveExtraction: LiveExtraction | null;
  isProcessing: boolean; clinicCategory: 'PROTOCOL' | 'RISK';
  onAcceptDiagnosis?: (assessment: string, icdCodes: string) => void;
  onAcceptPlan?: (plan: string) => void; onAcceptLabs?: (labs: string[]) => void;
  onAcceptAdvice?: (advice: string) => void; onAcceptFollowUp?: (followUp: string) => void;
}

function parseLifestyleAdvice(plan: string): string[] {
  const l = plan.toLowerCase(); const advice: string[] = [];
  if (l.includes('diet') || l.includes('sodium') || l.includes('salt')) advice.push('Dietary modifications recommended');
  if (l.includes('exercise') || l.includes('walk') || l.includes('yoga')) advice.push('Regular physical activity advised');
  if (l.includes('monitor') || l.includes('bp') || l.includes('sugar')) advice.push('Regular self-monitoring');
  if (l.includes('stress') || l.includes('meditation') || l.includes('sleep')) advice.push('Stress management / sleep hygiene');
  if (l.includes('weight') || l.includes('bmi')) advice.push('Weight management');
  if (l.includes('smoking') || l.includes('alcohol')) advice.push('Cessation counseling');
  return advice;
}

function parseFollowUp(assessment: string, plan: string): string[] {
  const combined = `${assessment} ${plan}`.toLowerCase(); const items: string[] = [];
  const m = combined.match(/follow[- ]?up\s+(?:in|after)\s+(\d+\s*(?:days?|weeks?|months?))/i);
  if (m) items.push(`Next visit: ${m[1]}`);
  if (combined.includes('review') || combined.includes('reassess')) items.push('Clinical reassessment recommended');
  if (combined.includes('repeat') && (combined.includes('test') || combined.includes('lab'))) items.push('Repeat labs on follow-up');
  if (items.length === 0 && assessment) items.push('Schedule follow-up as clinically appropriate');
  return items;
}

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  diagnosis:      { background: '#DBEAFE', color: '#1E3A8A' },
  'action-plan':  { background: '#EDE9FE', color: '#4C1D95' },
  'lab-tests':    { background: '#D1FAE5', color: '#065F46' },
  lifestyle:      { background: '#FCE7F3', color: '#831843' },
  'follow-up':    { background: '#FEF3C7', color: '#92400E' },
  'risk-analysis':{ background: '#FEE2E2', color: '#7F1D1D' },
};

export function AIInsightCards({ soapSuggestion, liveExtraction, isProcessing, clinicCategory, onAcceptDiagnosis, onAcceptPlan, onAcceptLabs, onAcceptAdvice, onAcceptFollowUp }: AIInsightCardsProps) {
  const [acceptedCards, setAcceptedCards] = useState<Set<string>>(new Set());
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());
  const markAccepted = useCallback((id: string) => setAcceptedCards(prev => new Set(prev).add(id)), []);
  const markDismissed = useCallback((id: string) => setDismissedCards(prev => new Set(prev).add(id)), []);

  const status = (id: string, content: string[]): CardStatus =>
    acceptedCards.has(id) ? 'accepted' : dismissedCards.has(id) ? 'dismissed' : content.length > 0 ? 'ready' : isProcessing ? 'loading' : 'empty';

  const cards = useMemo<InsightCard[]>(() => {
    const planLines = soapSuggestion?.plan ? soapSuggestion.plan.split('\n').map(l => l.trim()).filter(Boolean) : [];
    const diagContent = [...(soapSuggestion?.assessment ? [soapSuggestion.assessment] : []), ...(soapSuggestion?.icdCodes?.map(c => `${c.code}: ${c.description}`) ?? [])];
    const labs = liveExtraction?.suggestedLabs?.length ? [...liveExtraction.suggestedLabs] : [];
    const lifestyle = soapSuggestion?.plan ? parseLifestyleAdvice(soapSuggestion.plan) : [];
    const followUp = soapSuggestion?.assessment || soapSuggestion?.plan ? parseFollowUp(soapSuggestion?.assessment ?? '', soapSuggestion?.plan ?? '') : [];

    const result: InsightCard[] = [
      { id: 'diagnosis',   title: 'AI Diagnosis',        icon: Stethoscope,   badgeStyle: BADGE_STYLES['diagnosis'],   content: diagContent, confidence: soapSuggestion?.confidence ?? 0, status: status('diagnosis',   diagContent) },
      { id: 'action-plan', title: 'AI Action Plan',      icon: ClipboardList, badgeStyle: BADGE_STYLES['action-plan'], content: planLines,   confidence: soapSuggestion?.confidence ?? 0, status: status('action-plan', planLines) },
      { id: 'lab-tests',   title: 'AI Lab Tests',        icon: FlaskConical,  badgeStyle: BADGE_STYLES['lab-tests'],   content: labs,        confidence: labs.length > 0 ? 0.85 : 0,       status: status('lab-tests',   labs) },
      { id: 'lifestyle',   title: 'AI Lifestyle Advice', icon: Heart,         badgeStyle: BADGE_STYLES['lifestyle'],   content: lifestyle,   confidence: lifestyle.length > 0 ? 0.75 : 0,   status: status('lifestyle',   lifestyle) },
      { id: 'follow-up',   title: 'AI Follow-up Plan',   icon: CalendarCheck, badgeStyle: BADGE_STYLES['follow-up'],   content: followUp,    confidence: followUp.length > 0 ? 0.7 : 0,     status: status('follow-up',   followUp) },
    ];
    if (clinicCategory === 'RISK') {
      const riskItems = liveExtraction?.riskFactors?.length ? liveExtraction.riskFactors.map(r => `${r.charAt(0).toUpperCase()}${r.slice(1)} — monitor closely`) : [];
      result.push({ id: 'risk-analysis', title: 'AI Risk Analysis', icon: ShieldAlert, badgeStyle: BADGE_STYLES['risk-analysis'], content: riskItems, confidence: riskItems.length > 0 ? 0.8 : 0, status: status('risk-analysis', riskItems) });
    }
    return result;
  }, [soapSuggestion, liveExtraction, isProcessing, clinicCategory, acceptedCards, dismissedCards]);

  const visibleCards = cards.filter(c => c.status !== 'empty' && c.status !== 'dismissed');

  const handleAccept = useCallback((card: InsightCard) => {
    markAccepted(card.id);
    if (card.id === 'diagnosis' && soapSuggestion) onAcceptDiagnosis?.(soapSuggestion.assessment, soapSuggestion.icdCodes?.map(c => c.code).join(', ') || '');
    else if (card.id === 'action-plan' && soapSuggestion?.plan) onAcceptPlan?.(soapSuggestion.plan);
    else if (card.id === 'lab-tests' && liveExtraction?.suggestedLabs) onAcceptLabs?.(liveExtraction.suggestedLabs);
    else if (card.id === 'lifestyle') onAcceptAdvice?.(card.content.join('. '));
    else if (card.id === 'follow-up') onAcceptFollowUp?.(card.content.join('. '));
  }, [soapSuggestion, liveExtraction, onAcceptDiagnosis, onAcceptPlan, onAcceptLabs, onAcceptAdvice, onAcceptFollowUp]);

  if (visibleCards.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <Sparkles style={{ width: 14, height: 14, color: '#8B5CF6' }} />
        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Real-Time Insights</span>
      </div>
      {visibleCards.map((card) => {
        const Icon = card.icon;
        const isAccepted = card.status === 'accepted';
        const isLoading  = card.status === 'loading';
        return (
          <Card key={card.id} style={{ transition: 'all 0.2s', ...(isAccepted ? { borderColor: 'var(--color-success-200)', background: 'rgba(240,253,244,0.3)', opacity: 0.75 } : {}) }}>
            <CardContent style={{ padding: '0.625rem 0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                {/* Checkbox */}
                <div style={{ width: 20, height: 20, borderRadius: 4, border: '1px solid', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', ...(isAccepted ? { background: 'var(--color-success-600)', borderColor: 'var(--color-success-600)', color: 'white' } : { borderColor: 'var(--border-strong)' }) }}>
                  {isAccepted && <Check style={{ width: 12, height: 12 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-full)', ...card.badgeStyle }}>
                      <Icon style={{ width: 12, height: 12 }} />{card.title}
                    </span>
                    {card.confidence > 0 && !isAccepted && <AiConfidenceBadge confidence={card.confidence} />}
                  </div>
                  {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
                      <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite', color: 'var(--text-disabled)' }} />
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-disabled)' }}>Analyzing...</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {card.content.map((item, idx) => (
                        <p key={idx} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                          {card.content.length > 1 ? `• ${item}` : item}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                {card.status === 'ready' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                    <Button size="sm" variant="ghost" onClick={() => handleAccept(card)} style={{ height: '1.5rem', padding: '0 0.5rem', fontSize: 10, color: 'var(--color-success-600)' }}>Accept</Button>
                    <button type="button" onClick={() => markDismissed(card.id)} style={{ padding: 4, color: 'var(--text-disabled)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  </div>
                )}
                {isAccepted && <span style={{ fontSize: 10, color: 'var(--color-success-600)', fontWeight: 500, flexShrink: 0 }}>Accepted</span>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
