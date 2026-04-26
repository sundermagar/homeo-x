import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { DiagnosisSuggestion } from '../../../types/ai';
import { cn } from '../../../lib/cn';

interface ClinicalDirectionSelectorProps {
  suggestions: DiagnosisSuggestion;
  onSelect: (name: string, icdCode: string) => void;
  isLoading?: boolean;
}

export function ClinicalDirectionSelector({
  suggestions,
  onSelect,
  isLoading,
}: ClinicalDirectionSelectorProps) {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  const directions = React.useMemo(() => {
    const list: any[] = [];
    if (!suggestions) return list;

    if (suggestions.primaryDiagnosis) {
      list.push({
        ...suggestions.primaryDiagnosis,
        type: 'Primary',
        confidence: suggestions.confidence || 0.8,
      });
    }
    
    if (suggestions.differentials && Array.isArray(suggestions.differentials)) {
      suggestions.differentials.forEach((diff) => {
        // Avoid duplicating primary
        if (suggestions.primaryDiagnosis && diff.name === suggestions.primaryDiagnosis.name) return;
        
        list.push({
          ...diff,
          type: 'Differential',
          confidence: 0.5,
        });
      });
    }
    
    console.log('[ClinicalDirectionSelector] Directions list:', list);
    return list.slice(0, 3);
  }, [suggestions]);

  if (directions.length === 0) {
    return (
      <div className="p-8 text-center bg-[#FAFAF8] rounded-xl border border-dashed border-[#E3E2DF]">
        <h3 className="text-[16px] font-bold text-[#0F0F0E] italic tracking-tight">No specific clinical directions identified.</h3>
        <p className="text-[13px] text-[#4A4A47] mt-2 font-medium">Proceeding to general consultation draft...</p>
        <button onClick={() => onSelect('General Consultation', '')} className="pp-btn-secondary mt-5 px-5 py-2">
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-1">
        <h2 className="text-[20px] font-bold text-[#0F0F0E] tracking-tight">Select a clinical direction</h2>
        <p className="text-[13px] font-medium text-[#4A4A47]">
          One decision. Details come after — just pick the direction.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {directions.map((dir, idx) => (
          <div
            key={idx}
            className={cn(
              "relative cursor-pointer transition-all duration-300 pp-card",
              selectedIndex === idx 
                ? "border-[#2563EB] bg-[#EFF6FF] ring-2 ring-[#BFDBFE]" 
                : "border-[#E3E2DF] hover:border-[#BFDBFE] hover:shadow-md bg-white"
            )}
            onClick={() => setSelectedIndex(idx)}
          >
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div className={cn(
                  "h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold border",
                  selectedIndex === idx 
                    ? "bg-[#2563EB] border-[#2563EB] text-white" 
                    : "bg-[#FAFAF8] border-[#E3E2DF] text-[#888786]"
                )}>
                  {String.fromCharCode(65 + idx)}
                </div>
                {selectedIndex === idx && (
                  <CheckCircle2 className="h-5 w-5 text-[#2563EB] animate-in zoom-in duration-300" />
                )}
              </div>

              <div className="space-y-1">
                <h3 className={cn(
                  "font-bold text-[15px] leading-tight tracking-tight",
                  selectedIndex === idx ? "text-[#1E3A8A]" : "text-[#0F0F0E]"
                )}>
                  {dir.name}
                </h3>
                <p className="text-[12px] font-medium text-[#4A4A47] line-clamp-3 min-h-[48px]">
                  {dir.reasoning || `${dir.name} matched based on symptoms and clinical profile.`}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <button
          disabled={selectedIndex === null || isLoading}
          onClick={() => {
            if (selectedIndex !== null) {
              const selected = directions[selectedIndex];
              onSelect(selected.name, selected.icdCode);
            }
          }}
          className={`pp-btn-primary px-8 h-11 text-[14px] flex items-center gap-2 ${
            selectedIndex === null || isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? 'Processing...' : 'Proceed with this direction'}
          {!isLoading && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
