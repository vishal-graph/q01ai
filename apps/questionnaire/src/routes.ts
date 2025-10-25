import { Router } from 'express';
import { QuestionnaireStore, Message } from './models/Questionnaire'; // Removed QuestionnaireDoc import
import { pickCharacter } from '@tatvaops/core';
// import { composeEnquiryPrompt } from '@tatvaops/ai'; // Temporarily disabled due to module issues // Use composeEnquiryPrompt
import { geminiAPIClient } from '@tatvaops/ai';
import { serviceParameters } from './parameters';
import { getNextParamId, getParamMeta, extractParamValue, sanitizeAssistant, applyGuardrails, applyEQIfAny } from './engine';
import { config } from './config';
import { postCompletion } from './webhook';
import { router as adminRouter } from './admin.routes';

// Simple prompt composer to bypass module issues
function composeEnquiryPrompt(character: any, _context?: string): string {
  const parameters = character.prompts?.enquiry?.parameters || [];
  const collectionFlow = character.prompts?.enquiry?.collectionFlow || 
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
    `[GUARDRAILS] Always maintain professional standards, provide ranges not exact prices, never guarantee approvals, respect privacy, promote safety, remain vendor-neutral.`,
    `[COLLECTION FLOW] ${collectionFlow}`,
    parameterGuidance,
    `[STYLE CONSTRAINTS] Keep questions simple and conversational. Ask one question at a time. ALWAYS affirm and empathize with user responses. Accept ANY answer without validation. Don't use role prefixes. Don't re-introduce yourself mid-conversation.`,
    `[EMPATHY REQUIREMENTS] After each user response, show empathy and affirmation before asking the next question. Use phrases like "Perfect!", "That's helpful!", "Great choice!", "I understand", "That makes sense", "Excellent!", "Wonderful!", "That's exactly what I needed to know".`,
    `[RESPONSE FORMAT] Respond naturally as the character. Be warm, professional, and helpful. Always validate the user's input with empathy before moving to the next question.`
  ];
  
  return sections.join("\n\n");
}

function buildParameterGuidanceSection(parameters: any[]): string {
  let guidance = "[PARAMETER COLLECTION]\n";
  guidance += "You need to collect these parameters through conversation. ACCEPT ANY ANSWER - no validation required:\n\n";
  
  parameters.forEach((param, index) => {
    guidance += `${index + 1}. ${param.label} (${param.id})\n`;
    guidance += `   Purpose: ${param.purpose}\n`;
    guidance += `   Question Intent: ${param.questionIntent}\n`;
    guidance += `   AI Guidance: ${param.aiGuidance}\n`;
    guidance += `   Example Questions: ${param.exampleQuestions?.join(" | ") || "Ask naturally"}\n`;
    guidance += `   Response Type: ${param.responseType}\n`;
    guidance += `   IMPORTANT: Accept whatever the user says. Show empathy and affirmation. Move to next question.\n`;
    if (param.emotionCues) {
      const cues = Object.entries(param.emotionCues).map(([emotion, tone]) => `${emotion}→${tone}`);
      guidance += `   Emotion Handling: ${cues.join(", ")}\n`;
    }
    guidance += `   Usage: ${param.usageInProcess}\n\n`;
  });
  
  return guidance;
}

function buildEQModulationHints(eq: any): string {
  if (!eq || !eq.modulation) return "No specific EQ modulation needed.";
  
  const modulations = Object.entries(eq.modulation);
  if (modulations.length === 0) return "No specific EQ modulation needed.";
  
  const hints = modulations.map(([signal, tone]) => `${signal}→${tone}`).join(", ");
  return `When user shows these signals, modulate tone: ${hints}`;
}

export const router = Router();

// Health
router.get('/', (_req, res) => { res.json({ name: 'questionnaire', version: '1.0.0' }); return; });
router.use('/admin', adminRouter);

// Start questionnaire
router.post('/questionnaires', async (req, res) => {
  const { service, channel, userRef } = req.body || {};
  if (!service) return res.status(422).json({ error: 'service is required' });

  const character = pickCharacter(service);

  const newDoc = await QuestionnaireStore.create({
    service,
    characterId: character.id,
    channel,
    userRef,
    status: 'collecting',
    parameters: {},
    transcript: [],
    createdAt: new Date(), // Set createdAt
    updatedAt: new Date(), // Set updatedAt
  });

  const first = serviceParameters[service]?.[0]?.label || 'first detail';
  const nextQuestion = `Let's begin. ${character.language?.openingPhrases?.[0] || 'Hello!'} What is the ${first}?`;

  res.status(201).json({ id: newDoc.id, service, character: character.name, nextQuestion });
  return;
});

// Continue questionnaire
router.post('/questionnaires/:id/messages', async (req, res) => {
  const doc = await QuestionnaireStore.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'not found' });
  const { text } = req.body || {};
  if (!text) return res.status(422).json({ error: 'text is required' });

  // Append user turn
  doc.transcript.push({ role: 'user', text, ts: new Date() });
  doc.updatedAt = new Date();

  const character = pickCharacter(doc.service as any);

  // Store value for current parameter if detectable
  const currentParamId = getNextParamId(doc.service, doc.parameters) || undefined;
  if (currentParamId) {
    const val = extractParamValue(doc.service, currentParamId, text);
    if (val !== undefined) {
      (doc.parameters as any)[currentParamId] = val;
    }
  }

  // Decide next param
  const nextId = getNextParamId(doc.service, doc.parameters);
  let assistant: string;
  if (!nextId) {
    // Completed
    doc.status = 'completed';
        assistant = 'Thank you for providing all the details! Our consultant will get back to you shortly. Thanks for your time!';
    doc.transcript.push({ role: 'assistant', text: assistant, ts: new Date() });
    await QuestionnaireStore.save(doc);

    // Optional webhook
    if (config.QUESTIONNAIRE_WEBHOOK_URL) {
      void postCompletion(config.QUESTIONNAIRE_WEBHOOK_URL, {
        questionnaireId: doc.id,
        service: doc.service,
        parameters: doc.parameters,
        characterId: doc.characterId,
        userRef: doc.userRef,
        channel: doc.channel,
        completedAt: new Date().toISOString(),
      });
    }
    return res.json({ id: doc.id, status: 'completed', parameters: doc.parameters });
  }

  const paramMeta = getParamMeta(doc.service, nextId);
  
  const system = composeEnquiryPrompt(character, ""); // Pass character directly
  const history = doc.transcript.slice(-10).map((m: Message) => m.text).join('\n\n'); // Explicitly type 'm'
  const response = await geminiAPIClient.generateText({
    model: character.routing?.ai?.model || 'gemini-2.0-flash-exp',
    system,
    user: history + `\n\n[NEXT PARAMETER]\n${paramMeta?.label}. Ask only about this. IMPORTANT: Accept the user's last response with empathy and affirmation, then ask about the next parameter.`,
    temperature: character.routing?.ai?.temperature || 0.6,
  });

  assistant = sanitizeAssistant(String(response.data));
  assistant = applyGuardrails(assistant);
  assistant = applyEQIfAny(character, text, assistant);

  doc.transcript.push({ role: 'assistant', text: assistant, ts: new Date() });
  await QuestionnaireStore.save(doc);

      const responseData = {
        id: doc.id,
        askedParam: nextId,
        nextQuestion: assistant,
        expectedFormat: paramMeta?.expectedFormat || '',
        parameterLabel: paramMeta?.label || '',
        mediaUpload: true, // All questions support media upload
        mediaTypes: ['png', 'jpeg', 'jpg', 'pdf']
      };
  
  res.json(responseData);
  return;
});

// Get questionnaire
router.get('/questionnaires/:id', async (req, res) => {
  const doc = await QuestionnaireStore.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'not found' });
  res.json(doc);
  return;
});

// Complete questionnaire (force)
router.post('/questionnaires/:id/complete', async (req, res) => {
  const doc = await QuestionnaireStore.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'not found' });
  // Ensure all 9 collected
  const total = (serviceParameters[doc.service] || []).length;
  const collected = Object.keys((doc.parameters as any) || {}).length;
  if (collected < total) return res.status(409).json({ error: 'incomplete', collected, total });
  doc.status = 'completed';
  await QuestionnaireStore.save(doc);

  if (config.QUESTIONNAIRE_WEBHOOK_URL) {
    void postCompletion(config.QUESTIONNAIRE_WEBHOOK_URL, {
      questionnaireId: doc.id,
      service: doc.service,
      parameters: doc.parameters,
      characterId: doc.characterId,
      userRef: doc.userRef,
      channel: doc.channel,
      completedAt: new Date().toISOString(),
    });
  }
  res.json({ id: doc.id, status: 'completed', parameters: doc.parameters });
  return;
});


