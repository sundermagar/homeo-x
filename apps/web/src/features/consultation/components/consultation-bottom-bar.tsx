import { ChevronRight, ChevronLeft } from 'lucide-react';

interface ConsultationBottomBarProps {
  onComplete: () => void;
  onBack?: () => void;
  onSkipAction?: () => void;
  onSaveDraft: () => void;
  isCompleting: boolean;
  isSaving: boolean;
  completeLabel?: string;
  backLabel?: string;
  showBack?: boolean;
}

export function ConsultationBottomBar({
  onComplete,
  onBack,
  onSkipAction: _onSkipAction,
  onSaveDraft: _onSaveDraft,
  isCompleting,
  isSaving,
  completeLabel = 'Review case →',
  backLabel = '← Back',
  showBack = false,
}: ConsultationBottomBarProps) {
  const isPrescriptionStage = completeLabel?.toLowerCase().includes('complete');

  return (
    <div className="sticky bottom-0 z-40 border-t border-[#E3E2DF] bg-white px-4 py-2.5 safe-area-bottom">
      <div className="flex items-center gap-2">
        {/* Back Button */}
        {showBack && onBack && (
          <button
            onClick={onBack}
            className="pp-btn-secondary h-10 px-4 group"
          >
            <ChevronLeft className="h-4 w-4 mr-1 transform group-hover:-translate-x-0.5 transition-transform" />
            {backLabel}
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {completeLabel?.toLowerCase().includes('generate prescription') ? (
            <button
              onClick={onComplete}
              disabled={isCompleting || isSaving}
              className="pp-btn-primary h-10 px-8 group uppercase tracking-widest shadow-lg shadow-blue-500/20"
            >
              {isCompleting ? 'GENERATING...' : completeLabel}
              <ChevronRight className="h-4 w-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
            </button>
          ) : completeLabel?.toLowerCase().includes('wrap up') || isPrescriptionStage ? (
            <button
              onClick={onComplete}
              disabled={isCompleting || isSaving}
              className="pp-btn-primary h-10 px-8 group uppercase tracking-widest shadow-md"
            >
              {isCompleting ? 'PROCESSING...' : completeLabel}
              <ChevronRight className="h-4 w-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <button
              onClick={onComplete}
              disabled={isCompleting || isSaving}
              className="pp-btn-primary h-10 px-6"
            >
              {isCompleting ? 'Processing...' : completeLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
