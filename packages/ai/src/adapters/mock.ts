/**
 * Mock AI adapter for testing
 */

import { AIClient, GenerateOptions, GenerateResponse } from '../client';
import { logger } from '@tatvaops/core';

class MockAIAdapter implements AIClient {
  name = 'mock-ai';

  async generateJSON<T>(options: GenerateOptions): Promise<GenerateResponse<T>> {
    const { model, system } = options;

    logger.debug({ model, system: system.substring(0, 100) }, 'Mock AI generation');

    // Return mock structured response
    const mockData = {
      userPerspective: {
        keyNeeds: ['Mock key need 1', 'Mock key need 2'],
        painPoints: ['Mock pain point 1'],
        expectations: ['Mock expectation 1'],
        constraints: ['Mock constraint 1'],
        decisionFactors: ['Mock decision factor 1'],
      },
      salesPerspective: {
        keyNeeds: ['Mock sales need 1'],
        painPoints: ['Mock sales pain 1'],
        expectations: ['Mock sales expectation 1'],
        constraints: ['Mock sales constraint 1'],
        decisionFactors: ['Mock sales decision 1'],
      },
      vendorPerspective: {
        keyNeeds: ['Mock vendor need 1'],
        painPoints: ['Mock vendor pain 1'],
        expectations: ['Mock vendor expectation 1'],
        constraints: ['Mock vendor constraint 1'],
        decisionFactors: ['Mock vendor decision 1'],
      },
      rawSummary: 'This is a mock summary generated for testing purposes.',
    } as T;

    return {
      data: mockData,
      modelVersion: model,
      promptHash: 'mock-hash-123',
      tokensUsed: {
        prompt: 100,
        completion: 200,
        total: 300,
      },
      latencyMs: 100,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

export const mockAIClient = new MockAIAdapter();

