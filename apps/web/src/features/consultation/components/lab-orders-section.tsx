import { useState } from 'react';
import { FlaskConical, X } from 'lucide-react';
import { CollapsibleSection } from '../../../components/shared/collapsible-section';
import { Input } from '../../../components/ui/input';

const COMMON_TESTS = [
  'CBC', 'LFT', 'RFT', 'HbA1c', 'Lipid Panel', 'TFT', 'Urine R/M',
  'CRP', 'ESR', 'Blood Sugar (F)', 'Blood Sugar (PP)', 'Chest X-Ray',
  'ECG', 'USG Abdomen', 'Stool R/M',
];

interface LabOrdersSectionProps {
  selectedTests: string[];
  onTestsChange: (tests: string[]) => void;
}

export function LabOrdersSection({ selectedTests, onTestsChange }: LabOrdersSectionProps) {
  const [customInput, setCustomInput] = useState('');

  const toggleTest = (test: string) => {
    if (selectedTests.includes(test)) {
      onTestsChange(selectedTests.filter((t) => t !== test));
    } else {
      onTestsChange([...selectedTests, test]);
    }
  };

  const addCustomTest = () => {
    const trimmed = customInput.trim();
    if (trimmed && !selectedTests.includes(trimmed)) {
      onTestsChange([...selectedTests, trimmed]);
      setCustomInput('');
    }
  };

  return (
    <CollapsibleSection
      id="section-lab"
      title="Lab Orders"
      subtitle={selectedTests.length > 0 ? `${selectedTests.length} test${selectedTests.length > 1 ? 's' : ''}` : undefined}
      icon={<FlaskConical className="h-5 w-5" />}
      defaultOpen={false}
    >
      {/* Selected tests */}
      {selectedTests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selectedTests.map((test) => (
            <span
              key={test}
              className="inline-flex items-center gap-1 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2.5 py-1 text-xs font-medium"
            >
              {test}
              <button
                type="button"
                onClick={() => onTestsChange(selectedTests.filter((t) => t !== test))}
                className="hover:text-red-500 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Quick-select chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {COMMON_TESTS.map((test) => (
          <button
            key={test}
            type="button"
            onClick={() => toggleTest(test)}
            className={`min-h-[36px] rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
              selectedTests.includes(test)
                ? 'border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-600'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
            }`}
          >
            {test}
          </button>
        ))}
      </div>

      {/* Custom test input */}
      <div className="flex gap-2">
        <Input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Other test..."
          className="text-sm flex-1"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTest(); } }}
        />
        <button
          type="button"
          onClick={addCustomTest}
          disabled={!customInput.trim()}
          className="shrink-0 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </CollapsibleSection>
  );
}
