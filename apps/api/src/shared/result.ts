/**
 * Functional Result type for domain operations.
 * Avoids exceptions for expected failures (validation, not-found, conflicts).
 */
export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E; code?: string };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function fail<E = string>(error: E, code?: string): Result<never, E> {
  return { success: false, error, code };
}
