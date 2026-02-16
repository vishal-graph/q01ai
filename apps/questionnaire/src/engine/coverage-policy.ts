/**
 * Per-service adaptive coverage policy: required and optional datapoint ids for completion.
 * Used to decide when a conversation is complete and to drive follow-up questions.
 */

export type CoveragePolicy = {
  required: string[];
  optional?: string[];
};

const DEFAULT_REQUIRED = [
  'project_type',
  'rooms',
  'size_sqft',
  'style',
  'budget',
  'timeline',
  'contact_pref',
  'callback_time',
];

const DEFAULT_OPTIONAL = [
  'must_haves',
  'avoid',
  'site_ready',
  'storage_needs',
  'lighting_pref',
  'callback_time',
  'preferred_start',
  'notes',
  'moodboard_refs',
];

const policyByService: Record<string, CoveragePolicy> = {
  residential_interiors: {
    required: DEFAULT_REQUIRED,
    optional: DEFAULT_OPTIONAL,
  },
  commercial_interiors: {
    required: [
      'project_type',
      'size_sqft',
      'style',
      'budget',
      'timeline',
      'contact_pref',
      'callback_time',
    ],
    optional: ['must_haves', 'avoid', 'notes'],
  },
  commercial_construction: {
    required: [
      'project_type',
      'size_sqft',
      'budget',
      'timeline',
      'contact_pref',
      'callback_time',
    ],
    optional: ['notes'],
  },
  property_development: {
    required: [
      'project_type',
      'size_sqft',
      'budget',
      'timeline',
      'contact_pref',
      'callback_time',
    ],
    optional: ['notes'],
  },
  residential_construction: {
    required: [
      'project_type',
      'size_sqft',
      'budget',
      'timeline',
      'contact_pref',
      'callback_time',
    ],
    optional: ['notes'],
  },
  home_automation: {
    required: [
      'project_type',
      'rooms',
      'style',
      'budget',
      'timeline',
      'contact_pref',
      'callback_time',
    ],
    optional: ['notes'],
  },
  painting: {
    required: [
      'project_type',
      'size_sqft',
      'style',
      'budget',
      'timeline',
      'contact_pref',
      'callback_time',
    ],
    optional: ['notes'],
  },
  solar_services: {
    required: [
      'project_type',
      'size_sqft',
      'budget',
      'timeline',
      'contact_pref',
      'callback_time',
    ],
    optional: ['notes'],
  },
  electrical_services: {
    required: [
      'project_type',
      'budget',
      'timeline',
      'contact_pref',
      'callback_time',
    ],
    optional: ['notes'],
  },
  irrigation_automation: {
    required: [
      'project_type',
      'size_sqft',
      'budget',
      'timeline',
      'contact_pref',
      'callback_time',
    ],
    optional: ['notes'],
  },
  event_management: {
    required: [
      'project_type',
      'size_sqft',
      'budget',
      'timeline',
      'contact_pref',
      'callback_time',
    ],
    optional: ['notes'],
  },
  farm_infrastructure: {
    required: [
      'project_type',
      'size_sqft',
      'budget',
      'timeline',
      'contact_pref',
      'callback_time',
    ],
    optional: ['notes'],
  },
  plumbing_services: {
    required: [
      'project_type',
      'budget',
      'timeline',
      'contact_pref',
      'callback_time',
    ],
    optional: ['notes'],
  },
};

/**
 * Returns required datapoint ids for the given service (for completion check).
 */
export function getRequiredFieldsForService(service: string): string[] {
  return policyByService[service]?.required ?? DEFAULT_REQUIRED;
}

/**
 * Returns optional datapoint ids for the given service.
 */
export function getOptionalFieldsForService(service: string): string[] {
  return policyByService[service]?.optional ?? DEFAULT_OPTIONAL;
}

/**
 * Returns full coverage policy for the service.
 */
export function getCoveragePolicyForService(service: string): CoveragePolicy {
  return (
    policyByService[service] ?? {
      required: DEFAULT_REQUIRED,
      optional: DEFAULT_OPTIONAL,
    }
  );
}

/**
 * True if session has values for all required fields for this service.
 */
export function isCoverageSatisfied(
  parameters: Record<string, any>,
  service: string
): boolean {
  const required = getRequiredFieldsForService(service);
  for (const id of required) {
    const val = parameters[id];
    if (val === undefined || val === null) return false;
    if (typeof val === 'object' && val !== null && 'value' in val) {
      if (val.value === undefined || val.value === null) return false;
    }
  }
  return true;
}
