/**
 * AI Client interface - adapter pattern for swappable AI providers
 */

import { z } from 'zod';

export interface GenerateOptions {
  model: string;
  system: string;
  user: string;
  schema?: z.ZodSchema;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
}

export interface GenerateResponse<T> {
  data: T;
  modelVersion: string;
  promptHash: string;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  latencyMs: number;
}

export interface AIClient {
  name: string;
  
  /**
   * Generate structured JSON response from AI model
   */
  generateJSON<T>(options: GenerateOptions): Promise<GenerateResponse<T>>;
  
  /**
   * Health check for the AI provider
   */
  healthCheck?(): Promise<boolean>;
}

