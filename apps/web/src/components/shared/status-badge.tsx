import { Badge, type BadgeProps } from '../ui/badge';
import { VISIT_STATUS_LABELS } from '../../lib/constants';

const statusVariantMap: Record<string, BadgeProps['variant']> = {
  SCHEDULED: 'outline',
  CHECKED_IN: 'default',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
  DRAFT: 'outline',
  APPROVED: 'success',
  DISPENSED: 'success',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = statusVariantMap[status] || 'outline';
  const label = VISIT_STATUS_LABELS[status] || status.replace(/_/g, ' ');

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
