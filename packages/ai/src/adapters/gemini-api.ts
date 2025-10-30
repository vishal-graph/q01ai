/**
 * Google Gemini API adapter (direct API key)
 * Simpler alternative to Vertex AI - no GCP authentication needed
 */

import fetch from 'node-fetch';
import { AIClient, GenerateOptions, GenerateResponse } from '../client';
import {
  logger,
  AIProviderError,
  retryWithBackoff,
  extractJson,
} from '../../../core/src/index';
import { createHash } from 'crypto';

class GeminiAPIAdapter implements AIClient {
  name = 'gemini-api';
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1/models';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    
    if (!this.apiKey) {
      logger.warn('GEMINI_API_KEY not set - Gemini API adapter will fail');
    }
  }

  /**
   * Create prompt hash for tracking
   */
  private createPromptHash(system: string, user: string): string {
    return createHash('sha256')
      .update(`${system}|||${user}`)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Generate JSON response from Gemini API
   */
  async generateJSON<T>(options: GenerateOptions): Promise<GenerateResponse<T>> {
    const {
      model,
      system,
      user,
      schema,
      temperature = 0.7,
      maxTokens = 2048,
    } = options;

    const startTime = Date.now();

    try {
      const response = await retryWithBackoff(
        () => this.makeRequest(model, system, user, temperature, maxTokens),
        {
          maxRetries: 3,
          initialDelayMs: 500,
          maxDelayMs: 5000,
        }
      );

      const latencyMs = Date.now() - startTime;

      // If a schema is provided, parse structured JSON; otherwise just return raw text
      let parsedData: T;
      if (schema) {
        try {
          parsedData = extractJson(response.text) as T;
        } catch (parseError) {
          // Only error when schema was expected
          throw new AIProviderError('Failed to parse JSON response', {
            parseError,
            text: response.text.substring(0, 500),
          });
        }
      } else {
        parsedData = response.text as any;
      }

      return {
        data: parsedData,
        modelVersion: response.model,
        tokensUsed: {
          prompt: response.usage.promptTokens,
          completion: response.usage.completionTokens,
          total: response.usage.totalTokens,
        },
        latencyMs,
        promptHash: this.createPromptHash(system, user),
      };
    } catch (error) {
      logger.error({ error, model, temperature }, 'Gemini API request failed');
      throw new AIProviderError('Gemini API request failed', { error });
    }
  }

  /**
   * Make HTTP request to Gemini API
   */
  private async makeRequest(
    model: string,
    system: string,
    user: string,
    temperature: number,
    maxTokens: number
  ): Promise<{ text: string; model: string; usage: any }> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Build endpoint URL (Direct Gemini API format)
    const endpoint = `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`;

    // Build request body (Direct Gemini API format)
    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `${system}\n\n${user}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        topP: 0.95,
        topK: 40,
      }
    };

    logger.info({ model, temperature, endpoint: endpoint.split('?')[0] }, 'Calling Gemini API');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'Gemini API error response');
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data: any = await response.json();

    // Extract text from response (Direct Gemini API format)
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!text) {
      logger.error({ data }, 'No text in Gemini API response');
      throw new Error('No text content in Gemini API response');
    }

    // Extract usage info
    const usage = {
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
    };

    logger.info({ 
      model, 
      usage, 
      textLength: text.length 
    }, 'Gemini API response received');

    return {
      text,
      model,
      usage,
    };
  }

  /**
   * Generate text response (non-JSON)
   */
  async generateText(options: GenerateOptions): Promise<GenerateResponse<string>> {
    const result = await this.generateJSON<string>({
      ...options,
      schema: undefined, // No schema validation for text
    });

    return result;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest(
        'gemini-2.5-flash',
        'You are a helpful assistant.',
        'Say "OK" if you can hear me.',
        0.1,
        10
      );
      return response.text.length > 0;
    } catch (error) {
      logger.error({ error }, 'Gemini API health check failed');
      return false;
    }
  }
}

// Export singleton instance
export const geminiAPIClient = new GeminiAPIAdapter();

