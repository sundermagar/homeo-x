import { Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Spinner } from '../../../components/ui/spinner';

interface AiSuggestButtonProps {
  onClick: () => void;
  isLoading: boolean;
  label?: string;
  disabled?: boolean;
}

export function AiSuggestButton({
  onClick,
  isLoading,
  label = 'AI Suggest',
  disabled,
}: AiSuggestButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled || isLoading}
      className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
    >
      {isLoading ? (
        <Spinner size="sm" />
      ) : (
        <Sparkles className="h-3.5 w-3.5" />
      )}
      {isLoading ? 'Generating...' : label}
    </Button>
  );
}
