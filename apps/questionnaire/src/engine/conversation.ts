import { Character, CharacterDatapoint } from '../types/character';
import { QuestionnaireDoc } from '../models/Questionnaire';
import { getCharacter } from './characterRegistry';
import { geminiAPIClient } from '@tatvaops/ai';
import { MAX_CONTEXT_TURNS, EXTRACTION_CONFIDENCE_THRESHOLD_AUTO, MAX_TURNS_BEFORE_DIRECT_ASK } from '../config';
import { isCoverageSatisfied, getRequiredFieldsForService } from './coverage-policy';

type LLMClient = (prompt: string) => Promise<string>;

// ============================================================================
// EMOTION & SENTIMENT TRACKING
// ============================================================================

type UserMood = 'positive' | 'neutral' | 'confused' | 'frustrated' | 'rushed' | 'uncertain';

interface ConversationState {
  mood: UserMood;
  moodHistory: UserMood[];
  ambiguousFields: string[];
  clarificationCount: number;
  turnCount: number;
}

const MOOD_INDICATORS = {
  positive: ['great', 'wonderful', 'love', 'excited', 'yes', 'perfect', 'awesome', 'sure', 'definitely', 'amazing', 'happy'],
  confused: ['what', 'huh', 'dont understand', "don't understand", 'confused', 'not sure', 'unclear', 'explain', 'like?', 'meaning', 'how'],
  frustrated: ['already said', 'told you', 'again', 'why', 'stop', 'enough', 'too many', 'long', 'heavy', 'boring'],
  rushed: ['quick', 'fast', 'hurry', 'asap', 'urgent', 'immediately', 'now', 'today'],
  uncertain: ['maybe', 'not sure', 'no idea', 'suggest', 'help me', 'idk', 'dont know', "don't know", 'later', 'decide later']
};

const AMBIGUITY_PHRASES = [
  'something like that', 'maybe', 'kind of', 'sort of', 'not sure', 'i guess',
  'probably', 'around', 'approximately', 'more or less', 'depends', 'flexible',
  'later', 'will decide', 'not decided', 'no idea'
];

// User is asking for suggestions/examples - don't move to next topic!
const CLARIFICATION_REQUEST_PHRASES = [
  'like?', 'like ?', 'like what', 'such as', 'for example', 'examples?',
  'suggest me', 'suggest', 'you tell me', 'what do you mean', 'explain',
  'options?', 'what options', 'can you explain', 'meaning?', 'which ones',
  'help me', 'help me decide', 'what should i', 'what would you',
  'hmm', 'umm', 'not sure what'
];

function detectMood(message: string, previousMood: UserMood): UserMood {
  const lower = message.toLowerCase();
  
  // Check each mood category
  for (const [mood, indicators] of Object.entries(MOOD_INDICATORS)) {
    if (indicators.some(ind => lower.includes(ind))) {
      return mood as UserMood;
    }
  }
  
  // Short answers often indicate user wants to move quickly
  if (message.length < 15 && !lower.includes('?')) {
    return 'neutral';
  }
  
  return previousMood || 'neutral';
}

function detectAmbiguity(message: string): boolean {
  const lower = message.toLowerCase();
  return AMBIGUITY_PHRASES.some(phrase => lower.includes(phrase));
}

function isAskingForClarification(message: string): boolean {
  const lower = message.toLowerCase().trim();
  // Very short "like?" or "?" type responses
  if (lower.length < 15 && (lower.includes('?') || lower.includes('like'))) {
    return true;
  }
  return CLARIFICATION_REQUEST_PHRASES.some(phrase => lower.includes(phrase));
}

function getConversationState(session: QuestionnaireDoc): ConversationState {
  // Extract state from session metadata or initialize
  const meta = (session as any).conversationMeta || {};
  return {
    mood: meta.mood || 'neutral',
    moodHistory: meta.moodHistory || [],
    ambiguousFields: meta.ambiguousFields || [],
    clarificationCount: meta.clarificationCount || 0,
    turnCount: session.transcript?.length || 0
  };
}

function updateConversationState(session: QuestionnaireDoc, state: ConversationState): void {
  (session as any).conversationMeta = state;
}

// ============================================================================
// HUMAN-LIKE RESPONSE TEMPLATES
// ============================================================================

const ACKNOWLEDGMENTS = {
  positive: [
    "That's lovely!", "Oh, I like that!", "Great choice!", "Nice!", 
    "That sounds wonderful!", "Love it!", "Perfect!", "Ah, beautiful!"
  ],
  neutral: [
    "Got it.", "Noted!", "Alright.", "Okay!", "Sure thing.", 
    "Makes sense.", "I see.", "Right."
  ],
  confused: [
    "No worries, let me help.", "Let me clarify that.", "I understand, let's simplify.",
    "That's okay, we'll figure it out together."
  ],
  frustrated: [
    "I hear you, let's wrap this up quickly.", "Apologies for the back and forth.",
    "Let me make this simpler.", "I appreciate your patience."
  ],
  rushed: [
    "Quick question then -", "Just one more thing -", "Almost done -",
    "Let's speed this up -"
  ],
  uncertain: [
    "That's totally fine!", "We can decide that later.", "No pressure on this one.",
    "Happy to suggest options!"
  ]
};

const TRANSITION_PHRASES = [
  "Now,", "So,", "Moving on,", "Next up,", "Also,", "By the way,", 
  "One more thing -", "Quick one -", "And", ""
];

// Helper functions for future use - can be used to add variety to responses
function _getRandomAck(mood: UserMood): string {
  const options = ACKNOWLEDGMENTS[mood] || ACKNOWLEDGMENTS.neutral;
  return options[Math.floor(Math.random() * options.length)];
}

function _getRandomTransition(): string {
  return TRANSITION_PHRASES[Math.floor(Math.random() * TRANSITION_PHRASES.length)];
}

// Export for potential future use
export { _getRandomAck as getRandomAck, _getRandomTransition as getRandomTransition };

// ============================================================================
// ENHANCED PROMPTS
// ============================================================================

const ASSISTANT_PROMPT_TEMPLATE = `
SYSTEM:
You are <CHARACTER_NAME>, a real interior design consultant having a natural conversation. NOT a chatbot.
Persona: <PERSONA_SUMMARY>
Tone: <TONE>

YOUR PERSONALITY:
- You're warm, friendly, and genuinely interested in helping
- You speak naturally like a friend, not a form-filler
- You use casual language with occasional Hindi/Kannada phrases if it feels natural
- You remember EVERYTHING the user has shared and reference it naturally
- You NEVER repeat questions about things already discussed

USER'S CURRENT MOOD: <MOOD>
<MOOD_GUIDANCE>

WHAT WE ALREADY KNOW (NEVER ask about these again):
<COLLECTED>

WHAT'S STILL MISSING (ask about the FIRST item in this list only; follow this order):
<PENDING>

QUESTION ORDER RULE: Ask about the FIRST missing item in the list above only. Do NOT ask about budget or timeline until project_type, rooms, size_sqft, and style are already in WHAT WE ALREADY KNOW. Start with project type / property type, then BHK/rooms, then size, then style – only after that ask budget or timeline.

RECENT CONVERSATION:
<TRANSCRIPT>

<AMBIGUITY_SECTION>

<CALL_CONFIRMED_SECTION>

FLOW GUARDRAILS (must follow):
- Do NOT ask about budget or timeline before project type, rooms, size and style are known.
- Do NOT ask any new question after you have confirmed a callback time and the user has acknowledged (e.g. "sure", "ok"). Only sign off.
- Ask exactly ONE topic per message. Do not combine two questions.
- Follow the order of WHAT'S STILL MISSING: ask only the first item.
- Never re-ask something that is already in WHAT WE ALREADY KNOW.

STRICT RULES:
1. Keep response under 180 characters
2. Sound human - use contractions (you're, that's, we'll), be casual like texting a friend
3. ONE question per message, woven naturally into conversation
4. If user seems frustrated or rushed, skip optional fields and focus on essentials
5. Reference something specific they mentioned to show you're listening
6. Vary your responses - never start two messages the same way
7. If they said "2BHK apartment", you know BOTH rooms AND project_type - don't ask again!
8. CONTEXT AWARE: When confirming, use THEIR EXACT words - if callback_time="now", say "I'll call you right away" NOT "tomorrow"
9. CONTRADICTION CHECK: If "avoid" and "style" conflict (e.g., avoid wood but style=wood), acknowledge and clarify

SOUND HUMAN - NO AI HYPHENATING:
- Write like a real person texting: short, natural, no corporate speak
- Avoid over-hyphenated phrases: say "well designed" or "really nice" not "well-designed"; "high quality" not "high-quality"
- No buzzwords like "leverage", "streamline", "optimize", "state-of-the-art"
- Use simple words. Fragments are fine. ("Sounds good." "And the budget?" "Roughly?")

CALLBACK TIME AWARENESS:
- If callback_time is "now" → respond with urgency: "I'll call you right away!"
- If callback_time is "tomorrow" → say "tomorrow" exactly
- NEVER say "tomorrow" when they said "now"

BANNED PHRASES (never use these):
- "Could you please share"
- "To help me understand"
- "That's wonderful/excellent/understood" (overused)
- "Tell me about your space"
- Listing options like "A, B, C, or D"
- Starting with "Achcha" multiple times in a row
- Starting with "Ah" multiple times in a row
- Over-hyphenated adjectives (well-designed, high-quality, state-of-the-art, best-in-class)

VARIETY RULE: Never start 2 consecutive messages the same way. Rotate starters.

CRITICAL - HANDLING "LIKE?" or "SUGGEST ME":
If user asks "like?", "suggest me", "what do you mean?", "explain", "options?", "for example?":
- ONLY give 2-3 brief suggestions/examples
- DO NOT move to a new topic
- DO NOT ask a different question
- WAIT for their choice
Example: User says "Like?" after you ask about style → Reply: "Like modern minimalist, cozy traditional, or maybe industrial? What feels right for your space?" (NO new question!)

GOOD EXAMPLES:
- "Love the traditional vibe! Any specific rooms you want us to focus on?"
- "2BHK, nice! What's the size - roughly how many square feet?"
- "Got it! And the budget you're thinking - ballpark figure?"

Return ONLY your natural response. No JSON, no labels.`;

const CLOSING_PROMPT_TEMPLATE = `
SYSTEM:
You are <CHARACTER_NAME>, ending a conversation naturally.

PROJECT: <PROJECT_TYPE> | STYLE: <STYLE> | CONTACT: <CONTACT_PREF>
CALLBACK TIME: "<CALLBACK_TIME>"
USER'S WHATSAPP: <USER_PHONE>

YOUR TASK:
Write a closing message that:
1. Confirms you'll call on their WhatsApp number
2. Asks if they want to use a different number
3. Mentions the callback time naturally

TEMPLATE TO FOLLOW:
"[Excited line about project]! I'll call you <CALLBACK_TIME> on this WhatsApp number. If you'd prefer a different number, just share it - otherwise reply 'ok' and we're all set! 🙏"

CALLBACK TIME MAPPING:
- "now" → "right away" / "in just a moment"
- "today" / "evening" → "today evening"
- "tomorrow" → "tomorrow"

GOOD EXAMPLE:
"Excited about your 2BHK project! I'll call you tomorrow on this WhatsApp number. If you'd prefer a different number, just share it - otherwise reply 'ok' and we're all set! 🙏"

SOUND HUMAN: Write like a real person texting. No over-hyphenation (no "well-designed", "state-of-the-art"). Use contractions. Keep it warm and natural. Max 200 chars.`;

// Template for clarification prompts - to be used when ambiguous answers need follow-up
export const CLARIFICATION_PROMPT_TEMPLATE = `
SYSTEM:
You are <CHARACTER_NAME>. The user gave an unclear answer. Ask for clarification naturally.

USER SAID: "<USER_MSG>"
YOU ASKED ABOUT: <FIELD>
THEIR MOOD: <MOOD>

Write a friendly, non-robotic clarification (max 150 chars):
- Don't say "could you please clarify"
- Give 2-3 simple options if helpful
- Keep it casual and light
- If they seem frustrated, acknowledge it

Example good clarifications:
- "By 'traditional' - you mean like classic wooden furniture, or more ethnic/Indian style?"
- "5 lakhs total, or per room?"
- "When you say 'soon' - thinking weeks or months?"`;

const EXTRACTION_PROMPT_TEMPLATE = `
SYSTEM:
You are extracting structured data from a natural conversation. Return strict JSON only.

CONTEXT - What the bot just asked:
"<PREVIOUS_MSG>"

USER'S RESPONSE:
"<MESSAGE>"

FIELDS TO EXTRACT (only these):
<DATAPOINTS>

CRITICAL EXTRACTION RULES:
1. CONTEXT MATTERS: Match the user's answer to what was JUST asked
2. callback_time = when to CALL/CONTACT user
   - "now" / "right now" / "immediately" → value:"now", confidence:0.95
   - "today" / "this evening" → value:"today", confidence:0.9
   - "tomorrow" / "tomorrow evening" → value:"tomorrow", confidence:0.9
3. preferred_start = when PROJECT BEGINS (not when to call!)
   - "next week" / "next month" → project start, NOT callback
4. timeline = project DURATION (45 days, 2 months, 6 weeks)
5. rooms: "2BHK" → value:"2BHK", confidence:0.95
6. project_type: "apartment/flat" → value:"apartment", confidence:0.95
7. AMBIGUOUS answers ("maybe", "not sure") → confidence:0.4
8. CLEAR answers → confidence:0.85-0.95
9. NOT mentioned → value:null, confidence:0

IMPORTANT - ANSWERING "WHEN TO CALL":
If bot asked "when to call" or "time to reach you" and user says:
- "now" → callback_time:"now", NOT preferred_start
- "tomorrow" → callback_time:"tomorrow", NOT preferred_start

SPECIAL CASES:
- "traditional old style classics" → style, confidence:0.9
- "5 lakhs" or "5L" → budget:"5 lakhs", confidence:0.9
- "45 days" / "2 months" → timeline, confidence:0.9
- "phone" / "call me" → contact_pref:"phone", confidence:0.95
- "now" / "right now" → callback_time:"now", confidence:0.95
- "tomorrow at 6" → callback_time:"tomorrow evening 6PM", confidence:0.9

Return JSON only: {"field":{"value":..., "confidence":0.0-1.0}, ...}
No markdown, no explanation.`;

function cleanJsonResult(raw: string): string {
  // Remove markdown code blocks
  raw = raw.replace(/```json/g, '').replace(/```/g, '');
  return raw.trim();
}

function defaultLLM(): LLMClient {
  return async (prompt: string) => {
    const response = await geminiAPIClient.generateText({
      model: 'gemini-2.5-flash',
      system: prompt,
      user: '',
      temperature: 0.35,
    });
    return String(response.data);
  };
}

function summarisePersona(character: Character): string {
  const p = character.persona || {};
  return [
    p.role,
    p.experience,
    p.location,
    p.languageStyle,
    p.traits,
    p.archetype,
  ]
    .filter(Boolean)
    .join('; ');
}

function collectPendingDatapoints(session: QuestionnaireDoc, character: Character): CharacterDatapoint[] {
  const points = character.datapoints || [];
  const pending: CharacterDatapoint[] = [];
  for (const dp of points) {
    const hasValue = session.parameters && Object.prototype.hasOwnProperty.call(session.parameters, dp.id);
    if (!hasValue) pending.push(dp);
  }
  return sortPending(pending);
}

// Conversational order to avoid front-loading budget/timeline
const PREFERRED_ORDER = [
  'project_type',
  'size_sqft',
  'rooms',
  'style',
  'must_haves',
  'avoid',
  'site_ready',
  'lighting_pref',
  'materials',
  'design_style',
  'moodboard_refs',
  'notes',
  'budget',
  'timeline',
  'contact_pref',
  'preferred_start',
];

const BASE_FIELDS = ['project_type', 'size_sqft', 'rooms', 'style'];
const LATE_FIELDS = ['budget', 'timeline'];

function hasAllBase(session: QuestionnaireDoc): boolean {
  return BASE_FIELDS.every((f) => session.parameters && Object.prototype.hasOwnProperty.call(session.parameters, f));
}

function isConversationComplete(session: QuestionnaireDoc): boolean {
  return isCoverageSatisfied(session.parameters || {}, session.service);
}

// Utility: count how many fields have been collected (for analytics/logging)
// function countCollectedFields(session: QuestionnaireDoc): number {
//   return Object.keys(session.parameters || {}).length;
// }

function sortPending(pending: CharacterDatapoint[]): CharacterDatapoint[] {
  return [...pending].sort((a, b) => {
    const ia = PREFERRED_ORDER.indexOf(a.id);
    const ib = PREFERRED_ORDER.indexOf(b.id);
    const ra = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
    const rb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
    if (ra !== rb) return ra - rb;
    const pa = a.priority ?? 99;
    const pb = b.priority ?? 99;
    if (pa !== pb) return pa - pb;
    return a.id.localeCompare(b.id);
  });
}

function buildTranscript(session: QuestionnaireDoc): string {
  const turns = session.transcript.slice(-MAX_CONTEXT_TURNS);
  return turns.map((t) => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.text}`).join('\n');
}

function formatPending(pending: CharacterDatapoint[]): string {
  return pending
    .map((p) => `- ${p.id}${p.hint ? `: ${p.hint}` : ''}${p.priority ? ` (p${p.priority})` : ''}`)
    .join('\n');
}

function formatCollected(session: QuestionnaireDoc): string {
  const params = session.parameters || {};
  const entries = Object.entries(params);
  if (entries.length === 0) return 'None yet';
  return entries
    .map(([key, val]) => {
      const v = typeof val === 'object' && val !== null ? (val as any).value : val;
      return `- ${key}: ${v}`;
    })
    .join('\n');
}

export async function generateAssistantReply(
  session: QuestionnaireDoc,
  character: Character,
  opts?: { llm?: LLMClient; lastUserMessage?: string }
): Promise<{ reply: string; askDirect?: string[]; isComplete?: boolean; mood?: UserMood }> {
  const llm = opts?.llm || defaultLLM();
  const pending = collectPendingDatapoints(session, character);
  const collectedBlock = formatCollected(session);
  
  // Get conversation state and detect mood
  const state = getConversationState(session);
  const lastUserMsg = opts?.lastUserMessage || getLastUserMessage(session);
  const currentMood = detectMood(lastUserMsg, state.mood);
  const isAmbiguous = detectAmbiguity(lastUserMsg);
  const wantsClarification = isAskingForClarification(lastUserMsg);
  
  // Update state with new mood
  state.mood = currentMood;
  state.moodHistory.push(currentMood);
  state.turnCount = session.transcript?.length || 0;

  const lastBotMsg = session.transcript?.filter(m => m.role === 'assistant').pop()?.text || '';
  const callbackVal = session.parameters?.callback_time;
  const hasCallbackTime = callbackVal != null && (typeof callbackVal !== 'object' || (callbackVal as any).value != null);
  const botJustConfirmedCall = /connect|call you|looking forward|we'll connect|schedule|talk to you|give you a call/i.test(lastBotMsg);
  const userShortAck = /^(sure|ok|yes|yeah|yep|done|great|sounds good|perfect)$/i.test(lastUserMsg.trim());

  // Check if conversation is complete (all required fields, or call confirmed and user acked)
  if (isConversationComplete(session)) {
    const closingReply = await generateClosingMessage(session, character, llm);
    updateConversationState(session, state);
    return { reply: closingReply, askDirect: [], isComplete: true, mood: currentMood };
  }
  if (hasCallbackTime && botJustConfirmedCall && userShortAck) {
    const closingReply = await generateClosingMessage(session, character, llm);
    updateConversationState(session, state);
    return { reply: closingReply, askDirect: [], isComplete: true, mood: currentMood };
  }

  // If user is frustrated, skip optional fields (only ask for service-required)
  const requiredIds = getRequiredFieldsForService(session.service);
  const effectivePending = currentMood === 'frustrated' || currentMood === 'rushed'
    ? pending.filter(p => requiredIds.includes(p.id))
    : pending;

  const transcriptBlock = buildTranscript(session);
  const personaSummary = summarisePersona(character);
  const tone = character.tone?.primary || '';
  
  // Build mood-specific guidance
  const moodGuidance = getMoodGuidance(currentMood);
  
  // Build ambiguity/clarification section
  let ambiguitySection = '';
  if (wantsClarification) {
    // Get what was last asked about
    const lastBotMsg = session.transcript?.filter(m => m.role === 'assistant').pop()?.text || '';
    ambiguitySection = `
IMPORTANT: User said "${lastUserMsg}" - they want SUGGESTIONS/EXAMPLES!
Last thing you asked about: "${lastBotMsg.substring(0, 100)}"
Your response MUST:
1. Give 2-3 brief options/examples for what YOU JUST ASKED
2. DO NOT ask about a different topic
3. DO NOT move to the next datapoint
4. End with something like "What feels right?" or "Any of these appeal to you?"`;
  } else if (isAmbiguous) {
    ambiguitySection = `\nLAST ANSWER WAS AMBIGUOUS: User said "${lastUserMsg}" - you may need to gently clarify or accept a flexible answer.`;
  }

  let callConfirmedSection = '';
  if (hasCallbackTime && botJustConfirmedCall && userShortAck) {
    callConfirmedSection = `
CRITICAL - CALL ALREADY CONFIRMED: You already said you'll connect/call and the user acknowledged ("sure", "ok", etc.). Do NOT ask any new questions (no storage, no moodboard, nothing). Reply with ONLY a brief sign-off, e.g. "Great, see you then!" or "Talk to you tomorrow!" – one short sentence max.`;
  }

  const prompt = ASSISTANT_PROMPT_TEMPLATE
    .replace('<CHARACTER_NAME>', character.name)
    .replace('<PERSONA_SUMMARY>', personaSummary)
    .replace('<TONE>', tone)
    .replace('<MOOD>', currentMood)
    .replace('<MOOD_GUIDANCE>', moodGuidance)
    .replace('<COLLECTED>', collectedBlock)
    .replace('<TRANSCRIPT>', transcriptBlock || 'No prior context')
    .replace('<PENDING>', effectivePending.length ? formatPending(effectivePending) : 'None - all data collected!')
    .replace('<AMBIGUITY_SECTION>', ambiguitySection)
    .replace('<CALL_CONFIRMED_SECTION>', callConfirmedSection)
    .replace('<MAX_TURNS>', String(character.collectionStrategy?.maxTurnsBeforeDirectAsk || MAX_TURNS_BEFORE_DIRECT_ASK));

  let text = (await llm(prompt)).trim();
  
  // Post-process to ensure human-like response
  text = humanizeResponse(text, currentMood, state.turnCount);

  // askDirect: if high-priority pending exists and turns exceed threshold
  const askDirect: string[] = [];
  let highPriority = effectivePending.filter((p) => (p.priority || 3) <= 2);
  // Defer budget/timeline until base fields are captured
  if (!hasAllBase(session)) {
    highPriority = highPriority.filter((p) => !LATE_FIELDS.includes(p.id));
  }
  if (highPriority.length) {
    askDirect.push(highPriority[0].id);
  }

  updateConversationState(session, state);
  return { reply: text, askDirect, isComplete: false, mood: currentMood };
}

function getLastUserMessage(session: QuestionnaireDoc): string {
  const userMsgs = session.transcript?.filter(t => t.role === 'user') || [];
  return userMsgs[userMsgs.length - 1]?.text || '';
}

function getMoodGuidance(mood: UserMood): string {
  const guidance: Record<UserMood, string> = {
    positive: 'User is engaged and happy. Match their energy, be enthusiastic!',
    neutral: 'Keep it friendly and professional. Move the conversation forward smoothly.',
    confused: 'User seems confused. Simplify your question, maybe give examples or options.',
    frustrated: 'User is getting frustrated. Acknowledge it briefly, be concise, skip non-essential questions.',
    rushed: 'User wants to finish quickly. Be very brief, focus only on must-have info.',
    uncertain: 'User is unsure. Offer gentle suggestions or let them know it\'s okay to decide later.'
  };
  return guidance[mood] || guidance.neutral;
}

// Track last used starter to avoid repetition (simple in-memory, resets on restart)
let lastUsedStarter = '';

function humanizeResponse(text: string, mood: UserMood, turnCount: number): string {
  // Remove robotic phrases
  const roboticPhrases = [
    /^(Understood|Excellent|Wonderful|Great|Perfect)[.!,]?\s*/i,
    /Could you (please )?(share|tell|provide)/gi,
    /To help (me |us )?(understand|better)/gi,
    /Thank you for sharing/gi,
    /I appreciate you sharing/gi,
    /^Achcha,?\s*/i,
    /^Ah,?\s+/i,
    /\bleverage\b/gi,
    /\bstreamline(d|s)?\b/gi,
    /\boptimize(d|s)?\b/gi,
  ];

  let result = text;
  roboticPhrases.forEach(phrase => {
    result = result.replace(phrase, '');
  });

  // De-hyphenate AI-style compounds to sound more human (e.g. "well-designed" -> "well designed")
  const hyphenFixes: [RegExp, string][] = [
    [/\bwell-designed\b/gi, 'well designed'],
    [/\bwell-planned\b/gi, 'well planned'],
    [/\bhigh-quality\b/gi, 'great quality'],
    [/\bstate-of-the-art\b/gi, 'modern'],
    [/\bbest-in-class\b/gi, 'really good'],
    [/\buser-friendly\b/gi, 'easy to use'],
    [/\bready-to-use\b/gi, 'ready to use'],
    [/\bend-to-end\b/gi, 'full'],
    [/\bcutting-edge\b/gi, 'modern'],
    [/\bfirst-class\b/gi, 'top'],
  ];
  hyphenFixes.forEach(([re, replacement]) => {
    result = result.replace(re, replacement);
  });

  // Use mood-appropriate starters for variety
  const moodStarters: Record<UserMood, string[]> = {
    positive: ['Lovely!', 'Nice!', 'Love it!', 'Perfect!', 'Great!', 'Awesome!'],
    neutral: ['Got it!', 'Okay!', 'Right!', 'Alright!', 'Sure!', 'Noted!', 'Cool!', 'Sounds good!'],
    confused: ['Let me help.', 'No worries!', 'Let me explain.', 'Happy to clarify!'],
    frustrated: ['I hear you.', "Let's wrap up.", 'Almost there!', 'Just a couple more.'],
    rushed: ['Quick one -', 'Just this -', 'Last thing -', 'One more -'],
    uncertain: ['No pressure!', "That's fine!", 'We can decide later.', 'Totally okay!'],
  };

  const repetitiveStarters = /^(That's|That sounds|I |So,|Achcha|Ah,)/i;
  if (turnCount > 2 && result.match(repetitiveStarters)) {
    const starters = moodStarters[mood] || moodStarters.neutral;
    const availableStarters = starters.filter(s => s.toLowerCase() !== lastUsedStarter.toLowerCase());
    const randomStarter = availableStarters[Math.floor(Math.random() * availableStarters.length)] || starters[0];
    lastUsedStarter = randomStarter;
    result = result.replace(repetitiveStarters, '').trim();
    result = `${randomStarter} ${result}`;
  }

  result = result.replace(/Achcha,?\s+Achcha/gi, 'Achcha');
  result = result.trim();

  // Normalize double spaces and odd punctuation
  result = result.replace(/\s{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1');

  if (result.length > 200) {
    const sentences = result.split(/[.!?]/);
    result = sentences.slice(0, 2).join('. ').trim();
    if (!result.match(/[.!?]$/)) result += '.';
  }

  return result;
}

async function generateClosingMessage(
  session: QuestionnaireDoc,
  character: Character,
  llm: LLMClient
): Promise<string> {
  const params = session.parameters || {};
  
  // Extract key details for personalized closing
  const contactPref = getParamValue(params, 'contact_pref') || 'phone';
  const callbackTime = getParamValue(params, 'callback_time') || 'soon';
  const projectType = getParamValue(params, 'project_type') || getParamValue(params, 'rooms') || 'project';
  const style = getParamValue(params, 'style') || '';
  const userPhone = session.userRef || 'this number';

  const prompt = CLOSING_PROMPT_TEMPLATE
    .replace(/<CHARACTER_NAME>/g, character.name)
    .replace('<PROJECT_TYPE>', String(projectType))
    .replace('<STYLE>', String(style) || 'their style')
    .replace('<CONTACT_PREF>', String(contactPref))
    .replace('<CALLBACK_TIME>', String(callbackTime))
    .replace('<USER_PHONE>', String(userPhone));

  const closingText = (await llm(prompt)).trim();
  
  // Clean up any extra formalities from the LLM response
  let finalText = closingText
    .replace(/thank you for choosing tatvaops/gi, '')
    .replace(/\n+/g, ' ')
    .trim();
  
  // Ensure reasonable length - increased for the phone confirmation message
  if (finalText.length > 220) {
    const sentences = finalText.split(/[.!]/);
    finalText = sentences.slice(0, 3).join('. ').trim();
    if (!finalText.match(/[.!]$/)) finalText += '!';
  }
  
  return finalText;
}

function getParamValue(params: Record<string, any>, key: string): any {
  const val = params[key];
  if (!val) return null;
  return typeof val === 'object' && val.value !== undefined ? val.value : val;
}

export async function extractDatapointsFromMessage(
  message: string,
  session: QuestionnaireDoc,
  character: Character,
  opts?: { llm?: LLMClient }
): Promise<Record<string, { value: any; confidence: number; isAmbiguous?: boolean }>> {
  const llm = opts?.llm || defaultLLM();
  const pending = collectPendingDatapoints(session, character);
  const isAmbiguous = detectAmbiguity(message);

  const datapointsBlock = pending
    .map((p) => `- ${p.id}: ${p.hint || ''}`)
    .join('\n');

  // Get last assistant message for context - this helps map answers to questions
  const lastBotMsg = session.transcript
    ?.filter(m => m.role === 'assistant')
    .pop()?.text || 'None';

  const prompt = EXTRACTION_PROMPT_TEMPLATE
    .replace('<MESSAGE>', message)
    .replace('<PREVIOUS_MSG>', lastBotMsg.substring(0, 300)) // slightly more context
    .replace('<DATAPOINTS>', datapointsBlock);

  let raw = await llm(prompt);
  raw = cleanJsonResult(raw);

  let parsed: Record<string, { value: any; confidence: number; isAmbiguous?: boolean }> = {};
  try {
    parsed = JSON.parse(raw);
    
    // Mark ambiguous extractions
    if (isAmbiguous) {
      Object.keys(parsed).forEach(key => {
        if (parsed[key] && parsed[key].confidence > 0) {
          parsed[key].isAmbiguous = true;
          // Reduce confidence for ambiguous answers
          parsed[key].confidence = Math.min(parsed[key].confidence, 0.6);
        }
      });
    }
  } catch (e) {
    console.warn('[Extraction] JSON parse failed, falling back to regex:', raw);
    parsed = fallbackRegexExtraction(message, isAmbiguous);
  }
  
  // Context-aware validation: check if extraction makes sense given what was asked
  parsed = validateExtractionContext(parsed, lastBotMsg, message);
  
  return parsed;
}

function fallbackRegexExtraction(message: string, isAmbiguous: boolean): Record<string, { value: any; confidence: number; isAmbiguous?: boolean }> {
  const parsed: Record<string, { value: any; confidence: number; isAmbiguous?: boolean }> = {};
  const baseConfidence = isAmbiguous ? 0.5 : 0.8;
  
  // Budget patterns
  const budgetMatch = /(\d[\d,\.]*)\s*(lakhs?|lacs?|l\b|rs|inr|usd|k\b)/i.exec(message);
  if (budgetMatch) {
    parsed.budget = { value: budgetMatch[0], confidence: baseConfidence, isAmbiguous };
  }
  
  // Timeline patterns (duration)
  const durationMatch = /(\d+)\s*(days?|weeks?|months?)/i.exec(message);
  if (durationMatch) {
    parsed.timeline = { value: durationMatch[0], confidence: baseConfidence, isAmbiguous };
  }
  
  // BHK patterns
  const bhkMatch = /(\d+)\s*bhk/i.exec(message);
  if (bhkMatch) {
    parsed.rooms = { value: bhkMatch[0].toUpperCase(), confidence: 0.95, isAmbiguous: false };
  }
  
  // Square feet patterns
  const sqftMatch = /(\d{3,5})\s*(sqft|sq\.?\s*ft|square\s*feet?|sft)/i.exec(message);
  if (sqftMatch) {
    parsed.size_sqft = { value: parseInt(sqftMatch[1]), confidence: 0.9, isAmbiguous: false };
  }
  
  // Project type patterns
  if (/\b(villa|bungalow)\b/i.test(message)) {
    parsed.project_type = { value: 'villa', confidence: 0.95, isAmbiguous: false };
  } else if (/\b(apartment|flat|apt)\b/i.test(message)) {
    parsed.project_type = { value: 'apartment', confidence: 0.95, isAmbiguous: false };
  } else if (/\b(house|home|independent)\b/i.test(message)) {
    parsed.project_type = { value: 'independent house', confidence: 0.85, isAmbiguous: false };
  }
  
  // Style patterns
  if (/\b(traditional|classic|old\s*style|vintage|heritage)\b/i.test(message)) {
    parsed.style = { value: 'traditional', confidence: 0.85, isAmbiguous };
  } else if (/\b(modern|contemporary|minimal)/i.test(message)) {
    parsed.style = { value: 'modern', confidence: 0.85, isAmbiguous };
  }
  
  // Contact preference
  if (/\b(phone|call|mobile)\b/i.test(message)) {
    parsed.contact_pref = { value: 'phone', confidence: 0.95, isAmbiguous: false };
  } else if (/\b(email|mail)\b/i.test(message)) {
    parsed.contact_pref = { value: 'email', confidence: 0.95, isAmbiguous: false };
  }
  
  // Callback time (when to contact) - check for "now" and immediate responses first
  if (/\b(now|right now|immediately|right away|asap)\b/i.test(message)) {
    parsed.callback_time = { value: 'now', confidence: 0.95, isAmbiguous: false };
  } else {
    const timeMatch = /\b(tomorrow|today|evening|morning|afternoon|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|(\d{1,2})\s*(pm|am)?)\b/i.exec(message);
    if (timeMatch) {
      parsed.callback_time = { value: timeMatch[0], confidence: 0.85, isAmbiguous };
    }
  }
  
  return parsed;
}

function validateExtractionContext(
  parsed: Record<string, { value: any; confidence: number; isAmbiguous?: boolean }>,
  lastBotMsg: string,
  userMsg: string
): Record<string, { value: any; confidence: number; isAmbiguous?: boolean }> {
  const lower = lastBotMsg.toLowerCase();
  
  // If bot asked about contact/call time, any time-related response is callback_time
  const askedAboutCallback = lower.includes('call') || lower.includes('contact') || 
                             lower.includes('reach') || lower.includes('when') && 
                             (lower.includes('good time') || lower.includes('chat'));
  
  if (askedAboutCallback) {
    // "now" / "right now" / "immediately" - definitely callback_time
    if (/\b(now|right now|immediately|right away|asap)\b/i.test(userMsg)) {
      parsed.callback_time = { value: 'now', confidence: 0.95, isAmbiguous: false };
      delete parsed.preferred_start; // Don't confuse with project start
    }
    // Other time expressions when asked about calling
    else if (/tomorrow|today|evening|morning|next week|\d+\s*(pm|am)/i.test(userMsg)) {
      if (!parsed.callback_time) {
        const timeMatch = userMsg.match(/tomorrow|today|evening|morning|next week|\d+\s*(pm|am)/i);
        parsed.callback_time = { value: timeMatch?.[0] || userMsg, confidence: 0.85, isAmbiguous: false };
      }
      // If it was mistakenly assigned to preferred_start, move it
      if (parsed.preferred_start && !parsed.callback_time) {
        parsed.callback_time = parsed.preferred_start;
      }
      delete parsed.preferred_start;
    }
  }
  
  // If bot asked about project START date (not callback), then it's preferred_start
  const askedAboutProjectStart = lower.includes('start') && (lower.includes('project') || lower.includes('work'));
  if (askedAboutProjectStart && /next week|next month|monday|january|february/i.test(userMsg)) {
    if (parsed.callback_time && !parsed.preferred_start) {
      parsed.preferred_start = parsed.callback_time;
      delete parsed.callback_time;
    }
  }
  
  // If bot asked about project timeline/duration and user gave duration, it's timeline
  if ((lower.includes('timeline') || lower.includes('complete') || lower.includes('duration') || lower.includes('how long')) &&
      /\d+\s*(days?|weeks?|months?)/i.test(userMsg)) {
    const durationMatch = userMsg.match(/\d+\s*(days?|weeks?|months?)/i);
    if (durationMatch) {
      parsed.timeline = { value: durationMatch[0], confidence: 0.9, isAmbiguous: false };
    }
    if (parsed.preferred_start && !parsed.timeline) {
      parsed.timeline = parsed.preferred_start;
      delete parsed.preferred_start;
    }
  }
  
  return parsed;
}

export function applyExtracted(
  session: QuestionnaireDoc,
  extracted: Record<string, { value: any; confidence: number }>
) {
  if (!session.parameters) session.parameters = {};
  Object.entries(extracted || {}).forEach(([key, val]) => {
    if (!val) return;
    const conf = typeof val.confidence === 'number' ? val.confidence : 0;
    if (conf >= EXTRACTION_CONFIDENCE_THRESHOLD_AUTO) {
      (session.parameters as any)[key] = { value: val.value, confidence: conf, ts: new Date().toISOString() };
      // eslint-disable-next-line no-console
      console.log('[slot_extracted]', key, val.value, conf);
    }
  });
}

export function getCharacterOrThrow(id: string): Character {
  const ch = getCharacter(id);
  if (!ch) throw new Error(`Character not found: ${id}`);
  return ch;
}

