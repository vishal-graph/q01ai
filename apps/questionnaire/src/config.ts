import { z } from 'zod';

const ConfigSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8082),
  MONGO_URI: z.string().default('mongodb://localhost:27017/tatvaops'),
  QUESTIONNAIRE_WEBHOOK_URL: z.string().url().optional(),
  QUESTIONNAIRE_SESSION_TTL_MINUTES: z.coerce.number().int().positive().default(45),
  CHARACTER_REGISTRY_PATH: z.string().default('config/characters.json'),
  ENABLE_EQ_ENGINE: z
    .string()
    .optional()
    .transform((v) => (v ?? 'true').toLowerCase() !== 'false'),
  ENABLE_GUARDRAILS: z
    .string()
    .optional()
    .transform((v) => (v ?? 'true').toLowerCase() !== 'false'),
  AUTH_REQUIRED: z
    .string()
    .optional()
    .transform((v) => (v ?? 'false').toLowerCase() === 'true'),
  API_KEY: z.string().optional(),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export const config: AppConfig = ConfigSchema.parse(process.env as any);


