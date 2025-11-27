/**
 * Structured logging with Pino
 */

import pino from 'pino';

// PII fields to redact in logs
const PII_FIELDS = ['phone', 'email', 'password', 'token', 'authorization'];

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

export const logger = pino({
  level: logLevel,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  redact: {
    paths: PII_FIELDS,
    remove: false,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(nodeEnv === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }),
});

/**
 * Create a child logger with additional context
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * Add request-scoped context to logger
 */
export function withRequestContext(requestId: string, enquiryRef?: string) {
  return logger.child({
    requestId,
    ...(enquiryRef && { enquiryRef }),
  });
}

/**
 * Mask PII data for logging
 */
export function maskPII(data: string, visibleChars = 3): string {
  if (!data || data.length <= visibleChars) {
    return '***';
  }
  return data.substring(0, visibleChars) + '*'.repeat(data.length - visibleChars);
}

/**
 * Safe object logging - masks PII fields
 */
export function safeLog(obj: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = { ...obj };
  
  for (const field of PII_FIELDS) {
    if (typeof masked[field] === 'string') {
      masked[field] = maskPII(masked[field] as string);
    }
  }
  
  return masked;
}

