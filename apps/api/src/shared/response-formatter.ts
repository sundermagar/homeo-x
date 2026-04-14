import { Response } from 'express';
import { ApiResponse } from './result';

/**
 * Standardizes successful API responses with nested data key.
 */
export function sendSuccess(
  res: Response,
  data: any = {},
  message?: string,
  statusCode: number = 200
) {
  const response: ApiResponse = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  // Get correlationId from request headers if added by middleware
  const correlationId = res.getHeader('X-Correlation-ID');
  if (correlationId) {
    response.correlationId = correlationId.toString();
  }

  return res.status(statusCode).json(response);
}

/**
 * Standardizes error API responses.
 */
export function sendError(
  res: Response,
  message: string,
  statusCode: number = 500,
  code?: string
) {
  const response: ApiResponse = {
    success: false,
    error: message,
  };

  if (code) {
    response.code = code;
  }

  // Get correlationId from request headers if added by middleware
  const correlationId = res.getHeader('X-Correlation-ID');
  if (correlationId) {
    response.correlationId = correlationId.toString();
  }

  return res.status(statusCode).json(response);
}
