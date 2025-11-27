/**
 * Utility functions
 */

import { randomBytes } from 'crypto';

/**
 * Generate a unique correlation ID
 */
export function generateCorrelationId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generate an idempotency key from payload
 */
export function generateIdempotencyKey(payload: unknown): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 100,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error;
  let delayMs = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      await sleep(Math.min(delayMs, maxDelayMs));
      delayMs *= backoffMultiplier;
    }
  }

  throw lastError!;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse JSON safely
 */
export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/**
 * Extract JSON from text (useful for AI responses)
 */
export function extractJson(text: string): unknown {
  // Try to find JSON block in markdown code fences
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1].trim());
  }

  // Try to find JSON object or array
  const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1]);
  }

  // Try parsing the whole text
  return JSON.parse(text);
}

/**
 * Truncate string to max length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

export function now(): string {
  return new Date().toISOString();
}

/**
 * Simple deepmerge utility for objects
 */
export function deepmerge(target: any, source: any): any {
  const output = { ...target };

  if (target && typeof target === 'object' && source && typeof source === 'object') {
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object') {
        // If source value is an array, use it directly (don't merge)
        if (Array.isArray(source[key])) {
          Object.assign(output, { [key]: source[key] });
        } else if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepmerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
}

