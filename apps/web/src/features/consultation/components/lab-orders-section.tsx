import { useState } from 'react';
import { FlaskConical, X } from 'lucide-react';
import { CollapsibleSection } from '../../../components/shared/collapsible-section';
import { Input } from '../../../components/ui/input';

const COMMON_TESTS = [
  'CBC', 'LFT', 'RFT', 'HbA1c', 'Lipid Panel', 'TFT', 'Urine R/M',
  'CRP', 'ESR', 'Blood Sugar (F)', 'Blood Sugar (PP)', 'Chest X-Ray',
  'ECG', 'USG Abdomen', 'Stool R/M',
];

interface LabOrdersSectionProps { selectedTests: string[]; onTestsChange: (tests: string[]) => void; }

const chipActive   = { borderColor: 'var(--color-success-500)', background: 'var(--color-success-50)', color: 'var(--color-success-700)' };
const chipInactive = { borderColor: 'var(--border-default)', background: 'var(--bg-card)', color: 'var(--text-secondary)' };

export function LabOrdersSection({ selectedTests, onTestsChange }: LabOrdersSectionProps) {
  const [customInput, setCustomInput] = useState('');
  const toggle = (t: string) => onTestsChange(selectedTests.includes(t) ? selectedTests.filter(x => x !== t) : [...selectedTests, t]);
  const addCustom = () => { const t = customInput.trim(); if (t && !selectedTests.includes(t)) { onTestsChange([...selectedTests, t]); setCustomInput(''); } };

  return (
    <CollapsibleSection id="section-lab" title="Lab Orders" subtitle={selectedTests.length > 0 ? `${selectedTests.length} test${selectedTests.length > 1 ? 's' : ''}` : undefined} icon={<FlaskConical style={{ width: 20, height: 20 }} />} defaultOpen={false}>
      {selectedTests.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
          {selectedTests.map((test) => (
            <span key={test} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 'var(--radius-full)', background: 'var(--color-success-50)', color: 'var(--color-success-700)', padding: '0.25rem 0.625rem', fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>
              {test}
              <button type="button" onClick={() => onTestsChange(selectedTests.filter(t => t !== test))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, transition: 'color var(--transition-fast)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-error-500)')} onMouseLeave={e => (e.currentTarget.style.color = 'inherit')}>
                <X style={{ width: 12, height: 12 }} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
        {COMMON_TESTS.map((test) => (
          <button key={test} type="button" onClick={() => toggle(test)} style={{ minHeight: 36, borderRadius: 'var(--radius-card)', border: '1px solid', padding: '0.25rem 0.625rem', fontSize: 'var(--font-size-xs)', fontWeight: 500, cursor: 'pointer', transition: 'all var(--transition-fast)', ...(selectedTests.includes(test) ? chipActive : chipInactive) }}>
            {test}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Input value={customInput} onChange={e => setCustomInput(e.target.value)} placeholder="Other test..." style={{ flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} />
        <button type="button" onClick={addCustom} disabled={!customInput.trim()} style={{ flexShrink: 0, borderRadius: 'var(--radius-card)', border: '1px solid var(--border-default)', padding: '0.25rem 0.75rem', fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer', background: 'var(--bg-card)', transition: 'all var(--transition-fast)', opacity: customInput.trim() ? 1 : 0.4 }}>
          Add
        </button>
      </div>
    </CollapsibleSection>
  );
}
