import { useState } from 'react';
import { FlaskConical, Plus, X, Sparkles } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';

interface LabQuickOrderProps { selectedTests: string[]; onTestsChange: (tests: string[]) => void; aiSuggestedTests?: string[]; }

const COMMON_TESTS = ['CBC', 'LFT', 'KFT', 'Lipid Panel', 'HbA1c', 'TFT', 'Urine R/M', 'CRP', 'ESR', 'Blood Sugar (F)', 'Blood Sugar (PP)', 'Chest X-Ray', 'ECG', 'USG Abdomen'];

const chipActive   = { bg: 'var(--color-success-100)', color: 'var(--color-success-800)', border: 'var(--color-success-300)' };
const chipInactive = { bg: 'var(--bg-surface-2)',      color: 'var(--text-secondary)',    border: 'var(--border-default)' };
const aiActive     = { bg: '#EDE9FE', color: '#4C1D95', border: '#C4B5FD' };
const aiInactive   = { bg: '#F5F3FF', color: '#5B21B6', border: '#DDD6FE' };

function chip(s: { bg: string; color: string; border: string }) {
  return { display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 'var(--radius-full)', padding: '0.25rem 0.625rem', fontSize: 'var(--font-size-xs)', fontWeight: 500, border: `1px solid ${s.border}`, background: s.bg, color: s.color, cursor: 'pointer', transition: 'all var(--transition-fast)' } as React.CSSProperties;
}

export function LabQuickOrder({ selectedTests, onTestsChange, aiSuggestedTests = [] }: LabQuickOrderProps) {
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const toggle = (t: string) => onTestsChange(selectedTests.includes(t) ? selectedTests.filter(x => x !== t) : [...selectedTests, t]);
  const addCustom = () => { const t = customInput.trim(); if (t && !selectedTests.includes(t)) { onTestsChange([...selectedTests, t]); setCustomInput(''); setShowCustom(false); } };

  return (
    <Card id="section-lab">
      <CardContent style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FlaskConical style={{ width: 16, height: 16, color: 'var(--text-tertiary)' }} />
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>Lab Orders</span>
          {selectedTests.length > 0 && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>({selectedTests.length})</span>}
        </div>

        {aiSuggestedTests.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#7C3AED', display: 'flex', alignItems: 'center', gap: 4, margin: 0 }}><Sparkles style={{ width: 12, height: 12 }} /> Suggested based on diagnosis</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {aiSuggestedTests.map(test => {
                const sel = selectedTests.includes(test);
                const s = sel ? aiActive : aiInactive;
                return (
                  <button key={`ai-${test}`} type="button" onClick={() => toggle(test)} style={chip(s)}>
                    <Sparkles style={{ width: 12, height: 12 }} />{test}{sel && <X style={{ width: 12, height: 12, marginLeft: 2 }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
          {COMMON_TESTS.map(test => {
            if (aiSuggestedTests.includes(test)) return null;
            const sel = selectedTests.includes(test);
            const s = sel ? chipActive : chipInactive;
            return <button key={test} type="button" onClick={() => toggle(test)} style={chip(s)}>{test}{sel && <X style={{ width: 12, height: 12, marginLeft: 2 }} />}</button>;
          })}
          {selectedTests.filter(t => !COMMON_TESTS.includes(t) && !aiSuggestedTests.includes(t)).map(test => (
            <button key={`custom-${test}`} type="button" onClick={() => toggle(test)} style={chip(chipActive)}>{test}<X style={{ width: 12, height: 12, marginLeft: 2 }} /></button>
          ))}
          {showCustom ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Input value={customInput} onChange={e => setCustomInput(e.target.value)} placeholder="Test name" style={{ height: '1.75rem', width: '8rem', fontSize: 'var(--font-size-xs)' }} autoFocus onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } if (e.key === 'Escape') { setShowCustom(false); setCustomInput(''); } }} />
              <button type="button" onClick={addCustom} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success-600)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Add</button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowCustom(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 'var(--radius-full)', padding: '0.25rem 0.625rem', fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--text-tertiary)', border: '1px dashed var(--border-default)', background: 'none', cursor: 'pointer', transition: 'all var(--transition-fast)' }}>
              <Plus style={{ width: 12, height: 12 }} /> Other
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
