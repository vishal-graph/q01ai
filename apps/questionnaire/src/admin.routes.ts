import { Router } from 'express';
import { loadCharacters, forceReloadCharacters } from '@tatvaops/core';
import { QuestionnaireStore } from './models/Questionnaire';
import { generateProjectSummary, generateSixPointSummary } from './summary-generator';

const router = Router();

// Admin endpoint to list all characters
router.get('/characters', (_req, res) => {
  const characters = loadCharacters();
  res.json(characters.characters); // Return only the characters array
});

// Admin endpoint to force reload characters from disk
router.post('/characters/reload', (_req, res) => {
  const reloadedCharacters = forceReloadCharacters();
  res.json({ status: 'reloaded', count: reloadedCharacters.characters.length });
});

// List all sessions with summaries
router.get('/sessions', async (_req, res) => {
  const allDocs = await QuestionnaireStore.listAll();
  const summaries = allDocs.map(doc => QuestionnaireStore.getSummary(doc));

  // Sort by last activity (most recent first)
  summaries.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

  res.json({
    total: summaries.length,
    sessions: summaries,
  });
});

// Get full session details including transcript
router.get('/sessions/:id', async (req, res) => {
  const doc = await QuestionnaireStore.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json({
    ...QuestionnaireStore.getSummary(doc),
    transcript: doc.transcript,
  });
});

// Filter sessions by channel (whatsapp, web)
router.get('/sessions/channel/:channel', async (req, res) => {
  const docs = await QuestionnaireStore.findByChannel(req.params.channel);
  const summaries = docs.map(doc => QuestionnaireStore.getSummary(doc));

  summaries.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

  res.json({
    channel: req.params.channel,
    total: summaries.length,
    sessions: summaries,
  });
});

// Get stats overview
router.get('/stats', async (_req, res) => {
  const allDocs = await QuestionnaireStore.listAll();

  const stats = {
    total: allDocs.length,
    byStatus: {
      new: allDocs.filter(d => d.status === 'new').length,
      collecting: allDocs.filter(d => d.status === 'collecting').length,
      completed: allDocs.filter(d => d.status === 'completed').length,
    },
    byChannel: {
      whatsapp: allDocs.filter(d => d.channel === 'whatsapp').length,
      web: allDocs.filter(d => d.channel === 'web' || !d.channel).length,
    },
    byService: {} as Record<string, number>,
  };

  // Count by service
  allDocs.forEach(doc => {
    const service = doc.service || 'unknown';
    stats.byService[service] = (stats.byService[service] || 0) + 1;
  });

  res.json(stats);
});

// Generate project summary for a session
router.post('/sessions/:id/generate-summary', async (req, res) => {
  const doc = await QuestionnaireStore.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  // Extract parameter values (flatten the nested structure)
  const flatParams: Record<string, string> = {};
  Object.entries(doc.parameters || {}).forEach(([key, val]) => {
    if (typeof val === 'object' && val !== null && 'value' in val) {
      flatParams[key] = String(val.value);
    } else {
      flatParams[key] = String(val);
    }
  });

  try {
    const summary = await generateProjectSummary(doc.service, flatParams);
    doc.projectSummary = {
      ...summary,
      generatedAt: new Date(),
    };
    await QuestionnaireStore.save(doc);

    res.json({
      status: 'success',
      summary: doc.projectSummary,
    });
  } catch (err) {
    console.error('Failed to generate summary:', err);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Get project summary for a session
router.get('/sessions/:id/summary', async (req, res) => {
  const doc = await QuestionnaireStore.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  if (!doc.projectSummary) {
    res.status(404).json({ error: 'No summary generated yet. Call POST /admin/sessions/:id/generate-summary first.' });
    return;
  }

  res.json(doc.projectSummary);
});

// ============================================================================
// MOOD TRACKING ENDPOINTS
// ============================================================================

// Get mood tracking data for a session
router.get('/sessions/:id/mood', async (req, res) => {
  const doc = await QuestionnaireStore.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const summary = QuestionnaireStore.getSummary(doc);
  
  res.json({
    sessionId: doc.id,
    status: doc.status,
    moodTracking: summary.moodTracking,
    conversationMeta: doc.conversationMeta,
  });
});

// Get mood analytics across all sessions
router.get('/analytics/mood', async (_req, res) => {
  const allDocs = await QuestionnaireStore.listAll();
  
  const moodStats = {
    totalSessions: allDocs.length,
    sessionsWithMoodData: 0,
    moodDistribution: {
      positive: 0,
      neutral: 0,
      confused: 0,
      frustrated: 0,
      rushed: 0,
      uncertain: 0,
    } as Record<string, number>,
    averageSentiment: 0,
    frustrationRate: 0,
    sessionsWithFrustration: 0,
  };

  let totalSentiment = 0;
  let sentimentCount = 0;

  allDocs.forEach(doc => {
    const meta = doc.conversationMeta;
    if (meta && meta.moodHistory && meta.moodHistory.length > 0) {
      moodStats.sessionsWithMoodData++;
      
      // Count moods
      meta.moodHistory.forEach(mood => {
        moodStats.moodDistribution[mood] = (moodStats.moodDistribution[mood] || 0) + 1;
      });
      
      // Track frustration
      if (meta.moodHistory.includes('frustrated')) {
        moodStats.sessionsWithFrustration++;
      }
      
      // Calculate sentiment
      const summary = QuestionnaireStore.getSummary(doc);
      if (summary.moodTracking?.averageSentiment !== undefined) {
        totalSentiment += summary.moodTracking.averageSentiment;
        sentimentCount++;
      }
    }
  });

  if (sentimentCount > 0) {
    moodStats.averageSentiment = Math.round((totalSentiment / sentimentCount) * 100) / 100;
  }
  
  if (moodStats.sessionsWithMoodData > 0) {
    moodStats.frustrationRate = Math.round((moodStats.sessionsWithFrustration / moodStats.sessionsWithMoodData) * 100);
  }

  res.json(moodStats);
});

// ============================================================================
// 6-POINT SUMMARY ENDPOINTS
// ============================================================================

// Get 6-point summary for a session
router.get('/sessions/:id/six-point-summary', async (req, res) => {
  const doc = await QuestionnaireStore.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  if (!doc.sixPointSummary) {
    // If session is completed but no summary, generate it
    if (doc.status === 'completed') {
      try {
        const summary = await generateSixPointSummary(doc);
        doc.sixPointSummary = summary;
        await QuestionnaireStore.save(doc);
        res.json(doc.sixPointSummary);
        return;
      } catch (err) {
        console.error('Failed to generate 6-point summary:', err);
        res.status(500).json({ error: 'Failed to generate summary' });
        return;
      }
    }
    
    res.status(404).json({ 
      error: 'No 6-point summary available yet.',
      hint: 'Summary is auto-generated when conversation completes, or call POST /admin/sessions/:id/generate-six-point-summary'
    });
    return;
  }

  res.json(doc.sixPointSummary);
});

// Manually generate/regenerate 6-point summary
router.post('/sessions/:id/generate-six-point-summary', async (req, res) => {
  const doc = await QuestionnaireStore.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  try {
    const summary = await generateSixPointSummary(doc);
    doc.sixPointSummary = summary;
    await QuestionnaireStore.save(doc);

    res.json({
      status: 'success',
      sixPointSummary: summary,
    });
  } catch (err) {
    console.error('Failed to generate 6-point summary:', err);
    res.status(500).json({ error: 'Failed to generate 6-point summary' });
  }
});

// Get full session details including all summaries and mood data
router.get('/sessions/:id/full', async (req, res) => {
  const doc = await QuestionnaireStore.findById(req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const summary = QuestionnaireStore.getSummary(doc);

  res.json({
    ...summary,
    transcript: doc.transcript,
    conversationMeta: doc.conversationMeta,
    projectSummary: doc.projectSummary,
    sixPointSummary: doc.sixPointSummary,
  });
});

export { router };


