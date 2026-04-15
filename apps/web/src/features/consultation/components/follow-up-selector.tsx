import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';

interface FollowUpSelectorProps {
  followUp: string; onFollowUpChange: (value: string) => void;
  advice: string; onAdviceChange: (value: string) => void;
}

const FOLLOW_UP_OPTIONS = [
  { label: '3 days', value: '3 days' }, { label: '1 week', value: '1 week' },
  { label: '2 weeks', value: '2 weeks' }, { label: '1 month', value: '1 month' },
  { label: '3 months', value: '3 months' }, { label: 'SOS', value: 'SOS / As needed' },
];

const ADVICE_TEMPLATES = [
  { label: 'Rest',               text: 'Take adequate rest. Avoid strenuous physical activity.' },
  { label: 'Hydration',          text: 'Drink plenty of fluids (at least 2-3 liters of water daily).' },
  { label: 'Med compliance',     text: 'Take all medications as prescribed. Do not skip doses.' },
  { label: 'Diet',               text: 'Follow a balanced diet. Avoid oily, spicy, and processed foods.' },
  { label: 'Activity restriction', text: 'Avoid heavy lifting and intense exercise for the advised period.' },
  { label: 'Antibiotics',        text: 'Complete the full course of antibiotics even if symptoms improve.' },
  { label: 'Fever monitoring',   text: 'Monitor temperature. If fever persists beyond 3 days or exceeds 103°F, visit immediately.' },
  { label: 'Wound care',         text: 'Keep the wound clean and dry. Change dressing daily.' },
];

const chipActive   = { background: 'var(--color-success-500)', color: 'white', borderColor: 'var(--color-success-600)', boxShadow: 'var(--shadow-xs)' };
const chipInactive = { background: 'var(--bg-card)', color: 'var(--text-secondary)', borderColor: 'var(--border-default)' };

export function FollowUpSelector({ followUp, onFollowUpChange, advice, onAdviceChange }: FollowUpSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCustomAdvice, setShowCustomAdvice] = useState(false);
  const adviceCount = advice ? advice.split('\n').filter(Boolean).length : 0;

  const toggleAdvice = (template: (typeof ADVICE_TEMPLATES)[0]) => {
    const lines = advice.split('\n').filter(Boolean);
    const exists = lines.some((l) => l.includes(template.text));
    onAdviceChange(exists ? lines.filter((l) => !l.includes(template.text)).join('\n') : advice ? `${advice}\n${template.text}` : template.text);
  };
  const isAdviceActive = (tpl: (typeof ADVICE_TEMPLATES)[0]) => advice.includes(tpl.text);

  return (
    <Card style={{ overflow: 'hidden', transition: 'all 0.3s' }}>
      <button type="button" onClick={() => setIsExpanded(!isExpanded)} style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', transition: 'background var(--transition-fast)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarDays style={{ width: 16, height: 16, color: followUp || adviceCount > 0 ? 'var(--color-success-500)' : 'var(--text-tertiary)' }} />
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>Follow-up &amp; Advice</span>
          {!isExpanded && (followUp || adviceCount > 0) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginLeft: '0.5rem' }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border-strong)', display: 'inline-block' }} />
              {followUp && <Badge variant="outline">{followUp}</Badge>}
              {adviceCount > 0 && <Badge variant="outline">{adviceCount} advice</Badge>}
            </div>
          )}
        </div>
        {isExpanded ? <ChevronUp style={{ width: 16, height: 16, color: 'var(--text-tertiary)' }} /> : <ChevronDown style={{ width: 16, height: 16, color: 'var(--text-tertiary)' }} />}
      </button>

      {isExpanded && (
        <CardContent style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Schedule Follow-up</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {FOLLOW_UP_OPTIONS.map((opt) => (
                <button key={opt.value} type="button" onClick={() => onFollowUpChange(followUp === opt.value ? '' : opt.value)} style={{ borderRadius: 'var(--radius-full)', padding: '0.25rem 0.75rem', fontSize: 'var(--font-size-xs)', fontWeight: 500, border: '1px solid', cursor: 'pointer', transition: 'all var(--transition-fast)', ...(followUp === opt.value ? chipActive : chipInactive) }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Clinical Advice</span>
              <button type="button" onClick={() => setShowCustomAdvice(!showCustomAdvice)} style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-success-600)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {showCustomAdvice ? 'Hide Custom' : '+ Custom Advice'}
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {ADVICE_TEMPLATES.map((tpl) => (
                <button key={tpl.label} type="button" onClick={() => toggleAdvice(tpl)} style={{ borderRadius: 'var(--radius-full)', padding: '0.25rem 0.625rem', fontSize: 'var(--font-size-xs)', fontWeight: 500, border: '1px solid', cursor: 'pointer', transition: 'all var(--transition-fast)', ...(isAdviceActive(tpl) ? { background: 'var(--color-primary-600)', color: 'white', borderColor: 'var(--color-primary-700)', boxShadow: 'var(--shadow-xs)' } : chipInactive) }}>
                  {tpl.label}
                </button>
              ))}
            </div>
            {showCustomAdvice && (
              <Textarea value={advice} onChange={(e) => onAdviceChange(e.target.value)} placeholder="Type specific advice here..." rows={3} style={{ fontSize: 'var(--font-size-xs)', resize: 'none', background: 'var(--bg-surface-2)' }} />
            )}
            {advice && !showCustomAdvice && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
                {advice.split('\n').filter(Boolean).map((line, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem', borderRadius: 'var(--radius-card)', background: 'rgba(239,246,255,0.5)', border: '1px solid rgba(191,219,254,0.5)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary-500)', marginTop: '0.375rem', flexShrink: 0 }} />
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, fontStyle: 'italic', margin: 0 }}>{line.trim().replace(/^[•\-\*]\s*/, '')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
