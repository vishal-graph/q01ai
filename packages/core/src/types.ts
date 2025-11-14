/**
 * Core domain types for TatvaOps Conversational Enquiry System
 */

export type ServiceType =
  | 'construction'
  | 'interior_design'
  | 'home_automation'
  | 'painting'
  | 'solar_services'
  | 'electrical_services'
  | 'irrigation_automation'
  | 'event_management'
  | 'farm_infrastructure';

export interface CharacterMeta {
  name: string;
  persona: string;
  qualification: string;
  responsibilities: string[];
  tone: string;
  guardrails: string[];
  reasonForInteraction: string;
}

export interface UserInfo {
  name?: string;
  phone?: string;
  email?: string;
  locationCity?: string;
}

export interface EnquiryPayload {
  service: ServiceType;
  channel: string;
  user: UserInfo;
  hardText: string;
  slots?: Record<string, unknown>;
  character: CharacterMeta;
  meta?: Record<string, unknown>;
}

export interface Perspective {
  keyNeeds: string[];
  painPoints: string[];
  expectations: string[];
  constraints: string[];
  decisionFactors: string[];
}

export interface Summary {
  userPerspective: Perspective;
  salesPerspective: Perspective;
  vendorPerspective: Perspective;
  rawSummary: string;
}

export interface MilestoneItem {
  id: string;
  name: string;
  description: string;
  sequence: number;
  estimatedDuration: string;
  dependencies: string[];
  deliverables: string[];
  owner: 'vendor' | 'client' | 'both';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  criticalPath: boolean;
}

export interface MilestonePlan {
  enquiryId: string;
  service: ServiceType;
  version: string;
  milestones: MilestoneItem[];
  totalDuration: string;
  criticalPathMilestones: string[];
  createdAt: Date;
}

export interface EventPayload {
  type: string;
  data: Record<string, unknown>;
  metadata: {
    timestamp: string;
    correlationId: string;
    idempotencyKey?: string;
  };
}

export interface OutboxEvent {
  id: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'published' | 'failed';
  retryCount: number;
  createdAt: Date;
  publishedAt?: Date;
}

