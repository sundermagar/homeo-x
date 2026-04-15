import React from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { DiagnosisSuggestion } from '../../../types/ai';

interface ClinicalDirectionSelectorProps {
  suggestions: DiagnosisSuggestion;
  onSelect: (name: string, icdCode: string) => void;
  isLoading?: boolean;
}

export function ClinicalDirectionSelector({ suggestions, onSelect, isLoading }: ClinicalDirectionSelectorProps) {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  const directions = React.useMemo(() => {
    const list: any[] = [];
    if (!suggestions) return list;
    if (suggestions.primaryDiagnosis) list.push({ ...suggestions.primaryDiagnosis, type: 'Primary', confidence: suggestions.confidence || 0.8 });
    if (suggestions.differentials && Array.isArray(suggestions.differentials)) {
      suggestions.differentials.forEach((diff) => {
        if (suggestions.primaryDiagnosis && diff.name === suggestions.primaryDiagnosis.name) return;
        list.push({ ...diff, type: 'Differential', confidence: 0.5 });
      });
    }
    return list.slice(0, 3);
  }, [suggestions]);

  if (directions.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-2xl)', border: '2px dashed var(--border-default)' }}>
        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--text-primary)', fontStyle: 'italic', margin: '0 0 0.5rem' }}>No specific clinical directions identified.</h3>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '0 0 1rem' }}>Proceeding to general consultation draft...</p>
        <Button onClick={() => onSelect('General Consultation', '')}>Continue</Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Select a clinical direction</h2>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>One decision. Details come after — just pick the direction.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {directions.map((dir, idx) => {
          const isSelected = selectedIndex === idx;
          return (
            <Card key={idx} onClick={() => setSelectedIndex(idx)} style={{ position: 'relative', cursor: 'pointer', transition: 'all 0.2s', border: `2px solid ${isSelected ? '#3B82F6' : 'var(--border-light)'}`, background: isSelected ? 'rgba(239,246,255,0.5)' : 'var(--bg-card)', boxShadow: isSelected ? '0 0 0 1px rgba(59,130,246,0.2)' : '' }}>
              <CardContent style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, border: '1px solid', ...(isSelected ? { background: '#3B82F6', borderColor: '#3B82F6', color: 'white' } : { background: 'var(--bg-surface-2)', borderColor: 'var(--border-default)', color: 'var(--text-disabled)' }) }}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  {isSelected && <CheckCircle2 style={{ width: 20, height: 20, color: '#3B82F6' }} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <h3 style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', lineHeight: 1.3, margin: 0, color: isSelected ? '#1D4ED8' : 'var(--text-primary)' }}>{dir.name}</h3>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.5, minHeight: '3rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
                    {dir.reasoning || `${dir.name} matched based on symptoms and clinical profile.`}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button disabled={selectedIndex === null || isLoading} onClick={() => { if (selectedIndex !== null) { const s = directions[selectedIndex]; onSelect(s.name, s.icdCode); } }} style={{ height: '2.75rem', padding: '0 2rem', background: '#2563EB', color: 'white', fontWeight: 700, borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', gap: '0.5rem' }}>
          {isLoading ? 'Processing...' : 'Proceed with this direction'}
          {!isLoading && <ArrowRight style={{ width: 16, height: 16 }} />}
        </Button>
      </div>
    </div>
  );
}
