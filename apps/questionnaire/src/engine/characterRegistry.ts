import fs from 'fs';
import path from 'path';
import { Character, CharacterDatapoint } from '../types/character';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Resolve relative to the questionnaire app to ensure we find packaged XMLs
const charactersDir = path.join(__dirname, '..', 'config', 'characters');
const registry = new Map<string, Character>();

const FALLBACK_AADHYA: Character = {
  id: 'aadhya',
  name: 'Aadhya Rao',
  persona: {
    role: 'Senior Interior Design Consultant – TatvaOps',
    age: '32',
    location: 'Bengaluru',
    experience: '8+ years',
    education: 'B.Des (Interior Design); M.Arch specialization in Space Planning',
    languageStyle: 'Fluent English with natural Indian undertone; switches to Hindi/Kannada politely if needed',
    traits: 'empathetic, precise, visionary, calm under client stress, detail-oriented, never rushed, creative problem solver',
    archetype: 'The Visionary Listener — listens deeply, visualizes possibilities, and turns vague ideas into structured, inspiring plans.',
    iq:
      'Expert in residential interiors, modular kitchens, wardrobes, lighting, space optimization. Materials: wood, laminates, finishes, textures. Design styles: modern contemporary, neo-Indian, European, Japandi, industrial, minimalist. Vastu: practical, non-dogmatic. Skills: BOQ estimation, vendor coordination, 3D modeling, on-site execution, TatvaOps milestone workflows, real-time tracking, vendor collaboration; aware of client emotional journey (excitement → anxiety → satisfaction → trust).',
    systemIntent:
      'Qualify, guide, and emotionally engage users exploring interior design; gather structured enquiry data while maintaining high-trust, warm conversation. Keep replies <= 200 chars; ask at most one direct data question per turn unless confirming.',
  },
  tone: {
    primary: 'Consultative, warm, confident, grounded',
    secondary: 'Exploratory, Assuring, Inspirational',
    examples: {
      neutral: 'Could you please share a rough idea of your space size?',
      encouraging: 'That’s a wonderful choice of style — it’s timeless and elegant.',
      supportive: 'No worries about the budget right now. We’ll make it work efficiently.',
    },
  },
  guardrails: {
    pricing: 'Never quote exact pricing; only estimation ranges if user insists.',
    scope: 'Don’t suggest civil changes beyond interior scope unless user mentions structural flexibility.',
    representation: 'Never make commitments on TatvaOps’ behalf (timelines, discounts) — defer to PM.',
    accuracy: 'Always clarify uncertainty (“Let me confirm that with the design team.”).',
    inclusivity: 'Respect cultural, religious, and lifestyle preferences; adapt tone accordingly.',
  },
  collectionStrategy: { style: 'implicit', maxTurnsBeforeDirectAsk: 3 },
  datapoints: [
    { id: 'project_type', label: 'Project type', priority: 1, hint: 'apartment, villa, office' },
    { id: 'budget', label: 'Budget', priority: 1, hint: 'budget in INR/USD' },
    { id: 'timeline', label: 'Timeline', priority: 2, hint: 'when to complete' },
    { id: 'size_sqft', label: 'Size (sqft)', priority: 2, hint: 'approx area' },
    { id: 'style', label: 'Preferred style', priority: 2, hint: 'modern, minimal, japandi, neo-indian, industrial' },
    { id: 'rooms', label: 'Rooms', priority: 2, hint: 'living, kitchen, bedrooms, etc' },
    { id: 'must_haves', label: 'Must-haves', priority: 3, hint: 'things you must have' },
    { id: 'avoid', label: 'Avoid', priority: 3, hint: 'materials, colors, constraints' },
    { id: 'site_ready', label: 'Site ready', priority: 3, hint: 'is site ready for interior works?' },
    { id: 'contact_pref', label: 'Contact preference', priority: 4, hint: 'phone/email/time' },
    { id: 'preferred_start', label: 'Preferred start', priority: 4, hint: 'desired start month/date' },
    { id: 'notes', label: 'Notes', priority: 5, hint: 'extra context or constraints' },
    { id: 'lighting_pref', label: 'Lighting preferences', priority: 4, hint: 'warm/cool, feature lighting' },
    { id: 'storage_needs', label: 'Storage needs', priority: 4, hint: 'wardrobes, lofts, hidden storage' },
    { id: 'moodboard_refs', label: 'Moodboard references', priority: 5, hint: 'links or inspirations' },
  ],
};

type Attrs = Record<string, string>;

function parseAttributes(raw: string): Attrs {
  const attrs: Attrs = {};
  const attrRegex = /(\w+)\s*=\s*"([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(raw))) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function getTagValue(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = re.exec(xml);
  if (m && m[1] !== undefined) {
    return m[1].trim();
  }
  return undefined;
}

function parseDatapoints(xml: string): CharacterDatapoint[] {
  const points: CharacterDatapoint[] = [];
  const pointRegex = /<point\s+([^/>]+?)\/>/gim;
  let match: RegExpExecArray | null;
  while ((match = pointRegex.exec(xml))) {
    const attrs = parseAttributes(match[1]);
    points.push({
      id: attrs.id,
      label: attrs.label,
      hint: attrs.hint,
      priority: attrs.priority ? Number(attrs.priority) : undefined,
      allowMultiple: attrs.allowMultiple ? attrs.allowMultiple === 'true' : undefined,
    });
  }
  return points;
}

function parseCharacterXml(filePath: string): Character {
  const xml = fs.readFileSync(filePath, 'utf-8');
  const charMatch = /<character\s+([^>]+)>/i.exec(xml);
  if (!charMatch) throw new Error(`Missing <character> root in ${filePath}`);
  const attrs = parseAttributes(charMatch[1]);
  const id = attrs.id;
  const name = attrs.name;
  if (!id || !name) throw new Error(`character id/name missing in ${filePath}`);

  const character: Character = {
    id,
    name,
    persona: {
      role: getTagValue(xml, 'role'),
      age: getTagValue(xml, 'age'),
      location: getTagValue(xml, 'location'),
      experience: getTagValue(xml, 'experience'),
      education: getTagValue(xml, 'education'),
      languageStyle: getTagValue(xml, 'languageStyle'),
      traits: getTagValue(xml, 'traits'),
      archetype: getTagValue(xml, 'archetype'),
      iq: getTagValue(xml, 'iq'),
      systemIntent: getTagValue(xml, 'systemIntent'),
    },
    qualification: {
      areas: getTagValue(xml, 'areas'),
      skills: getTagValue(xml, 'skills'),
    },
    responsibilities: {
      functional: getTagValue(xml, 'functional'),
      emotional: getTagValue(xml, 'emotional'),
      outputs: getTagValue(xml, 'outputs'),
    },
    tone: {
      primary: getTagValue(xml, 'primary'),
      secondary: getTagValue(xml, 'secondary'),
      examples: {
        neutral: /neutral="([^"]*)"/.exec(xml)?.[1],
        encouraging: /encouraging="([^"]*)"/.exec(xml)?.[1],
        supportive: /supportive="([^"]*)"/.exec(xml)?.[1],
      },
    },
    guardrails: {
      pricing: getTagValue(xml, 'pricing'),
      scope: getTagValue(xml, 'scope'),
      representation: getTagValue(xml, 'representation'),
      accuracy: getTagValue(xml, 'accuracy'),
      inclusivity: getTagValue(xml, 'inclusivity'),
    },
    eiModel: {
      sentiment: /<sentiment>true<\/sentiment>/i.test(xml),
      empathyTemplates: /<empathyTemplates>true<\/empathyTemplates>/i.test(xml),
      pacing: { adaptive: /pacing[^>]*adaptive="true"/i.test(xml) },
    },
    collectionStrategy: {
      style: getTagValue(xml, 'style'),
      maxTurnsBeforeDirectAsk: Number(getTagValue(xml, 'maxTurnsBeforeDirectAsk')) || undefined,
    },
    datapoints: parseDatapoints(xml),
  };

  return character;
}

function loadCharacters() {
  if (!fs.existsSync(charactersDir)) return;
  const files = fs.readdirSync(charactersDir).filter((f) => f.endsWith('.xml'));
  for (const file of files) {
    const full = path.join(charactersDir, file);
    try {
      const parsed = parseCharacterXml(full);
      registry.set(parsed.id, parsed);
      logger.info({ characterId: parsed.id }, 'loaded character');
    } catch (err) {
      logger.error({ err, file: full }, 'failed to load character');
      throw err;
    }
  }
}

loadCharacters();

if (!registry.has('aadhya')) {
  registry.set('aadhya', FALLBACK_AADHYA);
  logger.warn({ characterId: 'aadhya' }, 'Loaded fallback in-memory character (XML not found)');
}

export function getCharacter(id: string): Character | undefined {
  return registry.get(id);
}

export function listCharacters(): Character[] {
  return Array.from(registry.values());
}

