// In-memory model for plug-and-play mode
export type Message = { role: 'user' | 'assistant'; text: string; ts: Date };

export type UserMood = 'positive' | 'neutral' | 'confused' | 'frustrated' | 'rushed' | 'uncertain';

export type MoodTracking = {
  currentMood: UserMood;
  moodHistory: { mood: UserMood; turnIndex: number; timestamp: Date }[];
  dominantMood: UserMood;
  frustrationCount: number;
  positiveCount: number;
  averageSentiment: number; // -1 to 1 scale
};

export type ProjectSummary = {
  projectOverview: string;
  scopeOfWork: string;
  clientRequirements: string;
  technicalSpecs: string;
  timeline: string;
  specialConsiderations: string;
  estimatedScope: string;
  generatedAt?: Date;
};

export type SixPointSummary = {
  // 1. Client Overview
  clientProfile: string;
  // 2. Project Scope
  projectScope: string;
  // 3. Key Requirements
  keyRequirements: string;
  // 4. Budget & Timeline
  budgetTimeline: string;
  // 5. Conversation Insights
  conversationInsights: string;
  // 6. Next Steps
  nextSteps: string;
  // Meta
  generatedAt: Date;
  moodSummary: string;
};

export type QuestionnaireDoc = {
  id: string;
  service: string;
  characterId: string;
  channel?: string;
  userRef?: string;
  status: 'new' | 'collecting' | 'completed';
  parameters: Record<string, any>;
  transcript: Message[];
  createdAt: Date;
  updatedAt: Date;
  freeflow?: boolean;
  projectSummary?: ProjectSummary;
  // New mood tracking fields
  moodTracking?: MoodTracking;
  sixPointSummary?: SixPointSummary;
  conversationMeta?: {
    mood: UserMood;
    moodHistory: UserMood[];
    ambiguousFields: string[];
    clarificationCount: number;
    turnCount: number;
  };
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
  async listAll() {
    return Array.from(store.values());
  },
  async findByService(service: string) {
    return Array.from(store.values()).filter(doc => doc.service === service);
  },
  async findByChannel(channel: string) {
    return Array.from(store.values()).filter(doc => doc.channel === channel);
  },
  getSummary(doc: QuestionnaireDoc) {
    const collectedParams = Object.keys(doc.parameters || {}).length;
    const totalMessages = doc.transcript?.length || 0;
    const userMessages = doc.transcript?.filter(m => m.role === 'user').length || 0;
    const lastActivity = doc.updatedAt || doc.createdAt;
    const maskedPhone = doc.userRef
      ? `${doc.userRef.slice(0, 8)}***${doc.userRef.slice(-2)}`
      : 'Unknown';

    // Calculate mood summary
    const moodSummary = calculateMoodSummary(doc);

    return {
      id: doc.id,
      userRef: maskedPhone,
      service: doc.service,
      channel: doc.channel || 'web',
      status: doc.status,
      collectedParams,
      totalMessages,
      userMessages,
      parameters: doc.parameters,
      createdAt: doc.createdAt,
      lastActivity,
      projectSummary: doc.projectSummary,
      // New mood tracking fields
      moodTracking: moodSummary,
      sixPointSummary: doc.sixPointSummary,
    };
  },
};

// Helper function to calculate mood summary from conversation meta
function calculateMoodSummary(doc: QuestionnaireDoc): MoodTracking | null {
  const meta = doc.conversationMeta;
  if (!meta || !meta.moodHistory || meta.moodHistory.length === 0) {
    return null;
  }

  const moodHistory = meta.moodHistory;
  
  // Count mood occurrences
  const moodCounts: Record<UserMood, number> = {
    positive: 0,
    neutral: 0,
    confused: 0,
    frustrated: 0,
    rushed: 0,
    uncertain: 0
  };
  
  moodHistory.forEach((mood) => {
    moodCounts[mood]++;
  });

  // Find dominant mood
  let dominantMood: UserMood = 'neutral';
  let maxCount = 0;
  (Object.entries(moodCounts) as [UserMood, number][]).forEach(([mood, count]) => {
    if (count > maxCount) {
      maxCount = count;
      dominantMood = mood;
    }
  });

  // Calculate sentiment score (-1 to 1)
  const sentimentWeights: Record<UserMood, number> = {
    positive: 1,
    neutral: 0,
    uncertain: -0.2,
    confused: -0.4,
    rushed: -0.3,
    frustrated: -0.8
  };
  
  const totalSentiment = moodHistory.reduce((sum, mood) => sum + sentimentWeights[mood], 0);
  const averageSentiment = moodHistory.length > 0 ? totalSentiment / moodHistory.length : 0;

  return {
    currentMood: meta.mood,
    moodHistory: moodHistory.map((mood, index) => ({
      mood,
      turnIndex: index,
      timestamp: new Date() // Approximate
    })),
    dominantMood,
    frustrationCount: moodCounts.frustrated,
    positiveCount: moodCounts.positive,
    averageSentiment: Math.round(averageSentiment * 100) / 100
  };
};


