import { useState, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Stethoscope,
  ClipboardList,
  FlaskConical,
  Heart,
  CalendarCheck,
  ShieldAlert,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { AiConfidenceBadge } from './ai-confidence-badge';
import type { SoapSuggestion } from '../../../types/ai';
import type { LiveExtraction } from './ai-capture-module';

// ─── Types ───

type CardStatus = 'empty' | 'loading' | 'ready' | 'accepted' | 'dismissed';

interface InsightCard {
  id: string;
  title: string;
  icon: React.ElementType;
  badgeColor: string;
  content: string[];
  confidence: number;
  status: CardStatus;
}

interface AIInsightCardsProps {
  soapSuggestion: SoapSuggestion | null;
  liveExtraction: LiveExtraction | null;
  isProcessing: boolean;
  clinicCategory: 'PROTOCOL' | 'RISK';
  onAcceptDiagnosis?: (assessment: string, icdCodes: string) => void;
  onAcceptPlan?: (plan: string) => void;
  onAcceptLabs?: (labs: string[]) => void;
  onAcceptAdvice?: (advice: string) => void;
  onAcceptFollowUp?: (followUp: string) => void;
}

// ─── Helpers ───

function parseLifestyleAdvice(plan: string): string[] {
  const advice: string[] = [];
  const planLower = plan.toLowerCase();
  if (planLower.includes('diet') || planLower.includes('sodium') || planLower.includes('salt'))
    advice.push('Dietary modifications recommended');
  if (planLower.includes('exercise') || planLower.includes('walk') || planLower.includes('yoga'))
    advice.push('Regular physical activity advised');
  if (planLower.includes('monitor') || planLower.includes('bp') || planLower.includes('sugar'))
    advice.push('Regular self-monitoring');
  if (planLower.includes('stress') || planLower.includes('meditation') || planLower.includes('sleep'))
    advice.push('Stress management / sleep hygiene');
  if (planLower.includes('weight') || planLower.includes('bmi'))
    advice.push('Weight management');
  if (planLower.includes('smoking') || planLower.includes('alcohol'))
    advice.push('Cessation counseling');
  return advice;
}

function parseFollowUp(assessment: string, plan: string): string[] {
  const combined = `${assessment} ${plan}`.toLowerCase();
  const items: string[] = [];
  const followUpMatch = combined.match(/follow[- ]?up\s+(?:in|after)\s+(\d+\s*(?:days?|weeks?|months?))/i);
  if (followUpMatch) items.push(`Next visit: ${followUpMatch[1]}`);
  if (combined.includes('review') || combined.includes('reassess'))
    items.push('Clinical reassessment recommended');
  if (combined.includes('repeat') && (combined.includes('test') || combined.includes('lab')))
    items.push('Repeat labs on follow-up');
  if (items.length === 0 && assessment) items.push('Schedule follow-up as clinically appropriate');
  return items;
}

// ─── Component ───

export function AIInsightCards({
  soapSuggestion,
  liveExtraction,
  isProcessing,
  clinicCategory,
  onAcceptDiagnosis,
  onAcceptPlan,
  onAcceptLabs,
  onAcceptAdvice,
  onAcceptFollowUp,
}: AIInsightCardsProps) {
  const [acceptedCards, setAcceptedCards] = useState<Set<string>>(new Set());
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());

  const markAccepted = useCallback((id: string) => {
    setAcceptedCards((prev) => new Set(prev).add(id));
  }, []);

  const markDismissed = useCallback((id: string) => {
    setDismissedCards((prev) => new Set(prev).add(id));
  }, []);

  const cards = useMemo<InsightCard[]>(() => {
    const result: InsightCard[] = [];

    // 1. AI Diagnosis
    const diagContent: string[] = [];
    if (soapSuggestion?.assessment) diagContent.push(soapSuggestion.assessment);
    if (soapSuggestion?.icdCodes?.length) {
      diagContent.push(
        ...soapSuggestion.icdCodes.map((c) => `${c.code}: ${c.description}`),
      );
    }
    result.push({
      id: 'diagnosis',
      title: 'AI Diagnosis',
      icon: Stethoscope,
      badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      content: diagContent,
      confidence: soapSuggestion?.confidence ?? 0,
      status: acceptedCards.has('diagnosis')
        ? 'accepted'
        : dismissedCards.has('diagnosis')
          ? 'dismissed'
          : diagContent.length > 0
            ? 'ready'
            : isProcessing
              ? 'loading'
              : 'empty',
    });

    // 2. AI Action Plan
    const planLines = soapSuggestion?.plan
      ? soapSuggestion.plan
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
      : [];
    result.push({
      id: 'action-plan',
      title: 'AI Action Plan',
      icon: ClipboardList,
      badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
      content: planLines,
      confidence: soapSuggestion?.confidence ?? 0,
      status: acceptedCards.has('action-plan')
        ? 'accepted'
        : dismissedCards.has('action-plan')
          ? 'dismissed'
          : planLines.length > 0
            ? 'ready'
            : isProcessing
              ? 'loading'
              : 'empty',
    });

    // 3. AI Lab Tests
    const labs: string[] = [];
    if (liveExtraction?.suggestedLabs?.length) labs.push(...liveExtraction.suggestedLabs);
    result.push({
      id: 'lab-tests',
      title: 'AI Lab Tests',
      icon: FlaskConical,
      badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
      content: labs.length > 0 ? labs : [],
      confidence: labs.length > 0 ? 0.85 : 0,
      status: acceptedCards.has('lab-tests')
        ? 'accepted'
        : dismissedCards.has('lab-tests')
          ? 'dismissed'
          : labs.length > 0
            ? 'ready'
            : isProcessing
              ? 'loading'
              : 'empty',
    });

    // 4. AI Lifestyle Advice
    const lifestyleItems = soapSuggestion?.plan
      ? parseLifestyleAdvice(soapSuggestion.plan)
      : [];
    result.push({
      id: 'lifestyle',
      title: 'AI Lifestyle Advice',
      icon: Heart,
      badgeColor: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
      content: lifestyleItems,
      confidence: lifestyleItems.length > 0 ? 0.75 : 0,
      status: acceptedCards.has('lifestyle')
        ? 'accepted'
        : dismissedCards.has('lifestyle')
          ? 'dismissed'
          : lifestyleItems.length > 0
            ? 'ready'
            : isProcessing
              ? 'loading'
              : 'empty',
    });

    // 5. AI Follow-up Plan
    const followUpItems =
      soapSuggestion?.assessment || soapSuggestion?.plan
        ? parseFollowUp(soapSuggestion?.assessment ?? '', soapSuggestion?.plan ?? '')
        : [];
    result.push({
      id: 'follow-up',
      title: 'AI Follow-up Plan',
      icon: CalendarCheck,
      badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      content: followUpItems,
      confidence: followUpItems.length > 0 ? 0.7 : 0,
      status: acceptedCards.has('follow-up')
        ? 'accepted'
        : dismissedCards.has('follow-up')
          ? 'dismissed'
          : followUpItems.length > 0
            ? 'ready'
            : isProcessing
              ? 'loading'
              : 'empty',
    });

    // 6. AI Risk Analysis (RISK category only)
    if (clinicCategory === 'RISK') {
      const riskItems = liveExtraction?.riskFactors?.length
        ? liveExtraction.riskFactors.map(
            (r) => `${r.charAt(0).toUpperCase()}${r.slice(1)} — monitor closely`,
          )
        : [];
      result.push({
        id: 'risk-analysis',
        title: 'AI Risk Analysis',
        icon: ShieldAlert,
        badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        content: riskItems,
        confidence: riskItems.length > 0 ? 0.8 : 0,
        status: acceptedCards.has('risk-analysis')
          ? 'accepted'
          : dismissedCards.has('risk-analysis')
            ? 'dismissed'
            : riskItems.length > 0
              ? 'ready'
              : isProcessing
                ? 'loading'
                : 'empty',
      });
    }

    return result;
  }, [soapSuggestion, liveExtraction, isProcessing, clinicCategory, acceptedCards, dismissedCards]);

  // Filter out empty + dismissed cards
  const visibleCards = cards.filter((c) => c.status !== 'empty' && c.status !== 'dismissed');

  const handleAccept = useCallback(
    (card: InsightCard) => {
      markAccepted(card.id);
      switch (card.id) {
        case 'diagnosis':
          if (soapSuggestion) {
            const codes = soapSuggestion.icdCodes?.map((c) => c.code).join(', ') || '';
            onAcceptDiagnosis?.(soapSuggestion.assessment, codes);
          }
          break;
        case 'action-plan':
          if (soapSuggestion?.plan) onAcceptPlan?.(soapSuggestion.plan);
          break;
        case 'lab-tests':
          if (liveExtraction?.suggestedLabs) onAcceptLabs?.(liveExtraction.suggestedLabs);
          break;
        case 'lifestyle':
          onAcceptAdvice?.(card.content.join('. '));
          break;
        case 'follow-up':
          onAcceptFollowUp?.(card.content.join('. '));
          break;
      }
    },
    [soapSuggestion, liveExtraction, onAcceptDiagnosis, onAcceptPlan, onAcceptLabs, onAcceptAdvice, onAcceptFollowUp],
  );

  if (visibleCards.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-3.5 w-3.5 text-purple-500" />
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          AI Real-Time Insights
        </span>
      </div>

      {visibleCards.map((card) => {
        const Icon = card.icon;
        const isAccepted = card.status === 'accepted';
        const isLoading = card.status === 'loading';

        return (
          <Card
            key={card.id}
            className={`transition-all ${
              isAccepted
                ? 'border-teal-200 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-950/10 opacity-75'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <CardContent className="px-3 py-2.5">
              <div className="flex items-start gap-2">
                {/* Checkbox area */}
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                    isAccepted
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {isAccepted && <Check className="h-3 w-3" />}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Title row */}
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${card.badgeColor}`}
                    >
                      <Icon className="h-3 w-3" />
                      {card.title}
                    </span>
                    {card.confidence > 0 && !isAccepted && (
                      <AiConfidenceBadge confidence={card.confidence} />
                    )}
                  </div>

                  {/* Content */}
                  {isLoading ? (
                    <div className="flex items-center gap-2 py-1">
                      <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
                      <span className="text-xs text-gray-400">Analyzing...</span>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {card.content.map((item, idx) => (
                        <p
                          key={idx}
                          className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed"
                        >
                          {card.content.length > 1 ? `• ${item}` : item}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Accept / Dismiss buttons */}
                {card.status === 'ready' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px] text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/30"
                      onClick={() => handleAccept(card)}
                    >
                      Accept
                    </Button>
                    <button
                      type="button"
                      onClick={() => markDismissed(card.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {isAccepted && (
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium shrink-0">
                    Accepted
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
