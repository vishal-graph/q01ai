import { Router } from 'express';
import { QuestionnaireStore } from './models/Questionnaire';
import { pickCharacter } from '../../../packages/core/src/index';
import { geminiAPIClient } from '../../../packages/ai/src/index';
import { getNextParamId, getParamMeta, extractParamValue } from './engine';
import { config } from './config';
import { postCompletion } from './webhook';
import { router as adminRouter } from './admin.routes';

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
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const openingStatement = character.language?.openingPhrases?.[0] || 'Hello!';
  // No question asked initially; user's first message will trigger it
  res.status(201).json({ id: newDoc.id, service, character: character.name, nextQuestion: openingStatement });
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

  // If this is the very first user message (e.g., trigger), do NOT capture any parameter yet.
  const userTurnsCount = doc.transcript.filter(m => m.role === 'user').length;
  const isFirstUserTurn = userTurnsCount === 1 && Object.keys(doc.parameters || {}).length === 0;

  // If not the first turn, extract and save the answer to the parameter we just asked about
  if (!isFirstUserTurn) {
    // Find which parameter was asked in the previous assistant message
    const lastAskedParam = getNextParamId(doc.service, doc.parameters);
    
    if (lastAskedParam) {
      const val = extractParamValue(doc.service, lastAskedParam, text);
      console.log(`[debug] Extracting ${lastAskedParam} from "${text}": ${val}`);
      
      if (val !== undefined && val !== null && val !== '') {
        (doc.parameters as any)[lastAskedParam] = val;
        console.log(`[debug] Saved ${lastAskedParam} = ${val}`);
      } else {
        console.warn(`[debug] Failed to extract value for ${lastAskedParam} from user input: "${text}"`);
      }
    }
  }

  // Now determine the next unanswered parameter
  const nextId = getNextParamId(doc.service, doc.parameters);
  console.log(`[debug] Parameters so far:`, JSON.stringify(doc.parameters));
  console.log(`[debug] Next missing param: ${nextId}`);
  let assistantResponse: string;

  if (!nextId) {
    // Completed
    doc.status = 'completed';
    assistantResponse = 'Thank you! All details captured.';
    doc.transcript.push({ role: 'assistant', text: assistantResponse, ts: new Date() });
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
    return res.json({ id: doc.id, status: 'completed', parameters: doc.parameters });
  }

  const character = pickCharacter(doc.service as any);
  const paramMeta = getParamMeta(doc.service, nextId)!;
  
  // Generate empathetic affirmation and question using Gemini
  const recentContext = doc.transcript.slice(-4).map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
  const systemPrompt = `You are ${character.name}, a ${character.service} consultant. Persona: ${character.persona}. Tone: ${character.tone}.

CONTEXT (recent turns):\n${recentContext}\n\nTASK:
1) Start with ONE warm, human, emotionally-aware affirmation (3–8 words) tailored to the user's last input.
   - Explicitly reference their selection/value if it matches an option: ${paramMeta.options ? paramMeta.options.join(' | ') : '(no options)'}.
   - Convey benefit or understanding (e.g., comfort, clarity, aesthetics, budget fit, timeline confidence).
   - Avoid generic phrases like "Excellent choice", "Noted", "Got it", "Let's proceed" by themselves.
   - Vary language each turn; do not repeat prior affirmations.
   - Examples: "Lovely range for cozy layouts.", "Great, 2BHK—balanced and practical.", "Nice pick—elegant and timeless.", "Perfect for efficient planning.", "Great fit for that style." 
2) Then ask ONE concise next question about "${paramMeta.label}" (≤ 14 words).
   - Use the expected format: ${paramMeta.expectedFormat || '(no specific format)'}.
   - If there are options, include exactly: ${paramMeta.options ? `(Options: ${paramMeta.options.join(' | ')})` : '(no options)'}.
3) No greetings. No extra sentences. Keep it natural and warm.`;

  const response = await geminiAPIClient.generateText({
    model: character.routing?.ai?.model || 'gemini-2.5-flash',
    system: systemPrompt,
    user: doc.transcript.map(m => m.text).join('\n'), // Provide full transcript for context
    temperature: 0.35,
  });

  assistantResponse = String(response.data);

  // If this is the first assistant response of the conversation, prefix an introduction phrase
  const assistantTurnsCount = doc.transcript.filter(m => m.role === 'assistant').length;
  const isFirstAssistantResponse = assistantTurnsCount === 0 && Object.keys(doc.parameters || {}).length === 0;
  if (isFirstAssistantResponse) {
    const rawName = character.name || 'Consultant';
    const namePart = rawName.split(' - ')[0]?.trim() || rawName;
    const firstName = (namePart.split(/\s+/)[0] || namePart).replace(/[^A-Za-z]/g, '') || 'Consultant';
    const rolePart = rawName.includes(' - ') ? rawName.split(' - ')[1]?.trim() : '';
    const serviceTitle = String(character.service || 'consultant').replace(/_/g, ' ');
    const role = rolePart || `${serviceTitle} consultant`;
    const intro = `Hello! I'm ${firstName}, your ${role}.`;
    assistantResponse = `${intro}\n\n${assistantResponse}`;
  }

  doc.transcript.push({ role: 'assistant', text: assistantResponse, ts: new Date() });
  await QuestionnaireStore.save(doc);

  const responseData = {
    id: doc.id,
    askedParam: nextId,
    nextQuestion: assistantResponse,
    expectedFormat: '',
    parameterLabel: paramMeta?.label || '',
    options: (paramMeta as any)?.options || [],
    mediaUpload: true,
    mediaTypes: ['png', 'jpeg', 'jpg', 'pdf'],
    allowMultiple: Boolean((paramMeta as any)?.allowMultiple)
  };

  res.json(responseData);
  return;
});