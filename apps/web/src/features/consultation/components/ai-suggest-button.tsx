import { Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Spinner } from '../../../components/ui/spinner';

interface AiSuggestButtonProps {
  onClick: () => void;
  isLoading: boolean;
  label?: string;
  disabled?: boolean;
}

export function AiSuggestButton({ onClick, isLoading, label = 'AI Suggest', disabled }: AiSuggestButtonProps) {
  return (
    <Button
      type="button" variant="outline" size="sm"
      onClick={onClick} disabled={disabled || isLoading}
      style={{ gap: '0.375rem', borderColor: '#C4B5FD', color: '#7C3AED' }}
    >
      {isLoading ? <Spinner size="sm" /> : <Sparkles style={{ width: 14, height: 14 }} />}
      {isLoading ? 'Generating...' : label}
    </Button>
  );
}
