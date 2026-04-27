import * as React from 'react';
import { cn } from '../../lib/cn';
import './badge.css';

const badgeVariantClass: Record<string, string> = {
  default:     'badge--default',
  secondary:   'badge--secondary',
  destructive: 'badge--destructive',
  outline:     'badge--outline',
  success:     'badge--success',
  warning:     'badge--warning',
  error:       'badge--destructive',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof badgeVariantClass;
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn('badge', badgeVariantClass[variant], className)}
      {...props}
    />
  );
}

export { Badge };
