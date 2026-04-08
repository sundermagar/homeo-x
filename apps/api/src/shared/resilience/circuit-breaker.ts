import { createLogger } from '../logger';

const logger = createLogger('circuit-breaker');

export enum CircuitState {
  Closed = 'CLOSED',
  Open = 'OPEN',
  HalfOpen = 'HALF_OPEN',
}

interface CircuitBreakerOptions {
  name: string;
  failureThreshold: number;     // Number of failures before opening
  resetTimeoutMs: number;       // How long to wait before trying again
  halfOpenMaxAttempts: number;  // Attempts allowed in half-open state
}

/**
 * Circuit breaker pattern for external service calls (AI providers, SMS, etc.)
 * Prevents cascading failures when an external service is down.
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.Closed;
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private halfOpenAttempts = 0;

  constructor(private readonly options: CircuitBreakerOptions) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.Open) {
      if (Date.now() - (this.lastFailureTime || 0) > this.options.resetTimeoutMs) {
        this.state = CircuitState.HalfOpen;
        this.halfOpenAttempts = 0;
        logger.info(`[${this.options.name}] Circuit → HALF_OPEN`);
      } else {
        throw new Error(`Circuit breaker OPEN for ${this.options.name}. Service temporarily unavailable.`);
      }
    }

    if (this.state === CircuitState.HalfOpen && this.halfOpenAttempts >= this.options.halfOpenMaxAttempts) {
      this.trip();
      throw new Error(`Circuit breaker re-OPENED for ${this.options.name}. Half-open attempts exhausted.`);
    }

    try {
      if (this.state === CircuitState.HalfOpen) this.halfOpenAttempts++;
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.options.failureThreshold) {
      this.trip();
    }
  }

  private trip(): void {
    this.state = CircuitState.Open;
    logger.warn(`[${this.options.name}] Circuit → OPEN (${this.failureCount} failures)`);
  }

  private reset(): void {
    if (this.state !== CircuitState.Closed) {
      logger.info(`[${this.options.name}] Circuit → CLOSED (recovered)`);
    }
    this.failureCount = 0;
    this.state = CircuitState.Closed;
    this.halfOpenAttempts = 0;
  }

  getState(): { state: CircuitState; failureCount: number; lastFailure: number | null } {
    return { state: this.state, failureCount: this.failureCount, lastFailure: this.lastFailureTime };
  }
}

// Pre-configured breakers for known external services
export const aiGeminiBreaker = new CircuitBreaker({ name: 'gemini', failureThreshold: 5, resetTimeoutMs: 60_000, halfOpenMaxAttempts: 2 });
export const aiGroqBreaker = new CircuitBreaker({ name: 'groq', failureThreshold: 5, resetTimeoutMs: 60_000, halfOpenMaxAttempts: 2 });
export const deepgramBreaker = new CircuitBreaker({ name: 'deepgram', failureThreshold: 3, resetTimeoutMs: 30_000, halfOpenMaxAttempts: 1 });
export const smsBreaker = new CircuitBreaker({ name: 'sms', failureThreshold: 3, resetTimeoutMs: 120_000, halfOpenMaxAttempts: 1 });
export const whatsappBreaker = new CircuitBreaker({ name: 'whatsapp', failureThreshold: 3, resetTimeoutMs: 120_000, halfOpenMaxAttempts: 1 });
export const razorpayBreaker = new CircuitBreaker({ name: 'razorpay', failureThreshold: 3, resetTimeoutMs: 60_000, halfOpenMaxAttempts: 1 });
