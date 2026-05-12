import './spinner.css';
import { cn } from '../../lib/cn';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  white?: boolean;
}

const sizeClass: Record<string, string> = {
  sm: 'ui-spinner--sm',
  md: '',
  lg: 'ui-spinner--lg',
};

export function Spinner({ className, size = 'md', white }: SpinnerProps) {
  return (
    <span
      className={cn('ui-spinner', sizeClass[size], white && 'ui-spinner--white', className)}
      role="status"
      aria-label="Loading"
    />
  );
}
