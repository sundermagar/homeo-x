import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/cn';
import './button.css';

const variantClass: Record<string, string> = {
  default:     'btn--default',
  destructive: 'btn--destructive',
  outline:     'btn--outline',
  ghost:       'btn--ghost',
  link:        'btn--link',
};

const sizeClass: Record<string, string> = {
  sm:   'btn--sm',
  md:   'btn--md',
  lg:   'btn--lg',
  icon: 'btn--icon',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClass;
  size?: keyof typeof sizeClass;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn('btn', variantClass[variant], sizeClass[size], className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button };
