/**
 * Configuration management (12-factor app principles)
 */

import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// Load .env file
loadEnv();

const ConfigSchema = z.object({
  // Node environment
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  
  // MongoDB (optional in questionnaire-only mode)
  mongoUri: z.string().optional(),
  mongoMaxPoolSize: z.coerce.number().int().positive().default(10),
  
  // RabbitMQ removed in questionnaire-only mode
  
  // Gemini API (Direct API Key - No GCP Auth Needed)
  geminiApiKey: z.string().optional(),
  summaryModel: z.string().default('gemini-2.0-flash-exp'),
  milestoneModel: z.string().default('gemini-2.0-flash-exp'),
  
  // API
  port: z.coerce.number().int().positive().default(3000),
  jwtSecret: z.string().min(32).optional(),
  apiRateLimit: z.coerce.number().int().positive().default(100),
  
  // Observability
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  otelExporterEndpoint: z.string().url().optional(),
  otelServiceName: z.string().default('tatvaops'),
  
  // Redis (optional)
  redisUrl: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

function loadConfig(): Config {
  try {
    return ConfigSchema.parse({
      nodeEnv: process.env.NODE_ENV,
      mongoUri: process.env.MONGO_URI,
      mongoMaxPoolSize: process.env.MONGO_MAX_POOL_SIZE,
      geminiApiKey: process.env.GEMINI_API_KEY,
      summaryModel: process.env.SUMMARY_MODEL,
      milestoneModel: process.env.MILESTONE_MODEL,
      port: process.env.PORT,
      jwtSecret: process.env.JWT_SECRET,
      apiRateLimit: process.env.API_RATE_LIMIT,
      logLevel: process.env.LOG_LEVEL,
      otelExporterEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      otelServiceName: process.env.OTEL_SERVICE_NAME,
      redisUrl: process.env.REDIS_URL,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      // eslint-disable-next-line no-console
      console.error('Configuration validation failed:', error.errors);
      throw new Error('Invalid configuration');
    }
    throw error;
  }
}

export const config = loadConfig();

export function isDevelopment(): boolean {
  return config.nodeEnv === 'development';
}

export function isProduction(): boolean {
  return config.nodeEnv === 'production';
}

export function isTest(): boolean {
  return config.nodeEnv === 'test';
}

