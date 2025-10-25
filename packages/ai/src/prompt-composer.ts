/**
 * Dynamic prompt composer using character metadata
 * Replaces hardcoded prompts with character-aware, context-sensitive prompts
 */

import { pickCharacter, Service } from "@tatvaops/core";
import { jsonSchemaInstruction } from "./prompts/helpers";

export type Stage = "enquiry" | "summarizer" | "milestone";

/**
 * Compose system prompt based on character and stage
 * This is the core function that makes prompts character-aware
 */
export function composeSystemPrompt(service: Service, stage: Stage): string {
  const character = pickCharacter(service);
  
  // Base guardrail preamble (applies to all stages)
  const guardrailPreamble = buildGuardrailPreamble(character);
  
  switch (stage) {
    case "enquiry":
      return composeEnquiryPrompt(character, guardrailPreamble);
    case "summarizer":
      return composeSummarizerPrompt(character, guardrailPreamble);
    case "milestone":
      return composeMilestonePrompt(character, guardrailPreamble);
    default:
      throw new Error(`Unknown stage: ${stage}`);
  }
}

/**
 * Build guardrail preamble from character config
 */
function buildGuardrailPreamble(character: any): string {
  const universalGuardrails = [
    "DO: Be professional, empathetic, and culturally respectful",
    "DO: Reflect the consultant's tone and communication style",
    "DO: Return strictly the requested format",
    "DO NOT: Promise discounts, legal approvals, exact pricing, or vendor favoritism",
    "DO NOT: Expose personal data, private keys, or external links",
    "If user asks for exact price: reply with ranges + factors + suggest next step",
  ];
  
  const characterGuardrails = character.guardrails || [];
  
  const allGuardrails = [...universalGuardrails, ...characterGuardrails];
  
  return `[GUARDRAILS]\n${allGuardrails.map((g, i) => `${i + 1}. ${g}`).join("\n")}`;
}

/**
 * Compose prompt for enquiry/conversation stage with 9-parameter model
 */
export function composeEnquiryPrompt(character: any, guardrails: string): string {
  const parameters = character.prompts.enquiry.parameters || [];
  const collectionFlow = character.prompts.enquiry.collectionFlow || 
    "Ask questions one at a time, validate responses, and collect all required parameters.";
  
  // Build parameter guidance section
  const parameterGuidance = parameters.length > 0 
    ? buildParameterGuidanceSection(parameters)
    : `[LEGACY FIELDS] ${character.prompts.enquiry.fields.join(", ")}`;
  
  const sections = [
    `[ROLE] You are ${character.name}, a ${character.service} consultant for TatvaOps in ${character.region.state}${character.region.city ? ", " + character.region.city : ""}.`,
    `[PERSONA] ${character.persona}`,
    `[QUALIFICATION] ${character.qualification || "Expert consultant"}`,
    `[TONE] ${character.tone}`,
    `[LANGUAGE] Primary: ${character.language.primary}, Secondary: ${Array.isArray(character.language.secondary) ? character.language.secondary.join("/") : (character.language.secondary || "None")}. Locale: ${character.language.locale}`,
    `[OPENING PHRASES] When greeting users, prefer these natural openings: ${(character.language.openingPhrases || ["Hello!"]).join(" | ")}`,
    `[EMOTIONAL INTELLIGENCE] Detect these signals and respond with empathy: ${(character.eq?.detection || []).join(", ")}`,
    `[EQ MODULATION] ${buildEQModulationHints(character.eq)}`,
    guardrails,
    // Simplicity and style constraints to ensure user-friendly questions
    `[SIMPLICITY RULES]
1. Use short sentences (≤ 15 words each).
2. Avoid jargon; prefer everyday words.
3. Ask ONE question at a time. Do not compound questions.
4. If the user seems unsure, offer a simple example or range.
5. Acknowledge good answers briefly (e.g., "Got it.", "Perfect.", "Thanks.").
6. Keep options to 3–4 choices when offering choices.
7. Prefer measurements in the user's units; if unknown, ask which they prefer.`,
    `[QUESTION STYLE]
• Opening question template: "To start, what is the [parameter] in simple terms?"
• Re-ask (unclear) template: "Just to be sure—about [parameter], is it closer to [A] or [B]?"
• Affirmation template: "Thanks—that helps." / "Great, noted." / "Perfect, moving on."`,
    `[CONVERSATIONAL COLLECTION FLOW] ${collectionFlow}`,
    parameterGuidance,
    `[STYLE] ${character.prompts.enquiry.style}`,
    `[OUTPUT]
• Respond conversationally as ${character.name}.
• Do NOT prefix responses with role labels like "assistant:" or "user:".
• Introduce yourself only once at the start; avoid re-introductions mid-conversation.
• Ask ONE short, clear question at a time based on missing parameters.
• Use a brief affirmation when appropriate.
• If the user's reply is ambiguous, re-ask using the re-ask template.
• Track collected parameters internally. When all are collected, summarize and confirm.`,
  ];
  
  return sections.join("\n\n");
}

/**
 * Build parameter guidance section from 9-parameter model
 */
function buildParameterGuidanceSection(parameters: any[]): string {
  let guidance = "[9-PARAMETER COLLECTION MODEL]\n\n";
  guidance += "You must collect these 9 key parameters through natural conversation:\n\n";
  
  parameters.forEach((param, index) => {
    guidance += `${index + 1}. ${param.label} (ID: ${param.id})\n`;
    guidance += `   Purpose: ${param.purpose}\n`;
    guidance += `   Question Intent: ${param.questionIntent}\n`;
    guidance += `   AI Guidance: ${param.aiGuidance}\n`;
    guidance += `   Response Type: ${param.responseType}\n`;
    
    if (param.exampleQuestions && param.exampleQuestions.length > 0) {
      guidance += `   Example Questions:\n`;
      param.exampleQuestions.forEach((q: string) => {
        guidance += `      - "${q}"\n`;
      });
    }
    
    if (param.validation) {
      guidance += `   Validation: ${param.validation.rules?.join(" | ") || "Standard validation"}\n`;
      if (param.validation.followUps && param.validation.followUps.length > 0) {
        guidance += `   Follow-ups:\n`;
        param.validation.followUps.slice(0, 2).forEach((f: string) => {
          guidance += `      - ${f}\n`;
        });
      }
    }
    
    if (param.emotionCues) {
      const cues = Object.entries(param.emotionCues).slice(0, 3);
      if (cues.length > 0) {
        guidance += `   Emotion Handling: ${cues.map(([emotion, tone]) => `${emotion}→${tone}`).join(", ")}\n`;
      }
    }
    
    guidance += `   Usage: ${param.usageInProcess}\n\n`;
  });
  
  guidance += "**Collection Strategy:**\n";
  guidance += "- Ask questions in contextually relevant order (not necessarily 1-9 sequence)\n";
  guidance += "- Adapt based on user's answers and emotional state\n";
  guidance += "- Use parameter guidance and example questions for phrasing\n";
  guidance += "- Validate each answer before moving to next parameter\n";
  guidance += "- Mark parameters as collected internally\n";
  guidance += "- Once all 9 are complete, provide a structured summary\n";
  
  return guidance;
}

/**
 * Build EQ modulation hints for empathetic responses
 */
function buildEQModulationHints(eq: any): string {
  if (!eq || !eq.modulation) return "Respond with empathy based on user's emotional state.";
  
  const modulations = Object.entries(eq.modulation).slice(0, 5);
  const hints = modulations.map(([signal, tone]) => `${signal}→${tone}`).join(", ");
  
  return `When user shows: ${hints}... adapt tone accordingly.`;
}

/**
 * Compose prompt for summarizer stage
 */
function composeSummarizerPrompt(character: any, guardrails: string): string {
  const summarySchema = `{
  "userPerspective": {
    "keyNeeds": ["string"],
    "painPoints": ["string"],
    "expectations": ["string"],
    "constraints": ["string"],
    "decisionFactors": ["string"]
  },
  "salesPerspective": {
    "keyNeeds": ["string"],
    "painPoints": ["string"],
    "expectations": ["string"],
    "constraints": ["string"],
    "decisionFactors": ["string"]
  },
  "vendorPerspective": {
    "keyNeeds": ["string"],
    "painPoints": ["string"],
    "expectations": ["string"],
    "constraints": ["string"],
    "decisionFactors": ["string"]
  },
  "rawSummary": "string"
}`;
  
  const sections = [
    `[ROLE] You are ${character.name}, generating a multi-perspective summary for a ${character.service} enquiry.`,
    `[REGION] ${character.region.state}/${character.region.city || "—"}. Consider regional factors, material availability, and local market conditions.`,
    `[TONE] ${character.tone}`,
    `[EXPERTISE] ${character.persona}`,
    guardrails,
    `[TASK] ${character.prompts.summarizer.system}`,
    `[OUTPUT FORMAT]`,
    jsonSchemaInstruction(summarySchema),
    `Return STRICT JSON only. No prose outside JSON.`,
  ];
  
  return sections.join("\n\n");
}

/**
 * Compose prompt for milestone planning stage
 */
function composeMilestonePrompt(character: any, guardrails: string): string {
  const rules = character.prompts.milestone?.rules || [];
  const notes = character.prompts.milestone?.notes || "";
  
  const sections = [
    `[ROLE] You are ${character.name}, creating a detailed milestone plan for a ${character.service} project.`,
    `[REGION] ${character.region.state}/${character.region.city || "—"}`,
    `[TONE] ${character.tone}`,
    `[EXPERTISE] ${character.persona}`,
    guardrails,
    rules.length > 0 ? `[BUSINESS RULES]\n${rules.map((r: string, i: number) => `${i + 1}. ${r}`).join("\n")}` : "",
    notes ? `[REGIONAL NOTES] ${notes}` : "",
    `[OUTPUT] Return a structured milestone plan compatible with MilestonePlan schema. Include payment percentages that total 100%.`,
  ].filter(Boolean);
  
  return sections.join("\n\n");
}

/**
 * Generate personalized greeting for a user
 * Useful for first interaction or welcome messages
 */
export function personalizationHints(service: Service, userName?: string): string {
  const character = pickCharacter(service);
  
  const opening = 
    character.language?.openingPhrases?.[0] || 
    `Hello! I'm ${character.name}.`;
  
  return userName ? `${opening} ${userName}` : opening;
}

/**
 * Get character-specific fields to collect during enquiry
 */
export function getRequiredFields(service: Service): string[] {
  const character = pickCharacter(service);
  return character.prompts.enquiry.fields || [];
}

/**
 * Get character-specific milestone rules
 */
export function getMilestoneRules(service: Service): string[] {
  const character = pickCharacter(service);
  return character.prompts.milestone?.rules || [];
}

/**
 * Compose user prompt with context
 */
export function composeUserPrompt(data: {
  hardText: string;
  slots?: Record<string, unknown>;
  userName?: string;
}): string {
  const slotsText = data.slots && Object.keys(data.slots).length > 0
    ? `\n\n**Extracted Information:**\n${JSON.stringify(data.slots, null, 2)}`
    : '';
  
  const userNameText = data.userName 
    ? `**User:** ${data.userName}\n\n`
    : '';
  
  return `${userNameText}**Client Message:**\n${data.hardText}${slotsText}`;
}

