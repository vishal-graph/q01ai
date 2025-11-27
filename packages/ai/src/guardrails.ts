/**
 * Guardrail Enforcement System
 * Scans AI outputs for policy violations and repairs/masks problematic content
 * Ensures compliance with business rules and safety guidelines
 */

export type GuardrailViolation =
  | "pricing:exact"
  | "legal:promise"
  | "vendor:bias"
  | "privacy:leak"
  | "unsafe:advice"
  | "timeline:guarantee"
  | "approval:guarantee";

/**
 * Pattern matchers for different violation types
 */
const VIOLATION_PATTERNS: Record<GuardrailViolation, RegExp> = {
  // Exact pricing in Indian currency formats
  "pricing:exact": /(?:₹|rs\.?|inr\s*)[,\s]*\d{1,3}(?:,\d{2,3})*(?:\.\d+)?(?:\s*(?:lakh|lac|cr|crore)s?)?/i,
  
  // Legal guarantees/promises
  "legal:promise": /\b(?:guarantee[sd]?|promise[sd]?|assure[sd]?|certif(?:y|ied))\s+(?:approval|permit|license|clearance|sanction)/i,
  
  // Vendor/brand bias
  "vendor:bias": /\b(?:only use|must use|exclusively|always choose)\s+(?:brand|vendor|supplier|manufacturer)\s+\w+/i,
  
  // Privacy/security leaks
  "privacy:leak": /\b(?:password|api[-_]?key|token|secret|private[-_]?key|camera\s+feed|live\s+stream|admin\s+portal)/i,
  
  // Unsafe technical advice
  "unsafe:advice": /\b(?:skip|bypass|ignore|disable)\s+(?:safety|security|compliance|permit|inspection)/i,
  
  // Timeline guarantees
  "timeline:guarantee": /\b(?:definitely|guaranteed|certainly|will\s+(?:be\s+)?complete[sd]?)\s+(?:in|within|by)\s+\d+\s+(?:day|week|month)s?/i,
  
  // Approval guarantees
  "approval:guarantee": /\b(?:will\s+(?:definitely\s+)?get|guaranteed|assured)\s+(?:approval|permit|clearance|sanction|noc)/i,
};

/**
 * Get guardrail preamble for character
 * This is injected into system prompts
 */
export function preamble(character: any): string {
  const characterGuardrails = character.guardrails || [];
  
  const universal = [
    "Always maintain professional and ethical standards",
    "Provide ranges and estimates, not exact prices",
    "Never guarantee government approvals or timelines",
    "Respect privacy and data security",
    "Promote safety and compliance",
    "Remain vendor-neutral unless explicitly authorized",
  ];
  
  const all = [...universal, ...characterGuardrails];
  
  return `\n[CRITICAL GUARDRAILS]\n${all.map((g, i) => `${i + 1}. ${g}`).join("\n")}\n`;
}

/**
 * Scan text for guardrail violations
 * Returns array of detected violations
 */
export function scan(text: string): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];
  
  for (const [violation, pattern] of Object.entries(VIOLATION_PATTERNS)) {
    if (pattern.test(text)) {
      violations.push(violation as GuardrailViolation);
    }
  }
  
  return violations;
}

/**
 * Scan and return detailed violation info
 */
export function scanDetailed(text: string): Array<{
  violation: GuardrailViolation;
  matches: string[];
  severity: "low" | "medium" | "high";
}> {
  const results: Array<{
    violation: GuardrailViolation;
    matches: string[];
    severity: "low" | "medium" | "high";
  }> = [];
  
  const severityMap: Record<GuardrailViolation, "low" | "medium" | "high"> = {
    "pricing:exact": "medium",
    "legal:promise": "high",
    "vendor:bias": "medium",
    "privacy:leak": "high",
    "unsafe:advice": "high",
    "timeline:guarantee": "medium",
    "approval:guarantee": "high",
  };
  
  for (const [violation, pattern] of Object.entries(VIOLATION_PATTERNS)) {
    const matches = text.match(pattern);
    if (matches) {
      results.push({
        violation: violation as GuardrailViolation,
        matches: [...new Set(matches)], // Deduplicate
        severity: severityMap[violation as GuardrailViolation],
      });
    }
  }
  
  return results;
}

/**
 * Repair text by masking/replacing violations
 * Returns repaired text with violations fixed
 */
export function repair(text: string, violations: GuardrailViolation[]): string {
  if (violations.length === 0) return text;
  
  let repaired = text;
  
  for (const violation of violations) {
    switch (violation) {
      case "pricing:exact":
        repaired = repaired.replace(
          VIOLATION_PATTERNS["pricing:exact"],
          "a budget range based on materials, scope, and market rates"
        );
        repaired += "\n\n**Note:** Exact pricing isn't provided at this stage. We'll share a detailed Bill of Quantities (BOQ) after site assessment and requirement finalization.";
        break;
        
      case "legal:promise":
      case "approval:guarantee":
        repaired = repaired.replace(
          VIOLATION_PATTERNS[violation],
          "will assist with and support the approval process"
        );
        repaired += "\n\n**Note:** Approval timelines depend on local authorities. We'll guide you through the process but cannot guarantee specific outcomes or timelines.";
        break;
        
      case "vendor:bias":
        repaired = repaired.replace(
          VIOLATION_PATTERNS["vendor:bias"],
          "will recommend from our panel of certified vendors"
        );
        repaired += "\n\n**Note:** We maintain vendor neutrality and will provide multiple certified options for your consideration.";
        break;
        
      case "privacy:leak":
        repaired = repaired.replace(
          VIOLATION_PATTERNS["privacy:leak"],
          "[REDACTED - SENSITIVE INFORMATION]"
        );
        repaired += "\n\n**Security Note:** Sensitive credentials and access information are never shared through this channel.";
        break;
        
      case "unsafe:advice":
        repaired = repaired.replace(
          VIOLATION_PATTERNS["unsafe:advice"],
          "ensure proper compliance with safety and regulatory requirements for"
        );
        repaired += "\n\n**Safety Note:** All projects must comply with applicable safety standards and building codes.";
        break;
        
      case "timeline:guarantee":
        repaired = repaired.replace(
          VIOLATION_PATTERNS["timeline:guarantee"],
          "is typically completed within the estimated timeframe, subject to factors like weather, material availability, and approvals"
        );
        repaired += "\n\n**Note:** Timelines are estimates and may vary based on external factors beyond our control.";
        break;
    }
  }
  
  return repaired;
}

/**
 * Smart repair with context awareness
 * Attempts to preserve meaning while fixing violations
 */
export function smartRepair(text: string): {
  repaired: string;
  violations: Array<{ type: GuardrailViolation; severity: string }>;
  changed: boolean;
} {
  const detailed = scanDetailed(text);
  
  if (detailed.length === 0) {
    return {
      repaired: text,
      violations: [],
      changed: false,
    };
  }
  
  const violations = detailed.map(d => d.violation);
  const repaired = repair(text, violations);
  
  return {
    repaired,
    violations: detailed.map(d => ({
      type: d.violation,
      severity: d.severity,
    })),
    changed: true,
  };
}

/**
 * Validate that a response complies with guardrails
 * Returns compliance status and issues
 */
export function validate(text: string): {
  compliant: boolean;
  issues: Array<{
    violation: GuardrailViolation;
    severity: "low" | "medium" | "high";
    matches: string[];
  }>;
} {
  const detailed = scanDetailed(text);
  
  return {
    compliant: detailed.length === 0,
    issues: detailed,
  };
}

/**
 * Create a guardrail report for logging/monitoring
 */
export function createReport(text: string): {
  scannedAt: string;
  textLength: number;
  violations: Array<{
    type: GuardrailViolation;
    severity: "low" | "medium" | "high";
    count: number;
  }>;
  compliant: boolean;
  requiresRepair: boolean;
} {
  const detailed = scanDetailed(text);
  
  return {
    scannedAt: new Date().toISOString(),
    textLength: text.length,
    violations: detailed.map(d => ({
      type: d.violation,
      severity: d.severity,
      count: d.matches.length,
    })),
    compliant: detailed.length === 0,
    requiresRepair: detailed.some(d => d.severity === "high"),
  };
}

/**
 * Pre-flight check for prompts
 * Ensures prompts don't accidentally encourage violations
 */
export function preflightPrompt(prompt: string): {
  safe: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  // Check if prompt explicitly asks for exact pricing
  if (/\b(?:tell|give|provide)\s+(?:exact|specific)\s+price/i.test(prompt)) {
    warnings.push("Prompt requests exact pricing - this may lead to violations");
  }
  
  // Check if prompt asks for guarantees
  if (/\b(?:guarantee|promise|assure)\b/i.test(prompt)) {
    warnings.push("Prompt contains guarantee language - may trigger violations");
  }
  
  // Check for vendor bias encouragement
  if (/\b(?:best|only|always)\s+(?:vendor|brand|supplier)/i.test(prompt)) {
    warnings.push("Prompt may encourage vendor bias");
  }
  
  return {
    safe: warnings.length === 0,
    warnings,
  };
}

