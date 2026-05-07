import type { ReactNode } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast';
import { useToast } from '../../hooks/use-toast';

const variantIcon: Record<string, ReactNode> = {
  success: <CheckCircle2 size={14} strokeWidth={2.4} />,
  error:   <AlertTriangle size={14} strokeWidth={2.4} />,
  warning: <AlertCircle size={14} strokeWidth={2.4} />,
  default: <Info size={14} strokeWidth={2.2} />,
};

/** Heuristic: short description that looks like code/slug → render in mono. */
function looksLikeCode(text: string | undefined): boolean {
  if (!text) return false;
  if (text.length > 80) return false;
  return /^[\[{]|[:_/-]/.test(text) && !/\s{2,}/.test(text);
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant = 'default', ...props }) => {
        const icon = variantIcon[variant] ?? variantIcon['default'];
        const mono = looksLikeCode(description);
        return (
          <Toast key={id} variant={variant} {...props}>
            <span className="toast__icon" aria-hidden="true">{icon}</span>
            <div className="toast__body">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription className={mono ? 'toast__description--mono' : undefined}>
                  {description}
                </ToastDescription>
              )}
            </div>
            <ToastClose aria-label="Dismiss notification" />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
