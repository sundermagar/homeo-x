import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useCreditSummary } from '../hooks/use-credit-data';

interface CreditAlertBarProps {
  onAddCredits: () => void;
}

export function CreditAlertBar({ onAddCredits }: CreditAlertBarProps) {
  const { remaining, totalAllocated } = useCreditSummary();
  const percentageRemaining = ((remaining / totalAllocated) * 100).toFixed(0);

  return (
    <div className="cw-alert-banner">
      <div className="cw-alert-content">
        <AlertTriangle size={16} />
        <span>Credits running low — <strong>{percentageRemaining}% remaining.</strong> Top up to avoid service interruption.</span>
      </div>
      <button className="cw-alert-btn" onClick={onAddCredits}>
        Add now
      </button>
    </div>
  );
}
