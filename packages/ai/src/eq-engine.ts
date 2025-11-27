/**
 * Emotional Intelligence (EQ) Engine
 * Detects user emotional signals and modulates responses accordingly
 * Adds empathy phrases and adjusts tone based on context
 */

export interface EQConfig {
  empathyPhrases: string[];
  detection: string[];
  modulation: Record<string, string>;
}

/**
 * Detect emotional signals in user input
 * Returns the first detected signal or null
 */
export function detectSignal(eq: EQConfig, text: string): string | null {
  const lower = text.toLowerCase();
  
  // Find first matching signal
  const signal = eq.detection.find(keyword => {
    // Support both exact match and word boundary match
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lower);
  });
  
  return signal || null;
}

/**
 * Detect all emotional signals in user input
 * Returns array of all detected signals
 */
export function detectAllSignals(eq: EQConfig, text: string): string[] {
  const lower = text.toLowerCase();
  
  return eq.detection.filter(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(lower);
  });
}

/**
 * Pick an appropriate empathy phrase based on detected signal
 * Returns null if no signal detected
 */
export function pickEmpathyLine(eq: EQConfig, signal: string | null): string | null {
  if (!signal) return null;
  
  // Randomly select from available empathy phrases
  const phrases = eq.empathyPhrases;
  if (!phrases || phrases.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * phrases.length);
  return phrases[randomIndex];
}

/**
 * Suggest tone modulation based on detected signal
 * Returns the recommended tone adjustment or null
 */
export function suggestModulation(eq: EQConfig, signal: string | null): string | null {
  if (!signal) return null;
  
  return eq.modulation[signal] || null;
}

/**
 * Build a modulated response prefix based on detected tone
 * This can be prepended to AI responses to adjust the communication style
 */
export function buildModulationPrefix(modulation: string | null): string {
  if (!modulation) return "";
  
  const prefixes: Record<string, string> = {
    reassuring: "Let me reassure you:",
    focused: "Let's focus on the essentials:",
    patient: "Let me explain this step by step:",
    practical: "Here's a practical approach:",
    transparent: "To be completely transparent:",
    "value-focused": "To maximize value:",
    simplifying: "Let me simplify this:",
    enthusiastic: "I'm excited to share:",
    clarifying: "To clarify:",
    "solution-oriented": "Here's what we can do:",
    technical: "From a technical perspective:",
    basic: "In simple terms:",
  };
  
  return prefixes[modulation] || "";
}

/**
 * Craft an emotionally intelligent assistant reply
 * Combines base response with empathy and tone modulation
 */
export function craftAssistantReply(
  eq: EQConfig,
  userUtterance: string,
  baseResponse: string
): string {
  // Detect emotional signals
  const signal = detectSignal(eq, userUtterance);
  
  // Get empathy phrase if signal detected
  const empathy = pickEmpathyLine(eq, signal);
  
  // Get tone modulation suggestion
  const modulation = suggestModulation(eq, signal);
  
  // Build modulation prefix
  const modulationPrefix = buildModulationPrefix(modulation);
  
  // Assemble response
  const parts = [];
  
  // Add empathy first (if available)
  if (empathy) {
    parts.push(empathy);
  }
  
  // Add modulated response
  if (modulationPrefix) {
    parts.push(`${modulationPrefix} ${baseResponse}`);
  } else {
    parts.push(baseResponse);
  }
  
  return parts.join("\n\n");
}

/**
 * Analyze emotional intensity of user input
 * Returns a score from 0 (neutral) to 1 (very emotional)
 */
export function analyzeEmotionalIntensity(eq: EQConfig, text: string): number {
  const signals = detectAllSignals(eq, text);
  
  // Count exclamation marks and question marks
  const exclamationCount = (text.match(/!/g) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;
  
  // Check for CAPS LOCK (words in all caps)
  const wordsInCaps = (text.match(/\b[A-Z]{2,}\b/g) || []).length;
  
  // Calculate intensity score
  let intensity = 0;
  
  // Signals contribute (max 0.4)
  intensity += Math.min(signals.length * 0.1, 0.4);
  
  // Exclamation marks contribute (max 0.3)
  intensity += Math.min(exclamationCount * 0.1, 0.3);
  
  // Question marks contribute (max 0.2)
  intensity += Math.min(questionCount * 0.05, 0.2);
  
  // Caps lock words contribute (max 0.1)
  intensity += Math.min(wordsInCaps * 0.05, 0.1);
  
  return Math.min(intensity, 1.0);
}

/**
 * Get recommended response approach based on emotional analysis
 */
export function getResponseApproach(intensity: number): {
  approach: string;
  guidelines: string[];
} {
  if (intensity < 0.2) {
    return {
      approach: "neutral",
      guidelines: [
        "Maintain professional tone",
        "Provide clear information",
        "Be concise and factual",
      ],
    };
  }
  
  if (intensity < 0.5) {
    return {
      approach: "empathetic",
      guidelines: [
        "Acknowledge their feelings",
        "Be supportive and warm",
        "Provide reassurance",
      ],
    };
  }
  
  if (intensity < 0.8) {
    return {
      approach: "highly-empathetic",
      guidelines: [
        "Lead with strong empathy",
        "Validate their concerns",
        "Be patient and understanding",
        "Offer solutions gradually",
      ],
    };
  }
  
  return {
    approach: "crisis-response",
    guidelines: [
      "Prioritize emotional support",
      "Acknowledge urgency/frustration",
      "Break down complex issues",
      "Offer immediate next steps",
    ],
  };
}

/**
 * Create an emotionally aware system prompt addition
 * Can be appended to existing system prompts for better EQ
 */
export function createEQSystemPrompt(eq: EQConfig): string {
  return `
[EMOTIONAL INTELLIGENCE]
You are trained to detect and respond to emotional cues in user messages.

**Signals to Watch For:**
${eq.detection.map(s => `- "${s}"`).join("\n")}

**Empathy Phrases (use when appropriate):**
${eq.empathyPhrases.map((p, i) => `${i + 1}. ${p}`).join("\n")}

**Tone Modulation Map:**
${Object.entries(eq.modulation).map(([signal, tone]) => `- When user is "${signal}" → Use "${tone}" tone`).join("\n")}

Always maintain cultural sensitivity and professionalism while being emotionally aware.
`.trim();
}

