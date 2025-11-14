/**
 * Zod schemas for runtime validation
 */

import { z } from 'zod';

// Service Type
export const ServiceTypeZ = z.enum([
  'construction',
  'interior_design',
  'home_automation',
  'painting',
  'solar_services',
  'electrical_services',
  'irrigation_automation'
]);

// Character Meta
export const CharacterMetaZ = z.object({
  name: z.string().min(1),
  persona: z.string().min(1),
  qualification: z.string().min(1),
  responsibilities: z.array(z.string()),
  tone: z.string().min(1),
  guardrails: z.array(z.string()),
  reasonForInteraction: z.string().min(1),
});

// User Info
export const UserInfoZ = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  locationCity: z.string().optional(),
});

// Enquiry Payload
export const EnquiryPayloadZ = z.object({
  service: ServiceTypeZ,
  channel: z.string().min(1),
  user: UserInfoZ,
  hardText: z.string().min(10),
  slots: z.record(z.unknown()).optional(),
  character: CharacterMetaZ,
  meta: z.record(z.unknown()).optional(),
});

// Perspective
export const PerspectiveZ = z.object({
  keyNeeds: z.array(z.string()),
  painPoints: z.array(z.string()),
  expectations: z.array(z.string()),
  constraints: z.array(z.string()),
  decisionFactors: z.array(z.string()),
});

// Summary/Milestone schemas removed in questionnaire-only mode

// Event Payload
export const EventPayloadZ = z.object({
  type: z.string(),
  data: z.record(z.unknown()),
  metadata: z.object({
    timestamp: z.string(),
    correlationId: z.string(),
    idempotencyKey: z.string().optional(),
  }),
});

