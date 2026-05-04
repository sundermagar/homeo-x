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
    <div className="sticky bottom-0 z-40 border-t border-[#E3E2DF] bg-white px-4 py-3 sm:py-2.5 safe-area-bottom">
      <div className="flex flex-col-reverse sm:flex-row items-center gap-3 sm:gap-2">
        {/* Back Button */}
        {showBack && onBack && (
          <button
            onClick={onBack}
            className="pp-btn-secondary h-11 sm:h-10 px-4 group w-full sm:w-auto flex items-center justify-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1 transform group-hover:-translate-x-0.5 transition-transform" />
            {backLabel}
          </button>
        )}

        {/* Spacer */}
        <div className="hidden sm:block flex-1" />

        {/* Right Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {completeLabel?.toLowerCase().includes('generate prescription') ? (
            <button
              onClick={onComplete}
              disabled={isCompleting || isSaving}
              className="pp-btn-primary h-11 sm:h-10 px-8 group uppercase tracking-widest shadow-lg shadow-blue-500/20 w-full flex items-center justify-center"
            >
              {isCompleting ? 'GENERATING...' : completeLabel}
              <ChevronRight className="h-4 w-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
            </button>
          ) : completeLabel?.toLowerCase().includes('wrap up') || isPrescriptionStage ? (
            <button
              onClick={onComplete}
              disabled={isCompleting || isSaving}
              className="pp-btn-primary h-11 sm:h-10 px-8 group uppercase tracking-widest shadow-md w-full flex items-center justify-center"
            >
              {isCompleting ? 'PROCESSING...' : completeLabel}
              <ChevronRight className="h-4 w-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <button
              onClick={onComplete}
              disabled={isCompleting || isSaving}
              className="pp-btn-primary h-11 sm:h-10 px-6 w-full flex items-center justify-center"
            >
              {isCompleting ? 'Processing...' : completeLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
