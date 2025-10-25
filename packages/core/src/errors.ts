/**
 * Custom error classes for domain-specific errors
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` with id ${id}` : ''} not found`,
      'NOT_FOUND',
      404
    );
  }
}

export class DuplicateError extends AppError {
  constructor(resource: string, field?: string) {
    super(
      `${resource}${field ? ` with ${field}` : ''} already exists`,
      'DUPLICATE_ERROR',
      409
    );
  }
}

export class AIProviderError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'AI_PROVIDER_ERROR', 502, details);
  }
}

export class MessageBusError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'MESSAGE_BUS_ERROR', 500, details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'DATABASE_ERROR', 500, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export function isRetryableError(error: Error): boolean {
  if (error instanceof MessageBusError) return true;
  if (error instanceof DatabaseError) return true;
  if (error instanceof AIProviderError) {
    // Retry on timeout or rate limit errors
    const message = error.message.toLowerCase();
    return message.includes('timeout') || message.includes('rate limit');
  }
  return false;
}

