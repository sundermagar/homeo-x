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
    let next: string[];
    if (selectedTemplates.includes(template)) {
      next = selectedTemplates.filter((t) => t !== template);
    } else {
      next = [...selectedTemplates, template];
    }
    setSelectedTemplates(next);
    // Rebuild advice from templates + any custom text after the template block
    const templateBlock = next.join('\n');
    const customLines = advice.split('\n').filter((l) => !TEMPLATE_ADVICE.includes(l.trim()));
    const custom = customLines.filter(Boolean).join('\n');
    onAdviceChange([templateBlock, custom].filter(Boolean).join('\n'));
  };

  return (
    <CollapsibleSection
      id="section-advice"
      title="Advice & Follow-up"
      icon={<ClipboardCheck className="h-5 w-5" />}
      defaultOpen={false}
    >
      {/* Follow-up duration chips */}
      <div className="space-y-2 mb-4">
        <Label className="text-xs text-gray-500 dark:text-gray-400">Follow-up</Label>
        <ChipSelector
          options={FOLLOWUP_OPTIONS}
          value={followUp}
          onChange={onFollowUpChange}
          allowCustom
          customPlaceholder="Custom..."
        />
      </div>

      {/* Template advice chips */}
      <div className="space-y-2 mb-3">
        <Label className="text-xs text-gray-500 dark:text-gray-400">Quick Advice Templates</Label>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATE_ADVICE.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTemplate(t)}
              className={`min-h-[36px] rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors text-left ${
                selectedTemplates.includes(t)
                  ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-600'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Free-text advice */}
      <div className="space-y-1">
        <Label className="text-xs text-gray-500 dark:text-gray-400">Additional Advice</Label>
        <Textarea
          value={advice}
          onChange={(e) => onAdviceChange(e.target.value)}
          placeholder="Custom advice or instructions..."
          rows={3}
          className="text-sm"
        />
      </div>
    </CollapsibleSection>
  );
}
