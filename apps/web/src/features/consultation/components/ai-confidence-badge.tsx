import { Badge } from '../../../components/ui/badge';

interface AiConfidenceBadgeProps {
  confidence: number;
}

export function AiConfidenceBadge({ confidence }: AiConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100);

  let variant: 'success' | 'warning' | 'error' = 'error';
  let label = 'Low';
  if (confidence >= 0.8) {
    variant = 'success';
    label = 'High';
  } else if (confidence >= 0.5) {
    variant = 'warning';
    label = 'Medium';
  }

  return (
    <Badge variant={variant}>
      AI Confidence: {pct}% ({label})
    </Badge>
  );
}
