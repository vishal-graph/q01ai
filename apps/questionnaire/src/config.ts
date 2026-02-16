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
  WHATSAPP_CHARACTER_DEFAULT: z.string().default('aadhya'),
  WHATSAPP_FREEFLOW_ENABLED: z
    .string()
    .optional()
    .transform((v) => (v ?? 'true').toLowerCase() === 'true'),
  EXTRACTION_CONFIDENCE_THRESHOLD_AUTO: z.coerce.number().default(0.65),
  EXTRACTION_CONFIDENCE_THRESHOLD_TENTATIVE: z.coerce.number().default(0.4),
  MAX_TURNS_BEFORE_DIRECT_ASK: z.coerce.number().int().positive().default(3),
  MAX_CONTEXT_TURNS: z.coerce.number().int().positive().default(6),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export const config: AppConfig = ConfigSchema.parse(process.env as any);

export const EXTRACTION_CONFIDENCE_THRESHOLD_AUTO = config.EXTRACTION_CONFIDENCE_THRESHOLD_AUTO;
export const EXTRACTION_CONFIDENCE_THRESHOLD_TENTATIVE = config.EXTRACTION_CONFIDENCE_THRESHOLD_TENTATIVE;
export const MAX_TURNS_BEFORE_DIRECT_ASK = config.MAX_TURNS_BEFORE_DIRECT_ASK;
export const MAX_CONTEXT_TURNS = config.MAX_CONTEXT_TURNS;
export const WHATSAPP_CHARACTER_DEFAULT = config.WHATSAPP_CHARACTER_DEFAULT;
export const WHATSAPP_FREEFLOW_ENABLED = config.WHATSAPP_FREEFLOW_ENABLED;


