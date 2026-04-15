import { ChevronRight } from 'lucide-react';
import './consultation-bottom-bar.css';

interface ConsultationBottomBarProps {
  onComplete: () => void;
  onSkipAction?: () => void;
  onSaveDraft: () => void;
  isCompleting: boolean;
  isSaving: boolean;
  completeLabel?: string;
}

export function ConsultationBottomBar({
  onComplete,
  onSkipAction,
  onSaveDraft: _onSaveDraft,
  isCompleting,
  isSaving,
  completeLabel = 'Review case →',
}: ConsultationBottomBarProps) {
  const isPrescriptionStage = completeLabel?.toLowerCase().includes('complete');

  const isGenerate = completeLabel?.toLowerCase().includes('generate prescription');
  const isWrapUp = completeLabel?.toLowerCase().includes('wrap up') || isPrescriptionStage;
  const isRepertorize = completeLabel?.includes('Repertorize');

  return (
    <div className="consult-bottom-bar">
      <div className="consult-bottom-bar__inner">
        <div className="consult-bottom-bar__spacer" />

        <div className="consult-bottom-bar__actions">
          {isRepertorize ? (
            <>
              <button onClick={onComplete} className="consult-bottom-bar__cta">
                Repertorize <ChevronRight className="consult-bottom-bar__chevron" style={{ width: 16, height: 16 }} />
              </button>
              <button onClick={onSkipAction} className="consult-bottom-bar__outline">
                Prescribe <ChevronRight style={{ width: 16, height: 16 }} />
              </button>
            </>
          ) : (
            <button
              onClick={onComplete}
              disabled={isCompleting || isSaving}
              className="consult-bottom-bar__cta"
            >
              {isCompleting ? (isGenerate ? 'GENERATING...' : 'PROCESSING...') : completeLabel}
              {!isCompleting && <ChevronRight className="consult-bottom-bar__chevron" style={{ width: 16, height: 16 }} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
