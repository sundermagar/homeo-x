import { useState } from 'react';
import { FlaskConical, Plus, X, Sparkles } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';

interface LabQuickOrderProps {
  selectedTests: string[];
  onTestsChange: (tests: string[]) => void;
  /** AI-suggested tests based on diagnosis context */
  aiSuggestedTests?: string[];
}

const COMMON_TESTS = [
  'CBC',
  'LFT',
  'KFT',
  'Lipid Panel',
  'HbA1c',
  'TFT',
  'Urine R/M',
  'CRP',
  'ESR',
  'Blood Sugar (F)',
  'Blood Sugar (PP)',
  'Chest X-Ray',
  'ECG',
  'USG Abdomen',
];

export function LabQuickOrder({
  selectedTests,
  onTestsChange,
  aiSuggestedTests = [],
}: LabQuickOrderProps) {
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const toggle = (test: string) => {
    if (selectedTests.includes(test)) {
      onTestsChange(selectedTests.filter((t) => t !== test));
    } else {
      onTestsChange([...selectedTests, test]);
    }
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !selectedTests.includes(trimmed)) {
      onTestsChange([...selectedTests, trimmed]);
      setCustomInput('');
      setShowCustom(false);
    }
  };

  return (
    <Card id="section-lab">
      <CardContent className="px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Lab Orders
            </span>
            {selectedTests.length > 0 && (
              <span className="text-xs text-gray-400">
                ({selectedTests.length})
              </span>
            )}
          </div>
        </div>

        {/* AI suggested tests — highlighted */}
        {aiSuggestedTests.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Suggested based on diagnosis
            </p>
            <div className="flex flex-wrap gap-1.5">
              {aiSuggestedTests.map((test) => {
                const selected = selectedTests.includes(test);
                return (
                  <button
                    key={`ai-${test}`}
                    type="button"
                    onClick={() => toggle(test)}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors border ${
                      selected
                        ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700'
                        : 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40'
                    }`}
                  >
                    <Sparkles className="h-3 w-3" />
                    {test}
                    {selected && <X className="h-3 w-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Common tests — quick select chips */}
        <div className="flex flex-wrap gap-1.5">
          {COMMON_TESTS.map((test) => {
            const selected = selectedTests.includes(test);
            const isAiSuggested = aiSuggestedTests.includes(test);
            // Skip if already shown in AI section
            if (isAiSuggested) return null;
            return (
              <button
                key={test}
                type="button"
                onClick={() => toggle(test)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors border ${
                  selected
                    ? 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700'
                    : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {test}
                {selected && <X className="h-3 w-3 ml-0.5" />}
              </button>
            );
          })}

          {/* Custom tests in selected list */}
          {selectedTests
            .filter((t) => !COMMON_TESTS.includes(t) && !aiSuggestedTests.includes(t))
            .map((test) => (
              <button
                key={`custom-${test}`}
                type="button"
                onClick={() => toggle(test)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium bg-teal-100 text-teal-800 border border-teal-300 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700 transition-colors"
              >
                {test}
                <X className="h-3 w-3 ml-0.5" />
              </button>
            ))}

          {/* Add custom button / input */}
          {showCustom ? (
            <div className="flex items-center gap-1">
              <Input
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Test name"
                className="h-7 w-32 text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustom();
                  }
                  if (e.key === 'Escape') {
                    setShowCustom(false);
                    setCustomInput('');
                  }
                }}
              />
              <button
                type="button"
                onClick={addCustom}
                className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium"
              >
                Add
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Other
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
