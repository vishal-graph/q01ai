/**
 * Prompt engineering helpers
 */

/**
 * Format a structured prompt with clear sections
 */
export function formatPrompt(sections: Record<string, string>): string {
  return Object.entries(sections)
    .map(([key, value]) => `### ${key}\n${value}`)
    .join('\n\n');
}

/**
 * Create a JSON schema instruction
 */
export function jsonSchemaInstruction(schema: string): string {
  return `You must respond with ONLY valid JSON matching this structure:\n\`\`\`json\n${schema}\n\`\`\`\n\nDo not include any explanation or markdown formatting. Return only the raw JSON.`;
}

/**
 * Add few-shot examples to a prompt
 */
export function withExamples(
  basePrompt: string,
  examples: Array<{ input: string; output: string }>
): string {
  const examplesText = examples
    .map(
      (ex, i) => `**Example ${i + 1}:**\nInput: ${ex.input}\nOutput: ${ex.output}`
    )
    .join('\n\n');

  return `${basePrompt}\n\n## Examples\n${examplesText}`;
}

/**
 * Add constraints/guardrails to a prompt
 */
export function withGuardrails(basePrompt: string, guardrails: string[]): string {
  const guardrailsText = guardrails.map((g, i) => `${i + 1}. ${g}`).join('\n');
  return `${basePrompt}\n\n## Constraints\n${guardrailsText}`;
}

/**
 * Create a multi-perspective analysis prompt
 */
export function multiPerspectivePrompt(
  perspectives: string[],
  context: string
): string {
  const perspectivesText = perspectives
    .map((p) => `- ${p} Perspective`)
    .join('\n');

  return `Analyze the following from multiple perspectives:\n${perspectivesText}\n\nContext:\n${context}`;
}

