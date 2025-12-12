import { Character, CharacterDatapoint } from '../types/character';
import { QuestionnaireDoc } from '../models/Questionnaire';
import { getCharacter } from './characterRegistry';
import { geminiAPIClient } from '../../../../packages/ai/src/index';
import { MAX_CONTEXT_TURNS, EXTRACTION_CONFIDENCE_THRESHOLD_AUTO, MAX_TURNS_BEFORE_DIRECT_ASK } from '../config';

type LLMClient = (prompt: string) => Promise<string>;

const ASSISTANT_PROMPT_TEMPLATE = `
SYSTEM:
You are <CHARACTER_NAME>. Persona: <PERSONA_SUMMARY>.
Tone: <TONE>. Keep reply <= 200 chars. Ask at most one direct data question per reply unless clarifying.
Guardrails: <GUARDRAILS>.
When the user asks domain questions, answer briefly and clearly, then continue the flow.
Defer budget/timeline asks until after you know project type, size, rooms, and style.
If user says "2BHK/3BHK/duplex", acknowledge bedrooms and assume matching bathrooms unless user says otherwise.
Do not list full room breakdowns; keep to home type (apartment/villa/independent house) and bedrooms only if missing.
Vary your affirmations; avoid repeating the same opener (e.g., do not overuse "Understood").

CONTEXT (last turns):
<TRANSCRIPT>

PENDING DATAPOINTS (id: hint, priority):
<PENDING>

EI:
- If user seems stressed, soften tone and reassure.

INSTRUCTION:
Produce a single assistant reply that moves the conversation forward, confirms any inferred datapoints, and only asks a direct question if a high-priority datapoint is still missing or needs confirmation after <MAX_TURNS> turns.
Return assistant text only (no JSON).`;

const EXTRACTION_PROMPT_TEMPLATE = `
SYSTEM:
You are an extractor. Given a user message and datapoints, return strict JSON:
{"datapoint_id":{"value":..., "confidence":0..1}, ...}

USER_MESSAGE:
"<MESSAGE>"

DATAPOINTS:
<DATAPOINTS>

If a datapoint is not present set value:null and confidence:0. JSON only.`;

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

export async function generateAssistantReply(
  session: QuestionnaireDoc,
  character: Character,
  opts?: { llm?: LLMClient }
): Promise<{ reply: string; askDirect?: string[] }> {
  const llm = opts?.llm || defaultLLM();
  const pending = collectPendingDatapoints(session, character);
  const transcriptBlock = buildTranscript(session);
  const personaSummary = summarisePersona(character);
  const guardrails = character.guardrails
    ? Object.values(character.guardrails)
        .filter(Boolean)
        .join('; ')
    : '';
  const tone = character.tone?.primary || '';

  const prompt = ASSISTANT_PROMPT_TEMPLATE.replace('<CHARACTER_NAME>', character.name)
    .replace('<PERSONA_SUMMARY>', personaSummary)
    .replace('<TONE>', tone)
    .replace('<GUARDRAILS>', guardrails)
    .replace('<TRANSCRIPT>', transcriptBlock || 'No prior context')
    .replace('<PENDING>', pending.length ? formatPending(pending) : 'None')
    .replace('<MAX_TURNS>', String(character.collectionStrategy?.maxTurnsBeforeDirectAsk || MAX_TURNS_BEFORE_DIRECT_ASK));

  const text = (await llm(prompt)).trim();

  // askDirect: if high-priority pending exists and turns exceed threshold
  const askDirect: string[] = [];
  let highPriority = pending.filter((p) => (p.priority || 3) <= 2);
  // Defer budget/timeline until base fields are captured
  if (!hasAllBase(session)) {
    highPriority = highPriority.filter((p) => !LATE_FIELDS.includes(p.id));
  }
  if (highPriority.length) {
    askDirect.push(highPriority[0].id);
  }

  return { reply: text, askDirect };
}

export async function extractDatapointsFromMessage(
  message: string,
  session: QuestionnaireDoc,
  character: Character,
  opts?: { llm?: LLMClient }
): Promise<Record<string, { value: any; confidence: number }>> {
  const llm = opts?.llm || defaultLLM();
  const pending = collectPendingDatapoints(session, character);
  const datapointsBlock = pending
    .map((p) => `- ${p.id}: ${p.hint || ''}`)
    .join('\n');

  const prompt = EXTRACTION_PROMPT_TEMPLATE.replace('<MESSAGE>', message).replace('<DATAPOINTS>', datapointsBlock);

  let raw = await llm(prompt);
  raw = raw.trim();
  let parsed: Record<string, { value: any; confidence: number }> = {};
  try {
    parsed = JSON.parse(raw);
  } catch (_) {
    // best-effort simple regex fallback
    const budgetMatch = /(\d[\d,\.]*)\s*(lakhs?|lacs?|rs|inr|usd)/i.exec(message);
    if (budgetMatch) {
      parsed.budget = { value: budgetMatch[0], confidence: 0.5 };
    }
    const timelineMatch = /(weeks?|months?|days?)/i.exec(message);
    if (timelineMatch) {
      parsed.timeline = { value: timelineMatch[0], confidence: 0.5 };
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

