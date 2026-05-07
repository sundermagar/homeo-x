import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home, RotateCcw } from 'lucide-react';
import './error-boundary.css';

interface FallbackProps {
  error: Error;
  reset: () => void;
  errorId?: string | null;
  occurredAt?: string | null;
}

interface Props {
  children: ReactNode;
  /** Optional custom fallback. If a function, receives the caught error and a reset() callback. */
  fallback?: ReactNode | ((props: FallbackProps) => ReactNode);
  /** When any value in this array changes, the boundary resets — useful for route-level resets. */
  resetKeys?: ReadonlyArray<unknown>;
  /** Hook for upstream logging (e.g. Sentry). Runs alongside the built-in console.error. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  occurredAt: string | null;
}

const isDev = import.meta.env.MODE !== 'production';

/** Short opaque id rendered to the user so support can correlate with logs. */
function generateErrorId(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${time}-${rand}`.toUpperCase();
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, error: null, errorId: null, occurredAt: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
      occurredAt: new Date().toISOString(),
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[ErrorBoundary ${this.state.errorId ?? ''}] caught:`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  override componentDidUpdate(prevProps: Props): void {
    if (!this.state.hasError) return;
    const prev = prevProps.resetKeys;
    const next = this.props.resetKeys;
    if (!prev || !next) return;
    if (prev.length !== next.length || prev.some((k, i) => k !== next[i])) {
      this.reset();
    }
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null, errorId: null, occurredAt: null });
  };

  override render(): ReactNode {
    if (!this.state.hasError || !this.state.error) return this.props.children;

    const { fallback } = this.props;
    const fallbackProps: FallbackProps = {
      error: this.state.error,
      reset: this.reset,
      errorId: this.state.errorId,
      occurredAt: this.state.occurredAt,
    };
    if (typeof fallback === 'function') return fallback(fallbackProps);
    if (fallback !== undefined) return fallback;

    return <DefaultFallback {...fallbackProps} />;
  }
}

function DefaultFallback({ error, reset, errorId, occurredAt }: FallbackProps): ReactNode {
  const reload = (): void => window.location.reload();
  const goHome = (): void => {
    window.location.href = '/';
  };

  const formattedTime = occurredAt
    ? new Date(occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';

  return (
    <div className="eb-root" role="alert">
      <div className="eb-card">
        <div className="eb-icon-wrap" aria-hidden="true">
          <AlertTriangle size={28} strokeWidth={2} />
        </div>

        <h1 className="eb-title">Something went wrong</h1>
        <p className="eb-subtitle">
          The page hit an unexpected problem. Your data is safe — try one of the actions below to recover.
        </p>

        <div className="eb-message">
          {error.message || 'An unexpected error occurred while rendering this view.'}
        </div>

        <div className="eb-actions">
          <button type="button" className="eb-btn eb-btn-primary" onClick={reset}>
            <RotateCcw size={14} strokeWidth={2.2} />
            Try again
          </button>
          <button type="button" className="eb-btn eb-btn-secondary" onClick={goHome}>
            <Home size={14} strokeWidth={2.2} />
            Go home
          </button>
          <button type="button" className="eb-btn eb-btn-ghost" onClick={reload}>
            <RefreshCw size={14} strokeWidth={2.2} />
            Reload page
          </button>
        </div>

        {(errorId || formattedTime) && (
          <div className="eb-meta">
            {errorId && <span>ID: {errorId}</span>}
            {errorId && formattedTime && <span className="eb-meta-divider">•</span>}
            {formattedTime && <span>{formattedTime}</span>}
          </div>
        )}
      </div>

      {isDev && error.stack && (
        <details className="eb-trace">
          <summary>Stack trace (development only)</summary>
          <pre>{error.stack}</pre>
        </details>
      )}
    </div>
  );
}

/**
 * Boundary that automatically resets whenever the user navigates to a new route.
 * Use this around lazy-loaded route elements so one page crash does not poison the
 * shell and clicking a sidebar link recovers the UI.
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }): ReactNode {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <ErrorBoundary
      resetKeys={[location.pathname]}
      fallback={({ error, reset, errorId, occurredAt }) => (
        <DefaultFallback
          error={error}
          errorId={errorId}
          occurredAt={occurredAt}
          reset={() => {
            // Reset internal state and re-attempt the same route.
            reset();
            // Navigate to itself in a way that re-fires the lazy import if it crashed.
            navigate(location.pathname + location.search, { replace: true });
          }}
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
