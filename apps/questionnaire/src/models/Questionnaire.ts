// In-memory model for plug-and-play mode
export type Message = { role: 'user' | 'assistant'; text: string; ts: Date };
export type QuestionnaireDoc = {
  id: string;
  service: string;
  characterId: string;
  channel?: string;
  userRef?: string;
  status: 'new' | 'collecting' | 'completed';
  parameters: Record<string, unknown>;
  transcript: Message[];
  createdAt: Date;
  updatedAt: Date;
};

const store = new Map<string, QuestionnaireDoc>();

export const QuestionnaireStore = {
  async create(doc: Omit<QuestionnaireDoc, 'id'>) {
    const id = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const full: QuestionnaireDoc = { id, ...doc } as QuestionnaireDoc;
    store.set(id, full);
    return full;
  },
  async findById(id: string) {
    return store.get(id) || null;
  },
  async save(doc: QuestionnaireDoc) {
    store.set(doc.id, doc);
    return doc;
  },
};


