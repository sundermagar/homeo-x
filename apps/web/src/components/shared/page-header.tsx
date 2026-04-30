import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import './shared.css';

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ icon: Icon, title, description, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-header__title">
          {Icon && <Icon size={20} strokeWidth={1.6} style={{ color: 'var(--pp-blue)', flexShrink: 0 }} />}
          {title}
        </h1>
        {description && <p className="page-header__description">{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}
