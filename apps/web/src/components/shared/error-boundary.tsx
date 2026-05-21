import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
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
  const isChunkError = 
    error.name === 'ChunkLoadError' || 
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Loading chunk');

  // Auto-reset once for chunk errors to handle network blips gracefully
  useEffect(() => {
    if (isChunkError) {
      const timer = setTimeout(() => {
        console.log('[ErrorBoundary] Auto-retrying chunk load error...');
        reset();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isChunkError, reset]);

  const reload = (): void => window.location.reload();
  
  const formattedTime = occurredAt
    ? new Date(occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="eb-soft-overlay" role="alert">
      <div className="eb-soft-toast">
        <div className="eb-soft-header">
          <div className="eb-soft-icon">
            <AlertTriangle size={18} />
          </div>
          <div className="eb-soft-content">
            <h3 className="eb-soft-title">
              {isChunkError ? 'Connection refresh needed' : 'Something went wrong'}
            </h3>
            <p className="eb-soft-message">
              {isChunkError 
                ? 'We encountered a minor glitch loading this view. Trying to recover...'
                : error.message || 'An unexpected error occurred.'}
            </p>
          </div>
        </div>

        <div className="eb-soft-actions">
          <button type="button" className="eb-soft-btn primary" onClick={reset}>
            <RotateCcw size={14} />
            {isChunkError ? 'Retry now' : 'Try again'}
          </button>
          <button type="button" className="eb-soft-btn secondary" onClick={reload}>
            <RefreshCw size={14} />
            Reload
          </button>
        </div>

        {errorId && (
          <div className="eb-soft-footer">
            <span>Error ID: {errorId}</span>
            {formattedTime && <span> • {formattedTime}</span>}
          </div>
        )}
      </div>
      
      {isDev && error.stack && (
        <details className="eb-soft-trace">
          <summary>Debug Details</summary>
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
