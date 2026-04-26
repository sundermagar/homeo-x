import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';

interface FollowUpSelectorProps {
  followUp: string;
  onFollowUpChange: (value: string) => void;
  advice: string;
  onAdviceChange: (value: string) => void;
}

const FOLLOW_UP_OPTIONS = [
  { label: '3 days', value: '3 days' },
  { label: '1 week', value: '1 week' },
  { label: '2 weeks', value: '2 weeks' },
  { label: '1 month', value: '1 month' },
  { label: '3 months', value: '3 months' },
  { label: 'SOS', value: 'SOS / As needed' },
];

const ADVICE_TEMPLATES = [
  { label: 'Rest', text: 'Take adequate rest. Avoid strenuous physical activity.' },
  { label: 'Hydration', text: 'Drink plenty of fluids (at least 2-3 liters of water daily).' },
  { label: 'Med compliance', text: 'Take all medications as prescribed. Do not skip doses.' },
  { label: 'Diet', text: 'Follow a balanced diet. Avoid oily, spicy, and processed foods.' },
  { label: 'Activity restriction', text: 'Avoid heavy lifting and intense exercise for the advised period.' },
  { label: 'Antibiotics', text: 'Complete the full course of antibiotics even if symptoms improve.' },
  { label: 'Fever monitoring', text: 'Monitor temperature. If fever persists beyond 3 days or exceeds 103°F, visit immediately.' },
  { label: 'Wound care', text: 'Keep the wound clean and dry. Change dressing daily.' },
];

export function FollowUpSelector({
  followUp,
  onFollowUpChange,
  advice,
  onAdviceChange,
}: FollowUpSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCustomAdvice, setShowCustomAdvice] = useState(false);

  const adviceCount = advice ? advice.split('\n').filter(Boolean).length : 0;

  const toggleAdvice = (template: (typeof ADVICE_TEMPLATES)[0]) => {
    const lines = advice.split('\n').filter(Boolean);
    const exists = lines.some((l) => l.includes(template.text));
    if (exists) {
      const updated = lines.filter((l) => !l.includes(template.text)).join('\n');
      onAdviceChange(updated);
    } else {
      const updated = advice ? `${advice}\n${template.text}` : template.text;
      onAdviceChange(updated);
    }
  };

  const isAdviceActive = (template: (typeof ADVICE_TEMPLATES)[0]) =>
    advice.includes(template.text);

  return (
    <Card className="overflow-hidden transition-all duration-300">
      {/* Clickable Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CalendarDays className={`h-4 w-4 ${followUp || adviceCount > 0 ? 'text-teal-500' : 'text-gray-400'}`} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Follow-up & Advice
          </span>
          
          {/* Summary (if not expanded) */}
          {!isExpanded && (followUp || adviceCount > 0) && (
            <div className="flex items-center gap-1.5 ml-2">
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <div className="flex items-center gap-2">
                {followUp && (
                  <Badge variant="outline" className="h-5 text-[10px] bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-900/30 dark:text-teal-400">
                    {followUp}
                  </Badge>
                )}
                {adviceCount > 0 && (
                  <Badge variant="outline" className="h-5 text-[10px] bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400">
                    {adviceCount} advice
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <CardContent className="px-4 py-3 pt-0 animate-in fade-in slide-in-from-top-2 duration-200 space-y-4 border-t border-gray-100 dark:border-gray-800 mt-0">
          {/* Follow-up Section */}
          <div className="space-y-2 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Schedule Follow-up
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FOLLOW_UP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    onFollowUpChange(followUp === opt.value ? '' : opt.value)
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
                    followUp === opt.value
                      ? 'bg-teal-500 text-white border-teal-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advice templates Section */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Clinical Advice
              </span>
              <button
                type="button"
                onClick={() => setShowCustomAdvice(!showCustomAdvice)}
                className="text-[10px] font-bold text-teal-600 hover:underline"
              >
                {showCustomAdvice ? 'Hide Custom' : '+ Custom Advice'}
              </button>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              {ADVICE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => toggleAdvice(tpl)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors border ${
                    isAdviceActive(tpl)
                      ? 'bg-blue-500 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            {/* Custom textarea */}
            {(showCustomAdvice || (!adviceCount && !isExpanded)) && (
              <div className={`transition-all duration-300 ${showCustomAdvice ? 'opacity-100 mt-2' : 'opacity-0 h-0 overflow-hidden'}`}>
                <Textarea
                  value={advice}
                  onChange={(e) => onAdviceChange(e.target.value)}
                  placeholder="Type specific advice here..."
                  rows={3}
                  className="text-xs resize-none bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                />
              </div>
            )}

            {/* Selected advice preview (always show if not redundant) */}
            {advice && !showCustomAdvice && (
              <div className="mt-2 space-y-1">
                {advice.split('\n').filter(Boolean).map((line, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-900/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed italic">
                      {line.trim().replace(/^[•\-\*]\s*/, '')}
                    </p>
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
