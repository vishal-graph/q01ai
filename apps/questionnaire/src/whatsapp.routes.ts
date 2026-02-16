import { Router } from 'express';
import twilio from 'twilio';
import pino from 'pino';
import { QuestionnaireStore } from './models/Questionnaire';
import { getCharacter } from './engine/characterRegistry';
import { applyExtracted, extractDatapointsFromMessage, generateAssistantReply } from './engine/conversation';
import { WHATSAPP_FREEFLOW_ENABLED } from './config';
import { generateSixPointSummary } from './summary-generator';

type Session = { questionnaireId: string; lastSeen: number };

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const sessionByPhone = new Map<string, Session>();
const inflight = new Set<string>();

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_NUMBER,
  WHATSAPP_START_PHRASE = 'START',
  WHATSAPP_VERIFY_SIGNATURE = 'true',
  WHATSAPP_SESSION_TTL_MS = '86400000',
} = process.env;

const verifySignatures = (WHATSAPP_VERIFY_SIGNATURE ?? 'true').toLowerCase() !== 'false';
const sessionTtlMs = Number(WHATSAPP_SESSION_TTL_MS) || 24 * 60 * 60 * 1000;
const startPhraseLower = (WHATSAPP_START_PHRASE || 'START').toLowerCase();
const greetingKeywords = ['hi', 'hello', 'hey', 'hola', 'namaste'];

const client =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

function maskPhone(phone: string) {
  if (!phone) return '';
  const clean = phone.replace(/\s+/g, '');
  if (clean.length <= 6) return '***';
  return `${clean.slice(0, 4)}***${clean.slice(-2)}`;
}

function cleanupSessions(now: number) {
  for (const [phone, session] of sessionByPhone.entries()) {
    if (now - session.lastSeen > sessionTtlMs) {
      sessionByPhone.delete(phone);
    }
  }
}

function getActiveSession(phone: string, now: number) {
  const session = sessionByPhone.get(phone);
  if (!session) return null;
  if (now - session.lastSeen > sessionTtlMs) {
    sessionByPhone.delete(phone);
    return null;
  }
  return session;
}

function getRawBody(req: any): string | undefined {
  return typeof req?.rawBody === 'string' ? req.rawBody : undefined;
}

function validateSignature(req: any): boolean {
  if (!verifySignatures) return true;
  if (!TWILIO_AUTH_TOKEN) {
    logger.error('Twilio signature validation enabled but TWILIO_AUTH_TOKEN is missing');
    return false;
  }

  const signature = req.get?.('x-twilio-signature') as string | undefined;
  if (!signature) {
    logger.warn('Missing X-Twilio-Signature header');
    return false;
  }

  const url =
    process.env.WHATSAPP_WEBHOOK_URL ||
    `${req.protocol}://${req.get('host')}${req.originalUrl || ''}`;

  const rawBody = getRawBody(req);
  const paramsForSignature = rawBody ?? (req.body as Record<string, any>);

  const valid = twilio.validateRequest(
    TWILIO_AUTH_TOKEN,
    signature,
    url,
    paramsForSignature as any
  );
  if (!valid) {
    logger.warn({ phone: maskPhone(req.body?.From || '') }, 'Invalid Twilio signature');
  }
  return valid;
}

async function sendWhatsApp(to: string, body: string) {
  if (!client || !TWILIO_WHATSAPP_NUMBER) {
    logger.error('Cannot send WhatsApp message: Twilio credentials or FROM number missing');
    return false;
  }
  try {
    await client.messages.create({ from: TWILIO_WHATSAPP_NUMBER, to, body });
    return true;
  } catch (err) {
    logger.error({ err, phone: maskPhone(to) }, 'Failed to send WhatsApp message');
    return false;
  }
}

export const whatsappRouter = Router();

whatsappRouter.post('/integrations/whatsapp/twilio', async (req, res) => {
  const from = String(req.body?.From || '').trim();
  const body = String(req.body?.Body || '').trim();
  const numMedia = Number(req.body?.NumMedia || '0') || 0;
  const now = Date.now();

  if (!from) {
    res.status(400).send('missing From');
    return;
  }

  if (!validateSignature(req)) {
    res.status(403).send('invalid signature');
    return;
  }

  cleanupSessions(now);
  const existing = getActiveSession(from, now);
  const matchesStart = body.toLowerCase().startsWith(startPhraseLower);
  const isGreeting = greetingKeywords.includes(body.toLowerCase());
  const isRestart = ['restart', 'reset', 'start over', 'begin again', 'new'].includes(body.toLowerCase().trim());

  const helpText = `Reply with ${startPhraseLower.toUpperCase()} to begin.`;

  if (numMedia > 0) {
    await sendWhatsApp(from, 'Text only for now—please reply with text.');
    res.type('text/xml').send('<Response/>');
    return;
  }

  // Guard against concurrent handling for the same phone
  if (inflight.has(from)) {
    await sendWhatsApp(from, 'Working on your previous message, one moment...');
    res.type('text/xml').send('<Response/>');
    return;
  }

  inflight.add(from);
  try {
    // Handle restart command - clear session and start fresh
    if (isRestart && existing) {
      sessionByPhone.delete(from);
      // Start a new session immediately
      if (!WHATSAPP_FREEFLOW_ENABLED) {
        await sendWhatsApp(from, 'WhatsApp flow is disabled. Please try the web form.');
        res.type('text/xml').send('<Response/>');
        return;
      }
      try {
        const character = getCharacter('aadhya');
        if (!character) throw new Error('character not found');
        const newDoc = await QuestionnaireStore.create({
          service: 'residential_interiors',
          characterId: character.id,
          channel: 'whatsapp',
          userRef: from,
          status: 'collecting',
          parameters: {},
          transcript: [],
          freeflow: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        sessionByPhone.set(from, { questionnaireId: newDoc.id, lastSeen: now });
        const opening = `✨ Fresh start! I'm ${character.name}, your TatvaOps interior consultant. Tell me about your space - what are we working with today?`;
        newDoc.transcript.push({ role: 'assistant', text: opening, ts: new Date() });
        await QuestionnaireStore.save(newDoc);
        await sendWhatsApp(from, opening);
      } catch (err) {
        logger.error({ err, phone: maskPhone(from) }, 'Failed to restart session');
        await sendWhatsApp(from, 'Could not restart. Please try again.');
      }
      res.type('text/xml').send('<Response/>');
      return;
    }

    if (!existing && matchesStart) {
      if (!WHATSAPP_FREEFLOW_ENABLED) {
        await sendWhatsApp(from, 'WhatsApp flow is disabled. Please try the web form.');
        res.type('text/xml').send('<Response/>');
        return;
      }
      try {
        const character = getCharacter('aadhya');
        if (!character) throw new Error('character not found');
        const newDoc = await QuestionnaireStore.create({
          service: 'residential_interiors',
          characterId: character.id,
          channel: 'whatsapp',
          userRef: from,
          status: 'collecting',
          parameters: {},
          transcript: [],
          freeflow: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        sessionByPhone.set(from, { questionnaireId: newDoc.id, lastSeen: now });
        const opening =
          `Hello! I'm ${character.name}, your TatvaOps interior consultant. Tell me about your space - what are we working with today?`;
        newDoc.transcript.push({ role: 'assistant', text: opening, ts: new Date() });
        await QuestionnaireStore.save(newDoc);
        await sendWhatsApp(from, opening);
      } catch (err) {
        logger.error({ err, phone: maskPhone(from) }, 'Failed to start freeflow session');
        await sendWhatsApp(from, 'Service busy, try again in 30s.');
      }
      res.type('text/xml').send('<Response/>');
      return;
    }

    if (!existing && (isGreeting || !matchesStart)) {
      await sendWhatsApp(from, `${helpText}\nSend ${startPhraseLower.toUpperCase()} to start with Aadhya.`);
      res.type('text/xml').send('<Response/>');
      return;
    }

    const session = getActiveSession(from, now);
    if (!session) {
      await sendWhatsApp(from, helpText);
      res.type('text/xml').send('<Response/>');
      return;
    }

    try {
      const doc = await QuestionnaireStore.findById(session.questionnaireId);
      if (!doc) {
        sessionByPhone.delete(from);
        await sendWhatsApp(from, helpText);
        res.type('text/xml').send('<Response/>');
        return;
      }
      
      // Check if this conversation has already ended
      if (doc.status === 'completed') {
        // Store additional message from user
        doc.transcript.push({ role: 'user', text: body, ts: new Date() });
        
        const lowerBody = body.toLowerCase().trim();
        let responseMessage: string;
        
        // Check if user is confirming "ok" for the WhatsApp number
        if (lowerBody === 'ok' || lowerBody === 'okay' || lowerBody === 'yes' || lowerBody === 'confirm' || lowerBody === 'confirmed') {
          responseMessage = `Perfect! ✅ We'll call you on this WhatsApp number as discussed. Looking forward to creating your dream space! 🏠✨`;
          
          // Mark as confirmed
          if (!doc.parameters) doc.parameters = {};
          (doc.parameters as any).callback_number_confirmed = { value: from, confidence: 1.0, ts: new Date().toISOString() };
        }
        // Check if user provided an alternate phone number
        else if (/^\+?\d{10,15}$/.test(body.replace(/[\s\-\(\)]/g, ''))) {
          const altNumber = body.replace(/[\s\-\(\)]/g, '');
          responseMessage = `Got it! ✅ We'll call you on ${body} instead. Talk soon! 🙏`;
          
          // Save alternate number
          if (!doc.parameters) doc.parameters = {};
          (doc.parameters as any).alternate_callback_number = { value: altNumber, confidence: 1.0, ts: new Date().toISOString() };
        }
        // General follow-up message
        else {
          responseMessage = `Thanks for your message! 🙏\n\nYour consultation request is complete. Our team will reach out to you soon.\n\nIf you shared a different contact number above, we've noted it. Otherwise, we'll call you on this WhatsApp number.\n\nHave a great day! ✨`;
          
          // Save as additional notes
          if (!doc.parameters) doc.parameters = {};
          const existingNotes = (doc.parameters as any).additional_notes?.value || '';
          (doc.parameters as any).additional_notes = { 
            value: existingNotes ? `${existingNotes} | ${body}` : body, 
            confidence: 1.0, 
            ts: new Date().toISOString() 
          };
        }
        
        doc.transcript.push({ role: 'assistant', text: responseMessage, ts: new Date() });
        doc.updatedAt = new Date();
        await QuestionnaireStore.save(doc);
        
        await sendWhatsApp(from, responseMessage);
        res.type('text/xml').send('<Response/>');
        return;
      }
      
      const character = getCharacter('aadhya');
      if (!character) throw new Error('character not found');

      doc.transcript.push({ role: 'user', text: body, ts: new Date() });
      const extracted = await extractDatapointsFromMessage(body, doc, character);
      applyExtracted(doc, extracted);

      // Pass the user message for mood detection
      const { reply, isComplete, mood } = await generateAssistantReply(doc, character, { lastUserMessage: body });
      doc.transcript.push({ role: 'assistant', text: reply, ts: new Date() });
      
      // Log mood for debugging
      if (mood && mood !== 'neutral') {
        logger.debug({ phone: maskPhone(from), mood }, 'User mood detected');
      }
      
      // Mark session as completed if all required data collected
      if (isComplete) {
        doc.status = 'completed';
        logger.info({ phone: maskPhone(from), questionnaireId: doc.id }, 'Questionnaire completed');
        
        // Auto-generate 6-point summary on completion
        try {
          const sixPointSummary = await generateSixPointSummary(doc);
          doc.sixPointSummary = sixPointSummary;
          logger.info({ phone: maskPhone(from), questionnaireId: doc.id }, 'Auto-generated 6-point summary');
        } catch (summaryError) {
          logger.error({ err: summaryError, phone: maskPhone(from) }, 'Failed to auto-generate summary');
        }
        
        // Send the closing reply (which already asks about phone confirmation)
        await sendWhatsApp(from, reply);
      } else {
        await sendWhatsApp(from, reply || 'Thanks, one more detail?');
      }
      
      doc.updatedAt = new Date();
      await QuestionnaireStore.save(doc);

      session.lastSeen = Date.now();
      sessionByPhone.set(from, session);
    } catch (err) {
      logger.error({ err, phone: maskPhone(from) }, 'Failed to continue questionnaire via WhatsApp');
      await sendWhatsApp(from, 'Something went wrong, please try again later.');
    }

    res.type('text/xml').send('<Response/>');
  } finally {
    inflight.delete(from);
  }
});


