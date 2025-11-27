/**
 * Vertex AI Gemini adapter
 */

import { GoogleAuth } from 'google-auth-library';
import { AIClient, GenerateOptions, GenerateResponse } from '../client';
import {
  logger,
  AIProviderError,
  retryWithBackoff,
  extractJson,
} from '../../../core/src/index';
import { createHash } from 'crypto';

class VertexGeminiAdapter implements AIClient {
  name = 'vertex-gemini';
  private auth: GoogleAuth;

  constructor() {
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }

  /**
   * Get OAuth2 access token for Vertex AI
   */
  private async getAccessToken(): Promise<string> {
    try {
      const client = await this.auth.getClient();
      const tokenResponse = await client.getAccessToken();
      
      if (!tokenResponse.token) {
        throw new Error('Failed to obtain access token');
      }
      
      return tokenResponse.token;
    } catch (error) {
      logger.error({ error }, 'Failed to get Vertex AI access token');
      throw new AIProviderError('Failed to authenticate with Vertex AI', { error });
    }
  }

  /**
   * Build Vertex AI endpoint URL
   */
  private buildEndpointUrl(model: string): string {
    // Legacy Vertex AI endpoint - deprecated in favor of Gemini API
    const vertexApiEndpoint = process.env.VERTEX_API_ENDPOINT || 'https://aiplatform.googleapis.com';
    const gcpProject = process.env.GCP_PROJECT || 'your-project';
    const gcpLocation = process.env.GCP_LOCATION || 'us-central1';
    return `${vertexApiEndpoint}/v1/projects/${gcpProject}/locations/${gcpLocation}/publishers/google/models/${model}:generateContent`;
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
   * Generate JSON response from Vertex Gemini
   */
  async generateJSON<T>(options: GenerateOptions): Promise<GenerateResponse<T>> {
    const {
      model,
      system,
      user,
      schema,
      temperature = 0.2,
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

      // Extract and parse JSON from response
      let parsedData: T;
      try {
        parsedData = extractJson(response.text) as T;
      } catch (parseError) {
        logger.error({ error: parseError, text: response.text }, 'Failed to parse AI response');
        
        // Attempt single repair
        try {
          const repairPrompt = `The following text should be valid JSON but has syntax errors. Please fix it and return ONLY the corrected JSON:\n\n${response.text}`;
          const repairResponse = await this.makeRequest(
            model,
            'You are a JSON repair assistant. Return only valid JSON.',
            repairPrompt,
            0.1,
            maxTokens
          );
          parsedData = extractJson(repairResponse.text) as T;
          logger.info('Successfully repaired malformed JSON response');
        } catch (repairError) {
          throw new AIProviderError('Failed to parse and repair AI response', {
            originalText: response.text,
            parseError,
            repairError,
          });
        }
      }

      // Validate with Zod schema if provided
      if (schema) {
        try {
          parsedData = schema.parse(parsedData) as T;
        } catch (validationError) {
          logger.error(
            { error: validationError, data: parsedData },
            'Schema validation failed for AI response'
          );
          throw new AIProviderError('AI response does not match expected schema', {
            validationError,
            data: parsedData,
          });
        }
      }

      logger.debug(
        {
          model,
          latencyMs,
          tokensUsed: response.tokensUsed,
          promptHash: this.createPromptHash(system, user),
        },
        'AI generation successful'
      );

      return {
        data: parsedData,
        modelVersion: model,
        promptHash: this.createPromptHash(system, user),
        tokensUsed: response.tokensUsed,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      logger.error(
        {
          error,
          model,
          latencyMs,
          temperature,
          maxTokens,
        },
        'AI generation failed'
      );

      if (error instanceof AIProviderError) {
        throw error;
      }

      throw new AIProviderError('Vertex AI request failed', { error });
    }
  }

  /**
   * Make HTTP request to Vertex AI
   */
  private async makeRequest(
    model: string,
    system: string,
    user: string,
    temperature: number,
    maxTokens: number
  ): Promise<{ text: string; tokensUsed?: { prompt: number; completion: number; total: number } }> {
    const token = await this.getAccessToken();
    const url = this.buildEndpointUrl(model);

    // Combine system and user prompts
    const fullPrompt = `${system}\n\n${user}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: fullPrompt }],
        },
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        topP: 0.95,
        topK: 40,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_ONLY_HIGH',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_ONLY_HIGH',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_ONLY_HIGH',
        },
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_ONLY_HIGH',
        },
      ],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new AIProviderError(
        `Vertex AI returned ${response.status}: ${response.statusText}`,
        { status: response.status, errorText }
      );
    }

    const data = await response.json();

    // Extract text from response
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new AIProviderError('No text content in Vertex AI response', { data });
    }

    // Extract token usage if available
    const tokensUsed = data?.usageMetadata
      ? {
          prompt: data.usageMetadata.promptTokenCount || 0,
          completion: data.usageMetadata.candidatesTokenCount || 0,
          total: data.usageMetadata.totalTokenCount || 0,
        }
      : undefined;

    return { text, tokensUsed };
  }

  /**
   * Health check for Vertex AI
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const vertexGeminiClient = new VertexGeminiAdapter();

