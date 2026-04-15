import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { CollapsibleSection } from '../../../components/shared/collapsible-section';
import { ChipSelector } from '../../../components/shared/chip-selector';

const FOLLOWUP_OPTIONS = ['3 days', '1 week', '2 weeks', '1 month', '3 months', 'SOS'];
const TEMPLATE_ADVICE = [
  'Adequate rest and hydration',
  'Take medications as prescribed',
  'Return if symptoms worsen',
  'Avoid heavy meals, take light diet',
  'Avoid strenuous activities',
  'Complete the full course of antibiotics',
  'Monitor temperature; visit ER if fever >103°F',
  'Keep wound clean and dry',
];

interface AdviceSectionProps {
  followUp: string;
  onFollowUpChange: (value: string) => void;
  advice: string;
  onAdviceChange: (value: string) => void;
}

export function AdviceSection({ followUp, onFollowUpChange, advice, onAdviceChange }: AdviceSectionProps) {
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  const toggleTemplate = (template: string) => {
    const next = selectedTemplates.includes(template)
      ? selectedTemplates.filter((t) => t !== template)
      : [...selectedTemplates, template];
    setSelectedTemplates(next);
    const templateBlock = next.join('\n');
    const custom = advice.split('\n').filter((l) => !TEMPLATE_ADVICE.includes(l.trim())).filter(Boolean).join('\n');
    onAdviceChange([templateBlock, custom].filter(Boolean).join('\n'));
  };

  return (
    <CollapsibleSection id="section-advice" title="Advice & Follow-up" icon={<ClipboardCheck style={{ width: 20, height: 20 }} />} defaultOpen={false}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        <Label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Follow-up</Label>
        <ChipSelector options={FOLLOWUP_OPTIONS} value={followUp} onChange={onFollowUpChange} allowCustom customPlaceholder="Custom..." />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <Label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Quick Advice Templates</Label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
          {TEMPLATE_ADVICE.map((t) => (
            <button key={t} type="button" onClick={() => toggleTemplate(t)} style={{
              minHeight: 36, borderRadius: 'var(--radius-card)', border: '1px solid',
              padding: '0.25rem 0.625rem', fontSize: 'var(--font-size-xs)', fontWeight: 500,
              cursor: 'pointer', textAlign: 'left', transition: 'all var(--transition-fast)',
              ...(selectedTemplates.includes(t)
                ? { borderColor: 'var(--color-success-500)', background: 'var(--color-success-50)', color: 'var(--color-success-700)' }
                : { borderColor: 'var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-secondary)' }),
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <Label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Additional Advice</Label>
        <Textarea value={advice} onChange={(e) => onAdviceChange(e.target.value)} placeholder="Custom advice or instructions..." rows={3} />
      </div>
    </CollapsibleSection>
  );
}
