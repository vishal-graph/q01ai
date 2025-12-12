import { generateAssistantReply, extractDatapointsFromMessage } from '../src/engine/conversation';
import { getCharacter } from '../src/engine/characterRegistry';
import { QuestionnaireDoc } from '../src/models/Questionnaire';

const mockLLM = (response: string) => async () => response;

describe('conversation engine', () => {
  const character = getCharacter('aadhya')!;
  const baseSession: QuestionnaireDoc = {
    id: 's1',
    service: 'residential_interiors',
    characterId: 'aadhya',
    channel: 'whatsapp',
    status: 'collecting',
    parameters: {},
    transcript: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('extracts datapoints with confidence', async () => {
    const message = 'It is a 3BHK apartment around 1200 sqft, budget near 15 lakhs, need it in 2 months.';
    const resp = await extractDatapointsFromMessage(message, baseSession, character, {
      llm: mockLLM(
        JSON.stringify({
          project_type: { value: '3BHK apartment', confidence: 0.9 },
          size_sqft: { value: '1200 sqft', confidence: 0.82 },
          budget: { value: '15 lakhs', confidence: 0.9 },
          timeline: { value: '2 months', confidence: 0.8 },
        })
      ),
    });
    expect(resp.project_type?.confidence).toBeGreaterThan(0.5);
    expect(resp.budget?.value).toContain('15');
  });

  it('generates assistant reply', async () => {
    const session = {
      ...baseSession,
      transcript: [{ role: 'user', text: 'Hi, I need interiors for my apartment', ts: new Date() }],
    };
    const result = await generateAssistantReply(session, character, { llm: mockLLM('Hi! Let me note your project type and budget.') });
    expect(result.reply.length).toBeGreaterThan(5);
  });
});

