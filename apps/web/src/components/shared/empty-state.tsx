import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import './shared.css';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'card';
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  actionLabel, 
  onAction,
  variant = 'default',
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`empty-state empty-state--${variant} ${className} fade-in`}>
      {Icon && (
        <div className="empty-state__icon-wrapper">
          <Icon size={48} strokeWidth={1.5} className="empty-state__icon" />
        </div>
      )}
      
      <div className="empty-state__content">
        <h3 className="empty-state__title">{title}</h3>
        {description && <p className="empty-state__description">{description}</p>}
      </div>

      {(action || actionLabel) && (
        <div className="empty-state__action">
          {action ? action : (
            <button className="empty-state__button" onClick={onAction}>
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
